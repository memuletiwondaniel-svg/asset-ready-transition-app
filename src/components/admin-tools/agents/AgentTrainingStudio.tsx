import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, History, Paperclip, Mic, Send, MicOff, FileText, CheckCircle2, Loader2, Upload, Lock, AlertTriangle, FlaskConical, X, Link2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { type AnonymizationRule } from './training/AnonymizationRulesInline';
import TrainingHistoryPanel from './training/TrainingHistoryPanel';
import AgentTrainingDialog from './AgentTrainingDialog';

interface TrainingMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: { name: string; type: string };
}

interface TrainingMetadata {
  completion_suggested: boolean;
  open_questions_count: number;
  contradiction_detected: boolean;
  session_updated: boolean;
}

interface AgentTrainingStudioProps {
  agent: AgentProfile;
}

type ChatSubState = 'setup' | 'active' | 'testing';

const ACCEPTED_MIME = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp';
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Custom h2 renderer for training message section styling
const trainingH2Renderer = ({ children, ...props }: any) => {
  const text = String(children).toLowerCase();
  let section = 'default';
  if (text.includes('understood')) section = 'understood';
  else if (text.includes('core facts')) section = 'facts';
  else if (text.includes('procedures')) section = 'procedures';
  else if (text.includes('terminology')) section = 'terminology';
  else if (text.includes('decision rules')) section = 'rules';
  else if (text.includes('confidence')) section = 'confidence';
  else if (text.includes('clarifying questions')) section = 'questions';
  return <h2 data-section={section} {...props}>{children}</h2>;
};

