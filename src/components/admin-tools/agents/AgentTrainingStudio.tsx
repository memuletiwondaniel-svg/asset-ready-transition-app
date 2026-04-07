import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, MessageSquare, History, Paperclip, Mic, Send, MicOff, FileText, RotateCcw, GraduationCap, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

interface TrainingMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: { name: string; type: string };
}

interface AgentTrainingStudioProps {
  agent: AgentProfile;
}

const AgentTrainingStudio: React.FC<AgentTrainingStudioProps> = ({ agent }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['agent-training-sessions', agent.code],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('agent_training_sessions')
        .select('*')
        .eq('agent_code', agent.code)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewSession = useCallback(async (docName?: string, docDescription?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('agent_training_sessions')
      .insert({
        agent_code: agent.code,
        user_id: user.id,
        document_name: docName || null,
        document_description: docDescription || null,
        status: 'active',
        transcript: [],
      })
      .select('id')
      .single();
    if (error) throw error;
    setSessionId(data.id);
    return data.id;
  }, [agent.code]);

  const sendMessage = async () => {
    if (!input.trim() && !attachedFile) return;

    let fileData: string | null = null;
    let fileName: string | null = null;

    if (attachedFile) {
      const reader = new FileReader();
      fileData = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(attachedFile);
      });
      fileName = attachedFile.name;
    }

    const userMessage: TrainingMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      ...(fileName ? { attachment: { name: fileName, type: attachedFile!.type } } : {}),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachedFile(null);
    setIsStreaming(true);

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await startNewSession(fileName || undefined);
    }

    try {
      const messagesForApi = newMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await supabase.functions.invoke('agent-training-chat', {
        body: {
          agent_code: agent.code,
          messages: messagesForApi,
          file_data: fileData,
          file_name: fileName,
          session_id: currentSessionId,
        },
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.content || response.data?.text || 'I received your input but could not generate a response. Please try again.';

      const assistantMessage: TrainingMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save transcript
      if (currentSessionId) {
        const transcript = [...newMessages, assistantMessage].map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        }));
        await supabase
          .from('agent_training_sessions')
          .update({ transcript })
          .eq('id', currentSessionId);
      }
    } catch (err) {
      console.error('Training chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error processing your request. Please try again.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;
    await supabase
      .from('agent_training_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId);
    setSessionId(null);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ['agent-training-sessions', agent.code] });
  };

  const handleFileAttach = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 10 * 1024 * 1024) {
      setAttachedFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const { data, error } = await supabase.functions.invoke('whisper-stt', {
            body: formData,
          });
          if (!error && data?.text) {
            setInput(prev => (prev ? prev + ' ' : '') + data.text);
          }
        } catch (err) {
          console.error('Whisper STT error:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  };

  const reopenSession = (session: any) => {
    setSessionId(session.id);
    const transcript = (session.transcript || []) as any[];
    setMessages(transcript.map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    })));
    setActiveTab('chat');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="border-border/40 shadow-sm h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <CardHeader className="pb-0 pt-4 px-5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              </div>
              Knowledge & Training
            </CardTitle>
            {sessionId && (
              <Button size="sm" variant="outline" onClick={completeSession} className="text-xs gap-1.5 h-7">
                <CheckCircle2 className="h-3 w-3" />
                Complete Session
              </Button>
            )}
          </div>
          <TabsList className="w-full justify-start bg-muted/50 p-1">
            <TabsTrigger value="chat" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Training Chat
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" />
              Training History
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          <TabsContent value="chat" className="mt-0 flex-1 flex flex-col overflow-hidden m-0">
            {/* Training channel label */}
            <div className="px-5 py-2 border-b border-border/30">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Training Channel — {agent.name}
              </span>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[300px]">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border/30 shadow-md mb-4">
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Train {agent.name}</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Upload a document, describe it, or record a voice note. {agent.name} will analyze it and ask clarifying questions to deepen understanding.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-border/30 shrink-0 mt-1">
                      <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted/60 text-foreground rounded-bl-md border border-border/30'
                  )}>
                    {msg.attachment && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs opacity-80">
                        <FileText className="h-3 w-3" />
                        {msg.attachment.name}
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p className={cn(
                      'text-[9px] mt-1.5',
                      msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                    )}>
                      {format(msg.timestamp, 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-border/30 shrink-0 mt-1">
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-border/30 px-4 py-3 bg-card/50">
              {attachedFile && (
                <div className="flex items-center gap-2 mb-2 px-2">
                  <Badge variant="secondary" className="text-[10px] gap-1 py-0.5">
                    <FileText className="h-3 w-3" />
                    {attachedFile.name}
                    <button onClick={() => setAttachedFile(null)} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFileAttach}
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRecording}
                  className={cn(
                    'h-9 w-9 shrink-0',
                    isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Explain a document to ${agent.name}...`}
                  className="min-h-[40px] max-h-[120px] resize-none text-sm border-border/40"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={isStreaming || (!input.trim() && !attachedFile)}
                  className="h-9 w-9 shrink-0"
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0 flex-1 overflow-y-auto m-0 px-5 py-4">
            {sessionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No training sessions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Upload a document to begin training {agent.name}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session: any) => (
                  <div key={session.id} className="group border border-border/40 rounded-xl p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {session.document_name || 'Training session'}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(session.created_at), 'MMM d, yyyy · HH:mm')}
                          </p>
                          {session.key_learnings && (
                            <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2">
                              {session.key_learnings}
                            </p>
                          )}
                          {session.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {session.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[9px] py-0 px-1.5">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={session.status === 'completed' ? 'secondary' : 'outline'} className="text-[9px] capitalize">
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => reopenSession(session)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retrain
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => {
                          reopenSession(session);
                          setInput(`Test my understanding of ${session.document_name || 'the previously trained material'}. Ask me challenging questions.`);
                        }}
                      >
                        <GraduationCap className="h-3 w-3" />
                        Test Understanding
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default AgentTrainingStudio;
