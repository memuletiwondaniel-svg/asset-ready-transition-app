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
const MAX_FILE_SIZE = 80 * 1024 * 1024;

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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileStoragePaths, setFileStoragePaths] = useState<string[]>([]);

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
  const hasEngaged = input.trim().length > 0 || attachedFiles.length > 0 || !!docLink.trim();

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

  const completedSessions = sessions.filter((s: any) => s.status === 'completed');
  const lastSessionDate = completedSessions.length > 0
    ? format(new Date(completedSessions[0].completed_at || completedSessions[0].created_at), 'dd MMM yyyy')
    : '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch user profile for avatar
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profile) setUserProfile(profile);
      } catch {}
    };
    fetchProfile();
  }, []);

  const resetChat = useCallback(() => {
    setSubState('setup');
    setMessages([]);
    setSessionId(null);
    setAttachedFiles([]);
    setFileStoragePaths([]);
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
    const uniqueId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const path = `${user.id}/${agent.code}/pending/${uniqueId}.${ext}`;
    setFileUploading(true);
    try {
      const { error } = await supabase.storage.from('agent-training-docs').upload(path, file, { upsert: true });
      if (error) throw error;
      setFileStoragePaths(prev => [...prev, path]);
      return path;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`Failed to upload ${file.name}`);
      return null;
    } finally {
      setFileUploading(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      if (file.size <= MAX_FILE_SIZE) {
        setAttachedFiles(prev => [...prev, file]);
        if (!docName.trim()) setDocName(file.name.replace(/\.[^/.]+$/, ''));
        await uploadFileToStorage(file);
      } else {
        toast.error(`${file.name} is too large (max 80MB)`);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    for (const file of selectedFiles) {
      if (file.size <= MAX_FILE_SIZE) {
        setAttachedFiles(prev => [...prev, file]);
        if (!docName.trim()) setDocName(file.name.replace(/\.[^/.]+$/, ''));
        if (subState === 'setup') {
          await uploadFileToStorage(file);
        }
      } else {
        toast.error(`${file.name} is too large (max 80MB)`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    setFileStoragePaths(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    let fileData: any = null;
    let fileNames: string[] = [];

    if (attachedFiles.length > 0) {
      fileNames = attachedFiles.map(f => f.name);
      // For the first image file, encode as base64 for the API
      const firstImage = attachedFiles.find(f => f.type.startsWith('image/'));
      if (firstImage) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(firstImage);
        });
        fileData = {
          base64,
          mime_type: firstImage.type,
          filename: firstImage.name,
        };
      }
    }

    const userMessage: TrainingMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      ...(fileNames.length > 0 ? { attachment: { name: fileNames.join(', '), type: attachedFiles[0]?.type || '' } } : {}),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
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
            document_name: docName.trim() || fileNames[0] || 'Training Session',
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
              file_path: fileStoragePaths[0] || null,
              file_mime_type: attachedFiles[0]?.type || null,
              file_size_bytes: attachedFiles[0]?.size || null,
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
    setFileStoragePaths(session.file_path ? [session.file_path] : []);
    const retrainMsg = `We are revisiting ${session.document_name || 'this document'}. Here is what you previously understood: ${session.key_learnings || 'No summary available'}. Please review the document again and flag anything new, changed, or that needs updating.`;
    setInput(retrainMsg);
    setActiveTab('chat');
    setDialogOpen(true);
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
    setDialogOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendDisabled = isStreaming || fileUploading || isTranscribing || (!input.trim() && attachedFiles.length === 0);

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
      {attachedFiles.length > 0 && subState !== 'setup' && (
        <div className="flex flex-wrap items-center gap-2 mb-2 px-2">
          {attachedFiles.map((file, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] gap-1 py-0.5">
              <FileText className="h-3 w-3" />
              {file.name}
              <button onClick={() => removeAttachedFile(i)} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileSelect} multiple className="hidden" />
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
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ─── TRAINING CHAT TAB ─── */}
        <TabsContent value="chat" className="mt-0 flex-1 flex flex-col overflow-hidden m-0">
          <div className="flex items-center gap-3 py-3 px-4">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border/20 shrink-0">
              <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">Train {agent.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {completedSessions.length > 0
                  ? `${completedSessions.length} session${completedSessions.length !== 1 ? 's' : ''} completed · Last: ${lastSessionDate}`
                  : 'No sessions yet · Start the first session'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={() => setDialogOpen(true)} size="sm" className="h-7 text-xs gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Train
              </Button>
              <Button onClick={() => setActiveTab('history')} variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            </div>
          </div>
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

      {/* Training Dialog Overlay */}
      <AgentTrainingDialog
        agent={agent}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        subState={subState}
        messages={messages}
        input={input}
        setInput={setInput}
        isStreaming={isStreaming}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        removeAttachedFile={removeAttachedFile}
        fileUploading={fileUploading}
        docName={docName}
        setDocName={setDocName}
        docLink={docLink}
        setDocLink={setDocLink}
        uploadMode={uploadMode}
        setUploadMode={setUploadMode}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        completionSuggested={completionSuggested}
        contradictionDetected={contradictionDetected}
        isCompleting={isCompleting}
        testSession={testSession}
        userProfile={userProfile}
        messagesEndRef={messagesEndRef}
        fileInputRef={fileInputRef}
        sendMessage={sendMessage}
        resetChat={resetChat}
        completeSession={completeSession}
        setCompletionSuggested={setCompletionSuggested}
        toggleRecording={toggleRecording}
        handleFileSelect={handleFileSelect}
        handleFileDrop={handleFileDrop}
        sendDisabled={sendDisabled}
      />
    </Tabs>
  );
};

export default AgentTrainingStudio;