const AgentTrainingStudio: React.FC<AgentTrainingStudioProps> = ({ agent }) => {
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const canTrain = !permLoading && hasPermission('access_admin');

  const [activeTab, setActiveTab] = useState('chat');
  const [subState, setSubState] = useState<ChatSubState>('setup');
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileStoragePath, setFileStoragePath] = useState<string | null>(null);

  // Setup form state (hidden from UI, kept for API compatibility)
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docDomain, setDocDomain] = useState('');
  const [docRevision, setDocRevision] = useState('');
  const [anonymizationRules, setAnonymizationRules] = useState<AnonymizationRule[]>([]);

  // Upload/link toggle
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload');
  const [docLink, setDocLink] = useState('');

  // Session state
  const [completionSuggested, setCompletionSuggested] = useState(false);
  const [contradictionDetected, setContradictionDetected] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Testing state
  const [testSession, setTestSession] = useState<any>(null);
  const [testQuestionIndex, setTestQuestionIndex] = useState(0);

  // Dialog + user profile
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  // Track if user has started engaging (typing or attaching)
  const hasEngaged = input.trim().length > 0 || !!attachedFile || !!docLink.trim();

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

  const resetChat = useCallback(() => {
    setSubState('setup');
    setMessages([]);
    setSessionId(null);
    setAttachedFile(null);
    setFileStoragePath(null);
    setDocName('');
    setDocType('');
    setDocDomain('');
    setDocRevision('');
    setAnonymizationRules([]);
    setUploadMode('upload');
    setDocLink('');
    setCompletionSuggested(false);
    setContradictionDetected(false);
    setTestSession(null);
    setTestQuestionIndex(0);
  }, []);

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${agent.code}/pending/original.${ext}`;
    setFileUploading(true);
    try {
      const { error } = await supabase.storage.from('agent-training-docs').upload(path, file, { upsert: true });
      if (error) throw error;
      setFileStoragePath(path);
      return path;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setFileUploading(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.size <= MAX_FILE_SIZE) {
      setAttachedFile(file);
      if (!docName.trim()) setDocName(file.name.replace(/\.[^/.]+$/, ''));
      await uploadFileToStorage(file);
    } else {
      toast.error('File too large (max 20MB)');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= MAX_FILE_SIZE) {
      setAttachedFile(file);
      if (!docName.trim()) setDocName(file.name.replace(/\.[^/.]+$/, ''));
      if (subState === 'setup') {
        await uploadFileToStorage(file);
      }
    } else if (file) {
      toast.error('File too large (max 20MB)');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if (!input.trim() && !attachedFile) return;

    let fileData: any = null;
    let fileName: string | null = null;

    if (attachedFile) {
      fileName = attachedFile.name;
      const isImage = attachedFile.type.startsWith('image/');
      if (isImage) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(attachedFile);
        });
        fileData = {
          base64,
          mime_type: attachedFile.type,
          filename: attachedFile.name,
        };
      }
      // Non-images: fileData stays null. Edge function creates text reference.
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
    setCompletionSuggested(false);
    setContradictionDetected(false);

    let currentSessionId = sessionId;

    // Lazy session creation on first send — optimistic transition
    if (!currentSessionId && subState === 'setup') {
      setSubState('active');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('agent_training_sessions')
          .insert({
            agent_code: agent.code,
            user_id: user.id,
            document_name: docName.trim() || fileName || 'Training Session',
            document_description: input.trim() || null,
            status: 'active',
            transcript: [],
          } as any)
          .select('id')
          .single();

        if (data?.id) {
          await supabase
            .from('agent_training_sessions')
            .update({
              document_type: docType || null,
              document_domain: docDomain || null,
              document_revision: docRevision || null,
              file_path: fileStoragePath || null,
              file_mime_type: attachedFile?.type || null,
              file_size_bytes: attachedFile?.size || null,
              anonymization_rules: anonymizationRules.filter(r => r.find && r.replace),
            } as any)
            .eq('id', data.id);
        }
        if (error) throw error;
        currentSessionId = data.id;
        setSessionId(data.id);
      } catch (err) {
        console.error('Session creation error:', err);
        toast.error('Failed to create session');
        setSubState('setup');
        setIsStreaming(false);
        return;
      }
    }

    try {
      const messagesForApi = newMessages.map(m => ({ role: m.role, content: m.content }));
      const mode = subState === 'testing' ? 'testing' : 'training';

      const response = await supabase.functions.invoke('agent-training-chat', {
        body: {
          session_id: currentSessionId,
          agent_code: agent.code,
          mode,
          messages: messagesForApi,
          file_data: fileData,
          document_context: {
            document_type: docType || undefined,
            document_domain: docDomain || undefined,
            document_name: docName || undefined,
            source_url: docLink || undefined,
          },
          anonymization_rules: anonymizationRules.filter(r => r.find && r.replace),
        },
      });

      if (response.error) throw response.error;

      const assistantContent = response.data?.content || 'I received your input but could not generate a response.';
      const metadata: TrainingMetadata = response.data?.metadata || { completion_suggested: false, open_questions_count: 0, contradiction_detected: false, session_updated: false };

      const assistantMessage: TrainingMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCompletionSuggested(metadata.completion_suggested);
      setContradictionDetected(metadata.contradiction_detected);

      if (subState === 'testing' && testSession?.knowledge_card?.suggested_test_questions) {
        const questions = testSession.knowledge_card.suggested_test_questions;
        const nextIdx = testQuestionIndex + 1;
        if (nextIdx < questions.length) {
          setTestQuestionIndex(nextIdx);
          setInput(questions[nextIdx].question);
        } else {
          setCompletionSuggested(true);
        }
      }
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      console.error('Training chat error detail:', errorDetail);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I hit a snag on that one. Try sending again — if you attached a large document, send your message first then re-attach the file separately.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;
    setIsCompleting(true);
    try {
      const isTesting = subState === 'testing';
      const response = await supabase.functions.invoke('agent-training-chat', {
        body: {
          session_id: sessionId,
          agent_code: agent.code,
          mode: 'complete',
          messages: [],
          anonymization_rules: [],
          testing: isTesting,
        },
      });
      if (response.error) throw response.error;

      queryClient.invalidateQueries({ queryKey: ['agent-training-sessions', agent.code] });

      if (isTesting) {
        const score = response.data?.test_result?.score;
        toast.success(`Test completed. Score: ${score ?? '—'}/100`);
      } else {
        toast.success(`Training session saved. ${agent.name}'s knowledge base updated.`);
      }

      resetChat();
      setActiveTab('history');
    } catch (err) {
      console.error('Complete session error:', err);
      toast.error('Failed to complete session. Try again.');
    } finally {
      setIsCompleting(false);
    }
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
        setIsTranscribing(true);
        try {
          const { data, error } = await supabase.functions.invoke('whisper-stt', { body: formData });
          if (!error && data?.text) {
            setInput(prev => (prev ? prev + ' ' : '') + data.text);
          }
        } catch (err) {
          console.error('Whisper STT error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  };

  const handleRetrain = (session: any) => {
    resetChat();
    setDocName(session.document_name || '');
    setDocType(session.document_type || '');
    setDocDomain(session.document_domain || '');
    setDocRevision(session.document_revision || '');
    setAnonymizationRules(session.anonymization_rules || []);
    setFileStoragePath(session.file_path || null);
    const retrainMsg = `We are revisiting ${session.document_name || 'this document'}. Here is what you previously understood: ${session.key_learnings || 'No summary available'}. Please review the document again and flag anything new, changed, or that needs updating.`;
    setInput(retrainMsg);
    setActiveTab('chat');
  };

  const handleTest = (session: any) => {
    resetChat();
    setTestSession(session);
    setSessionId(session.id);
    setSubState('testing');
    setAnonymizationRules(session.anonymization_rules || []);
    const questions = session.knowledge_card?.suggested_test_questions || [];
    if (questions.length > 0) {
      setInput(questions[0].question);
      setTestQuestionIndex(0);
    }
    setActiveTab('chat');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendDisabled = isStreaming || fileUploading || isTranscribing || (!input.trim() && !attachedFile);

  // Read-only mode for non-admin users
  if (!permLoading && !canTrain) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-5 pt-4 pb-3">
          <p className="text-sm font-semibold text-foreground">Knowledge Base — {agent.name}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <TrainingHistoryPanel
            sessions={sessions}
            agentCode={agent.code}
            agentName={agent.name}
            readOnly={true}
            isLoading={sessionsLoading}
          />
        </div>
      </div>
    );
  }

  // Shared input bar component
  const renderInputBar = () => (
    <div className="shadow-[0_-1px_0_hsl(var(--border)/0.3)] px-4 py-2.5 backdrop-blur-sm bg-card/80">
      {attachedFile && subState !== 'setup' && (
        <div className="flex items-center gap-2 mb-2 px-2">
          <Badge variant="secondary" className="text-[10px] gap-1 py-0.5">
            <FileText className="h-3 w-3" />
            {attachedFile.name}
            <button onClick={() => setAttachedFile(null)} className="ml-1 hover:text-destructive">×</button>
          </Badge>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileSelect} className="hidden" />
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="icon" onClick={toggleRecording}
          className={cn('h-8 w-8 shrink-0 relative', isRecording ? 'text-destructive animate-pulse' : 'text-muted-foreground hover:text-foreground')}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isTranscribing && (
            <span className="absolute -top-1 -right-1 text-[8px] bg-primary text-primary-foreground px-1 rounded">STT</span>
          )}
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={subState === 'setup' ? `Describe what ${agent.name} should learn...` : `Continue training ${agent.name}...`}
          className="min-h-[38px] max-h-[120px] resize-none text-sm border-border/40"
          rows={1}
        />
        <Button size="icon" onClick={sendMessage} disabled={sendDisabled} className="h-8 w-8 shrink-0">
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  // Shared message list renderer
  const renderMessages = () => (
    <>
      {messages.map((msg, i) => (
        <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
          {msg.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full overflow-hidden border border-border/30 shrink-0 mt-0.5">
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className={cn(
            'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
            msg.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted/60 text-foreground rounded-bl-md border border-border/30'
          )}>
            {msg.attachment && (
              <div className="flex items-center gap-1.5 mb-1.5 text-xs opacity-80">
                <FileText className="h-3 w-3" />{msg.attachment.name}
              </div>
            )}
            {msg.role === 'assistant' ? (
              <div className="training-message prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                <ReactMarkdown components={{ h2: trainingH2Renderer }}>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
            <p className={cn('text-[9px] mt-1', msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
              {format(msg.timestamp, 'HH:mm')}
            </p>
          </div>
        </div>
      ))}

      {isStreaming && (
        <div className="flex gap-2.5 justify-start">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-border/30 shrink-0 mt-0.5">
            <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
          </div>
          <div className="bg-muted/60 rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-border/30">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{agent.name} is thinking</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </>
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      {/* Compact tab bar */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-0 shrink-0">
        <TabsList className="flex-1 bg-muted/50 p-0.5 h-7">
          <TabsTrigger value="chat" className="text-[11px] h-6 gap-1.5 group hover:bg-accent/80 transition-all">
            <MessageSquare className="h-3 w-3 group-hover:text-primary transition-colors" />
            Training Chat
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[11px] h-6 gap-1.5 group hover:bg-accent/80 transition-all">
            <History className="h-3 w-3 group-hover:text-primary transition-colors" />
            Training History
          </TabsTrigger>
        </TabsList>
        {subState !== 'setup' && (
          <Button size="sm" variant="ghost" onClick={resetChat} className="text-[11px] h-6 shrink-0">
            New Session
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ─── TRAINING CHAT TAB ─── */}
        <TabsContent value="chat" className="mt-0 flex-1 flex flex-col overflow-hidden m-0">
          {/* SUB-STATE A: Setup — compact chat-first interface */}
          {subState === 'setup' && (
            <>
              <div className={cn(
                "flex-1 overflow-y-auto flex flex-col px-4 transition-all duration-300",
                hasEngaged ? "justify-end py-3" : "items-center justify-center py-4"
              )}>
                {/* Compact empty state — collapses when user starts engaging */}
                <div className={cn(
                  "flex flex-col items-center text-center transition-all duration-300",
                  hasEngaged ? "mb-3" : "mb-5"
                )}>
                  <div className={cn(
                    "rounded-full overflow-hidden ring-2 ring-border/20 transition-all duration-300",
                    hasEngaged ? "w-8 h-8 mb-1.5" : "w-10 h-10 mb-2"
                  )}>
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className={cn(
                    "font-semibold text-foreground transition-all duration-300",
                    hasEngaged ? "text-xs mb-0.5" : "text-sm mb-1"
                  )}>
                    Train {agent.name}
                  </h3>
                  {!hasEngaged && (
                    <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                      Upload a document, paste a link, or start typing — {agent.name} will ask questions to build its understanding.
                    </p>
                  )}
                </div>

                {/* Inline setup row — session name + resource toggle */}
                <div className={cn(
                  "w-full transition-all duration-300",
                  hasEngaged ? "max-w-full" : "max-w-md mx-auto"
                )}>
                  {/* Session name — compact inline */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="Session name..."
                      className="w-full text-xs font-medium bg-transparent border-0 border-b border-border/30 rounded-none focus:outline-none focus:border-primary/50 pb-1 placeholder:text-muted-foreground/40"
                    />
                  </div>

                  {/* Resource row — toggle + content inline */}
                  <div className="flex items-start gap-2">
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => setUploadMode('upload')}
                        className={cn(
                          'text-[10px] px-2 py-1 rounded-full border transition-colors',
                          uploadMode === 'upload'
                            ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                            : 'text-muted-foreground border-border/30 hover:border-border/60'
                        )}
                      >
                        <Paperclip className="h-2.5 w-2.5 inline mr-0.5" />
                        File
                      </button>
                      <button
                        onClick={() => setUploadMode('link')}
                        className={cn(
                          'text-[10px] px-2 py-1 rounded-full border transition-colors',
                          uploadMode === 'link'
                            ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                            : 'text-muted-foreground border-border/30 hover:border-border/60'
                        )}
                      >
                        <Link2 className="h-2.5 w-2.5 inline mr-0.5" />
                        Link
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      {uploadMode === 'upload' ? (
                        <>
                          {attachedFile ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/40">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-[11px] font-medium text-foreground flex-1 truncate">{attachedFile.name}</span>
                              <span className="text-[9px] text-muted-foreground">{(attachedFile.size / 1024 / 1024).toFixed(1)}MB</span>
                              {fileUploading ? (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              )}
                              <button onClick={() => { setAttachedFile(null); setFileStoragePath(null); }} className="text-muted-foreground hover:text-destructive">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-2 px-3 py-2 rounded-lg ring-1 ring-dashed ring-border/40 hover:ring-primary/40 hover:bg-primary/5 transition-all cursor-pointer bg-muted/10"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={handleFileDrop}
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                              <span className="text-[11px] text-muted-foreground">Drop or browse · PDF, DOCX, XLSX, PNG, JPG</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="relative">
                          <Input
                            value={docLink}
                            onChange={(e) => setDocLink(e.target.value)}
                            placeholder="https://..."
                            className="text-xs h-8"
                          />
                          {docLink.trim() && (
                            <button
                              onClick={() => setDocLink('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileSelect} className="hidden" />
            </>
          )}

          {/* SUB-STATE B/C: Active session or Testing */}
          {(subState === 'active' || subState === 'testing') && (
            <>
              {/* Compact session header */}
              <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between gap-2">
                {subState === 'testing' ? (
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Testing — {testSession?.document_name || 'Document'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-border/30 shrink-0">
                      <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground truncate">{docName || 'Training Session'}</span>
                    <Badge variant="outline" className="text-[8px] py-0 shrink-0">Active</Badge>
                  </div>
                )}
                {anonymizationRules.filter(r => r.find).length > 0 && (
                  <Badge variant="secondary" className="text-[9px] py-0 gap-1 shrink-0">
                    <Lock className="h-2.5 w-2.5" />
                    {anonymizationRules.filter(r => r.find).length}
                  </Badge>
                )}
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-border/30 shadow-sm mb-3">
                      <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs font-medium text-foreground mb-0.5">
                      {subState === 'testing' ? `Test ${agent.name}'s understanding` : `Chat with ${agent.name}`}
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-xs">
                      {subState === 'testing'
                        ? `Ask questions to verify what ${agent.name} learned.`
                        : `Send a message or upload a document to begin training.`
                      }
                    </p>
                  </div>
                )}

                {renderMessages()}
              </div>

              {/* Contradiction alert */}
              {contradictionDetected && (
                <div className="mx-4 mb-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">
                    {agent.name} flagged a contradiction with previous training.
                  </p>
                </div>
              )}

              {/* Completion banner */}
              {completionSuggested && !isStreaming && (
                <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <p className="text-[11px] font-medium text-foreground">
                      {subState === 'testing' ? 'All questions answered.' : `${agent.name} has no further questions.`}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-5">
                    <Button size="sm" onClick={completeSession} disabled={isCompleting} className="h-6 text-[10px] gap-1">
                      {isCompleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      {subState === 'testing' ? 'Save Score' : 'Complete & Save'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCompletionSuggested(false)} className="h-6 text-[10px]">
                      {subState === 'testing' ? 'Ask more' : 'Keep Training'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Completing overlay */}
              {isCompleting && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-xl">
                  <div className="text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-1.5" />
                    <p className="text-[11px] font-medium text-foreground">Extracting knowledge card...</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Unified input bar — always visible */}
          {(subState === 'setup' || subState === 'active' || subState === 'testing') && renderInputBar()}
        </TabsContent>

        {/* ─── HISTORY TAB ─── */}
        <TabsContent value="history" className="mt-0 flex-1 overflow-y-auto m-0 px-4 py-3">
          <TrainingHistoryPanel
            sessions={sessions}
            agentCode={agent.code}
            agentName={agent.name}
            readOnly={false}
            onRetrain={handleRetrain}
            onTest={handleTest}
            isLoading={sessionsLoading}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default AgentTrainingStudio;
