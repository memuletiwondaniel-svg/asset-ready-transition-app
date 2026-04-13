import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AgentProfile } from '@/data/agentProfiles';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { type AnonymizationRule } from './training/AnonymizationRulesInline';
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
  dialogOpen: boolean;
  onDialogClose: () => void;
}

type ChatSubState = 'setup' | 'active' | 'testing';

const ACCEPTED_MIME = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp';
const MAX_FILE_SIZE = 80 * 1024 * 1024;

const AgentTrainingStudio: React.FC<AgentTrainingStudioProps> = ({ agent, dialogOpen, onDialogClose }) => {
  const { hasPermission, isLoading: permLoading } = usePermissions();
  const canTrain = !permLoading && hasPermission('access_admin');

  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
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

  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docDomain, setDocDomain] = useState('');
  const [docRevision, setDocRevision] = useState('');
  const [anonymizationRules, setAnonymizationRules] = useState<AnonymizationRule[]>([]);

  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload');
  const [docLink, setDocLink] = useState('');

  const [completionSuggested, setCompletionSuggested] = useState(false);
  const [contradictionDetected, setContradictionDetected] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [testSession, setTestSession] = useState<any>(null);
  const [testQuestionIndex, setTestQuestionIndex] = useState(0);

  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

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
      const firstImage = attachedFiles.find(f => f.type.startsWith('image/'));
      if (firstImage) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(firstImage);
        });
        fileData = { base64, mime_type: firstImage.type, filename: firstImage.name };
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

  const sendDisabled = isStreaming || fileUploading || isTranscribing || (!input.trim() && attachedFiles.length === 0);

  if (!permLoading && !canTrain) {
    return null;
  }

  return (
    <>
      {/* Dialog — preserves draft on close */}
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
    </>
  );
};

export default AgentTrainingStudio;
