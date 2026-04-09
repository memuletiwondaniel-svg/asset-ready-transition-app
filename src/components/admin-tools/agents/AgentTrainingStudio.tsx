import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, MessageSquare, History, Paperclip, Mic, Send, MicOff, FileText, CheckCircle2, Loader2, Upload, Lock, AlertTriangle, FlaskConical, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import AnonymizationRulesInline, { type AnonymizationRule } from './training/AnonymizationRulesInline';
import TrainingHistoryPanel from './training/TrainingHistoryPanel';

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

const DOCUMENT_TYPES = ['Procedure', 'Standard', 'Reference Manual', 'Report', 'Checklist', 'Certificate', 'Drawing', 'P&ID', 'P&ID Legend Sheet', 'LOSH Drawing', 'Other'];
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

  // Setup form state
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docDomain, setDocDomain] = useState('');
  const [docRevision, setDocRevision] = useState('');
  const [anonymizationRules, setAnonymizationRules] = useState<AnonymizationRule[]>([]);

  // Session state
  const [completionSuggested, setCompletionSuggested] = useState(false);
  const [contradictionDetected, setContradictionDetected] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Testing state
  const [testSession, setTestSession] = useState<any>(null);
  const [testQuestionIndex, setTestQuestionIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
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

  const handleSetupFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.size <= MAX_FILE_SIZE) {
      setAttachedFile(file);
      await uploadFileToStorage(file);
    } else {
      toast.error('File too large (max 20MB)');
    }
  };

  const handleSetupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= MAX_FILE_SIZE) {
      setAttachedFile(file);
      await uploadFileToStorage(file);
    } else if (file) {
      toast.error('File too large (max 20MB)');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= MAX_FILE_SIZE) {
      setAttachedFile(file);
    }
    if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if (!input.trim() && !attachedFile) return;

    let fileData: any = null;
    let fileName: string | null = null;

    if (attachedFile) {
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
    setCompletionSuggested(false);
    setContradictionDetected(false);

    let currentSessionId = sessionId;

    // Lazy session creation on first send
    if (!currentSessionId && subState === 'setup') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('agent_training_sessions')
          .insert({
            agent_code: agent.code,
            user_id: user.id,
            document_name: docName || fileName || null,
            document_description: input.trim() || null,
            status: 'active',
            transcript: [],
          } as any)
          .select('id')
          .single();

        // Update extended columns separately (not in generated types yet)
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
        setSubState('active');
      } catch (err) {
        console.error('Session creation error:', err);
        toast.error('Failed to create session');
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

      // Auto-populate next test question
      if (subState === 'testing' && testSession?.knowledge_card?.suggested_test_questions) {
        const questions = testSession.knowledge_card.suggested_test_questions;
        const nextIdx = testQuestionIndex + 1;
        if (nextIdx < questions.length) {
          setTestQuestionIndex(nextIdx);
          setInput(questions[nextIdx].question);
        } else {
          setCompletionSuggested(true); // all questions answered
        }
      }
    } catch (err) {
      console.error('Training chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
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

  const isSetupValid = docName.trim() && docType && docDomain.trim();
  const sendDisabled = isStreaming || fileUploading || isTranscribing || (!input.trim() && !attachedFile);

  // Read-only mode for non-admin users
  if (!permLoading && !canTrain) {
    return (
      <Card className="border-border/40 shadow-sm h-full">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
            </div>
            Knowledge Base — {agent.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <TrainingHistoryPanel
            sessions={sessions}
            agentCode={agent.code}
            agentName={agent.name}
            readOnly={true}
            isLoading={sessionsLoading}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <CardHeader className="pb-0 pt-4 px-5 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center hover:scale-110 transition-transform">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              </div>
              Knowledge & Training
            </CardTitle>
            {subState !== 'setup' && (
              <Button size="sm" variant="ghost" onClick={resetChat} className="text-xs h-7">
                New Session
              </Button>
            )}
          </div>
          <TabsList className="w-full justify-start bg-muted/50 p-1">
            <TabsTrigger value="chat" className="gap-1.5 text-xs group hover:bg-accent/80 hover:text-foreground transition-all duration-200 hover:scale-[1.02]">
              <MessageSquare className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
              Training Chat
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs group hover:bg-accent/80 hover:text-foreground transition-all duration-200 hover:scale-[1.02]">
              <History className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
              Training History
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          {/* ─── TRAINING CHAT TAB ─── */}
          <TabsContent value="chat" className="mt-0 flex-1 flex flex-col overflow-hidden m-0">
            {/* SUB-STATE A: Setup */}
            {subState === 'setup' && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <p className="text-xs font-medium text-foreground">Start a training session</p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Document name *</label>
                    <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Completions Management System Procedure" className="mt-1 text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Document type *</label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Domain / topic *</label>
                      <Input value={docDomain} onChange={(e) => setDocDomain(e.target.value)} placeholder="e.g. Mechanical Completion" className="mt-1 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Revision (optional)</label>
                    <Input value={docRevision} onChange={(e) => setDocRevision(e.target.value)} placeholder="e.g. 07A" className="mt-1 text-sm w-32" />
                  </div>

                  <AnonymizationRulesInline rules={anonymizationRules} onRulesChange={setAnonymizationRules} agentCode={agent.code} agentName={agent.name} />
                </div>

                {/* P&ID Training Path Checklist (Fred & Ivan only) */}
                {(agent.code === 'fred' || agent.code === 'ivan') && (() => {
                  const hasLegendSheet = sessions.some(s => (s as any).document_type === 'P&ID Legend Sheet' && s.status === 'completed');
                  const hasPID = sessions.some(s => (s as any).document_type === 'P&ID' && s.status === 'completed');
                  const hasLOSH = sessions.some(s => (s as any).document_type === 'LOSH Drawing' && s.status === 'completed');
                  const allComplete = hasLegendSheet && hasPID && (agent.code === 'ivan' || hasLOSH);

                  if (allComplete) return null;

                  return (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">P&ID Training Path</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-muted-foreground">Foundation knowledge</span>
                          <Badge variant="secondary" className="text-[8px] py-0 ml-auto">ready</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {hasLegendSheet ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                          )}
                          <span className={hasLegendSheet ? 'text-muted-foreground' : 'text-foreground'}>Project legend sheet</span>
                          {!hasLegendSheet && hasPID && (
                            <Badge variant="outline" className="text-[8px] py-0 ml-auto text-amber-600 border-amber-500/30 gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />Upload before P&IDs
                            </Badge>
                          )}
                          {!hasLegendSheet && !hasPID && (
                            <span className="text-[10px] text-muted-foreground/60 ml-auto">upload first</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {hasPID ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                          )}
                          <span className={hasPID ? 'text-muted-foreground' : 'text-foreground'}>Process P&IDs</span>
                        </div>
                        {agent.code === 'fred' && (
                          <div className="flex items-center gap-2 text-xs">
                            {hasLOSH ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                            )}
                            <span className={hasLOSH ? 'text-muted-foreground' : 'text-foreground'}>LOSH drawings</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* File drop zone */}
                <div className="border-t border-border/30 pt-4">
                  {attachedFile ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/40">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{attachedFile.name}</span>
                      <span className="text-[10px] text-muted-foreground">{(attachedFile.size / 1024 / 1024).toFixed(1)} MB</span>
                      {fileUploading ? (
                        <Badge variant="secondary" className="text-[9px]"><Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />Uploading...</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] text-emerald-600">Ready</Badge>
                      )}
                      <button onClick={() => { setAttachedFile(null); setFileStoragePath(null); }} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border/40 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleSetupFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Drop PDF, DOCX, XLSX, or image here</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">or click to browse (max 20MB)</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleSetupFileSelect} className="hidden" />
                </div>
              </div>
            )}

            {/* SUB-STATE B/C: Active session or Testing */}
            {(subState === 'active' || subState === 'testing') && (
              <>
                {/* Session header */}
                <div className="px-5 py-2.5 border-b border-border/30 flex items-center justify-between gap-3">
                  {subState === 'testing' ? (
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Testing Mode — {testSession?.document_name || 'Document'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{docName || 'Training Session'}</span>
                      <Badge variant="outline" className="text-[9px] py-0 shrink-0">● Active</Badge>
                      {docDomain && <span className="text-[10px] text-muted-foreground truncate">{docDomain}</span>}
                    </div>
                  )}
                  {anonymizationRules.filter(r => r.find).length > 0 && (
                    <Badge variant="secondary" className="text-[9px] py-0 gap-1 shrink-0">
                      <Lock className="h-2.5 w-2.5" />
                      {anonymizationRules.filter(r => r.find).length} rules
                    </Badge>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[300px]">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border/30 shadow-md mb-4">
                        <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        {subState === 'testing' ? `Test ${agent.name}'s understanding` : `Train ${agent.name}`}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {subState === 'testing'
                          ? `Ask questions to test what ${agent.name} learned from the training document.`
                          : `Upload a document, describe it, or record a voice note. ${agent.name} will analyze it and ask clarifying questions.`
                        }
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
                            <FileText className="h-3 w-3" />{msg.attachment.name}
                          </div>
                        )}
                        {msg.role === 'assistant' ? (
                          <div className="training-message prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                            <ReactMarkdown components={{ h2: trainingH2Renderer }}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        <p className={cn('text-[9px] mt-1.5', msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
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

                {/* Contradiction alert */}
                {contradictionDetected && (
                  <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">
                      {agent.name} has flagged a contradiction with previous training — review the highlighted section above.
                    </p>
                  </div>
                )}

                {/* Completion banner */}
                {completionSuggested && !isStreaming && (
                  <div className="mx-5 mb-2 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-start gap-2 mb-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {subState === 'testing' ? 'All questions answered.' : `${agent.name} has no further questions.`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {subState === 'testing'
                            ? 'Save the test score to the knowledge base?'
                            : `Ready to save this training session to ${agent.name}'s knowledge base?`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-6">
                      <Button size="sm" onClick={completeSession} disabled={isCompleting} className="h-7 text-xs gap-1.5">
                        {isCompleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        {subState === 'testing' ? 'Save Test Score' : 'Complete & Save'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setCompletionSuggested(false)} className="h-7 text-xs">
                        {subState === 'testing' ? 'Ask another question' : 'Keep Training'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Completing overlay */}
                {isCompleting && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-xl">
                    <div className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-foreground">Extracting knowledge card...</p>
                    </div>
                  </div>
                )}

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
                    <input ref={chatFileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleChatFileSelect} className="hidden" />
                    <Button variant="ghost" size="icon" onClick={() => chatFileInputRef.current?.click()} className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" onClick={toggleRecording}
                      className={cn('h-9 w-9 shrink-0 relative', isRecording ? 'text-destructive animate-pulse' : 'text-muted-foreground hover:text-foreground')}
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
                      placeholder={`Explain this document to ${agent.name}...`}
                      className="min-h-[40px] max-h-[120px] resize-none text-sm border-border/40"
                      rows={1}
                    />
                    <Button size="icon" onClick={sendMessage} disabled={sendDisabled} className="h-9 w-9 shrink-0">
                      {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Setup → first message bridge: if setup form is filled, show input bar */}
            {subState === 'setup' && isSetupValid && (
              <div className="border-t border-border/30 px-4 py-3 bg-card/50">
                {attachedFile && (
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <Badge variant="secondary" className="text-[10px] gap-1 py-0.5">
                      <FileText className="h-3 w-3" />{attachedFile.name}
                      <button onClick={() => { setAttachedFile(null); setFileStoragePath(null); }} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Describe this document for ${agent.name}...`}
                    className="min-h-[40px] max-h-[120px] resize-none text-sm border-border/40"
                    rows={1}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!input.trim() && !attachedFile} className="h-9 w-9 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ─── HISTORY TAB ─── */}
          <TabsContent value="history" className="mt-0 flex-1 overflow-y-auto m-0 px-5 py-4">
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
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default AgentTrainingStudio;
