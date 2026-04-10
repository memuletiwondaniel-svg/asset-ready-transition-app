import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Paperclip, Mic, MicOff, FileText, CheckCircle2, Loader2,
  Upload, Lock, AlertTriangle, FlaskConical, X, Link2, ArrowUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentProfile } from '@/data/agentProfiles';
import ReactMarkdown from 'react-markdown';

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

interface TrainingMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: { name: string; type: string };
}

type ChatSubState = 'setup' | 'active' | 'testing';

const ACCEPTED_MIME = '.pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp';

interface AgentTrainingDialogProps {
  agent: AgentProfile;
  open: boolean;
  onClose: () => void;
  subState: ChatSubState;
  messages: TrainingMessage[];
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  attachedFiles: File[];
  setAttachedFiles: (f: File[]) => void;
  removeAttachedFile: (index: number) => void;
  fileUploading: boolean;
  docName: string;
  setDocName: (v: string) => void;
  docLink: string;
  setDocLink: (v: string) => void;
  uploadMode: 'upload' | 'link';
  setUploadMode: (v: 'upload' | 'link') => void;
  isRecording: boolean;
  isTranscribing: boolean;
  completionSuggested: boolean;
  contradictionDetected: boolean;
  isCompleting: boolean;
  testSession: any;
  userProfile: { full_name: string; avatar_url: string | null } | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  sendMessage: () => void;
  resetChat: () => void;
  completeSession: () => void;
  setCompletionSuggested: (v: boolean) => void;
  toggleRecording: () => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileDrop: (e: React.DragEvent) => void;
  sendDisabled: boolean;
}

const AgentTrainingDialog: React.FC<AgentTrainingDialogProps> = ({
  agent, open, onClose, subState, messages, input, setInput, isStreaming,
  attachedFiles, setAttachedFiles, removeAttachedFile, fileUploading, docName, setDocName,
  docLink, setDocLink, uploadMode, setUploadMode, isRecording, isTranscribing,
  completionSuggested, contradictionDetected, isCompleting, testSession,
  userProfile, messagesEndRef, fileInputRef, sendMessage, resetChat,
  completeSession, setCompletionSuggested, toggleRecording, handleFileSelect,
  handleFileDrop, sendDisabled,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  if (!open) return null;

  const hasEngaged = input.trim().length > 0 || attachedFiles.length > 0 || !!docLink.trim();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Drag-and-drop handlers for the full dialog ──
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false when leaving the dialog boundary
    const relatedTarget = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDialogDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileDrop(e);
  };

  const renderUserAvatar = () => (
    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
      {userProfile?.avatar_url ? (
        <img
          src={userProfile.avatar_url.startsWith('http')
            ? userProfile.avatar_url
            : `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${userProfile.avatar_url}`}
          alt="You"
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-primary-foreground">
          {userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ME'}
        </span>
      )}
    </div>
  );

  const renderAgentAvatar = (size = 'h-8 w-8') => (
    <div className={cn("rounded-full overflow-hidden border border-border/30 flex-shrink-0", size)}>
      <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Chat panel */}
      <div
        className="relative z-10 w-[960px] max-w-[95vw] h-[90vh] flex flex-col bg-background border border-border/50 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDialogDrop}
      >

        {/* ─── Header ─── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border/50 shrink-0">
          {renderAgentAvatar()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{agent.name}</p>
            <p className="text-xs text-muted-foreground">
              {subState === 'testing' ? 'Testing Mode' : 'Training Mode'}
              {subState !== 'setup' && docName && (
                <> · <span className="text-foreground/70">{docName}</span></>
              )}
            </p>
          </div>
          {subState !== 'setup' && (
            <Button size="sm" variant="ghost" onClick={resetChat} className="text-xs h-7 shrink-0">
              + New Session
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 shrink-0 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ─── Body ─── */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {/* ── Drag-and-drop overlay ── */}
          {isDragging && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl m-2 animate-in fade-in duration-150">
              <div className="flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-primary/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Drop file here</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, DOCX, XLSX, PNG, JPG</p>
                </div>
              </div>
            </div>
          )}

          {subState === 'setup' ? (
            /* ── Setup state inside dialog ── */
            <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-border/20 mb-4">
                <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
              </div>

              {/* Session name — hero element */}
              <div className="w-full text-center mb-2">
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Name this session..."
                  className={cn(
                    "w-full text-center text-xl font-semibold bg-transparent border-none outline-none",
                    "placeholder:text-muted-foreground/30 text-foreground",
                    "focus:placeholder:text-muted-foreground/20",
                    "pb-1"
                  )}
                  autoFocus
                />
                <div className="h-px bg-border/30 mx-auto w-48 mt-1" />
              </div>

              {/* Welcome subtitle */}
              <p className="text-sm text-muted-foreground max-w-md text-center mb-6">
                Upload a document or paste a link — {agent.name} will ask questions as he reads.
              </p>

              <div className="w-full max-w-xl space-y-4">
                {/* Resource row */}
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    <button
                      onClick={() => setUploadMode('upload')}
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-full border transition-colors',
                        uploadMode === 'upload'
                          ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                          : 'text-muted-foreground border-border/30 hover:border-border/60'
                      )}
                    >
                      File
                    </button>
                    <button
                      onClick={() => setUploadMode('link')}
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-full border transition-colors',
                        uploadMode === 'link'
                          ? 'bg-primary/10 text-primary border-primary/20 font-medium'
                          : 'text-muted-foreground border-border/30 hover:border-border/60'
                      )}
                    >
                      Link
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {uploadMode === 'upload' ? (
                      <>
                        {attachedFiles.length > 0 && (
                          <div className="space-y-2">
                            {attachedFiles.map((file, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 rounded-lg border border-border/40">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                {fileUploading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                )}
                                <button onClick={() => removeAttachedFile(i)} className="text-muted-foreground hover:text-destructive">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div
                          className="flex items-center gap-3 px-4 py-3 rounded-lg ring-1 ring-dashed ring-border/40 hover:ring-primary/40 hover:bg-primary/5 transition-all cursor-pointer bg-muted/10"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleFileDrop}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {attachedFiles.length > 0 ? 'Add another file...' : 'Drop a file here, or click to browse'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="relative">
                        <Input
                          value={docLink}
                          onChange={(e) => setDocLink(e.target.value)}
                          placeholder="https://..."
                          className="text-sm"
                        />
                        {docLink.trim() && (
                          <button
                            onClick={() => setDocLink('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileSelect} multiple className="hidden" />
            </div>
          ) : (
            /* ── Active/Testing: message area ── */
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    {renderAgentAvatar('h-12 w-12')}
                    <p className="text-sm font-medium text-foreground mt-3 mb-0.5">
                      {subState === 'testing' ? `Test ${agent.name}'s understanding` : `Chat with ${agent.name}`}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {subState === 'testing'
                        ? `Ask questions to verify what ${agent.name} learned.`
                        : `Send a message or upload a document to begin training.`}
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1;
                  return (
                    <div key={i} className={cn('flex gap-4 items-start', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'assistant' && renderAgentAvatar()}
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                        msg.role === 'user'
                          ? 'bg-muted text-foreground rounded-br-md'
                          : 'bg-transparent text-foreground rounded-bl-md'
                      )}>
                        {msg.attachment && (
                          <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
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
                        {/* Inline loading for last assistant message */}
                        {isStreaming && isLastAssistant && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{agent.name} is thinking…</span>
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && renderUserAvatar()}
                    </div>
                  );
                })}

                {/* Standalone loading indicator (only when last msg is NOT assistant) */}
                {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant') && (
                  <div className="flex gap-4 items-start">
                    {renderAgentAvatar()}
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">{agent.name} is thinking…</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* ─── Banners ─── */}
        {contradictionDetected && (
          <div className="mx-4 mb-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {agent.name} flagged a contradiction with previous training.
            </p>
          </div>
        )}

        {completionSuggested && !isStreaming && (
          <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-foreground">
                {subState === 'testing' ? 'All questions answered.' : `${agent.name} has no further questions.`}
              </p>
            </div>
            <div className="flex gap-2 ml-5">
              <Button size="sm" onClick={completeSession} disabled={isCompleting} className="h-7 text-xs gap-1">
                {isCompleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                {subState === 'testing' ? 'Save Score' : 'Complete & Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCompletionSuggested(false)} className="h-7 text-xs">
                {subState === 'testing' ? 'Ask more' : 'Keep Training'}
              </Button>
            </div>
          </div>
        )}

        {/* Completing overlay */}
        {isCompleting && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-2xl">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Extracting knowledge card...</p>
            </div>
          </div>
        )}

        {/* ─── Input Area ─── */}
        <div className="p-4 border-t border-border/50 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Attached file preview */}
            {attachedFiles.length > 0 && subState !== 'setup' && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg group">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                    <button onClick={() => removeAttachedFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input container — Bob style */}
            <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl border border-border/50 p-2 focus-within:border-primary/50 transition-colors">
              <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME} onChange={handleFileSelect} multiple className="hidden" />

              {/* Paperclip — only in active/testing, not setup */}
              {subState !== 'setup' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming || fileUploading}
                  className="h-9 w-9 rounded-xl hover:bg-background"
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
              )}

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  subState === 'setup'
                    ? `What should ${agent.name} learn? Describe the context...`
                    : `Continue training ${agent.name}...`
                }
                rows={1}
                disabled={isStreaming || fileUploading}
                className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1 text-sm placeholder:text-muted-foreground max-h-[200px] min-h-[40px]"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRecording}
                disabled={isStreaming || fileUploading || isTranscribing}
                className={cn(
                  "h-9 w-9 rounded-xl hover:bg-background",
                  isRecording && "bg-destructive/10 text-destructive hover:bg-destructive/20 animate-pulse",
                  isTranscribing && "opacity-70"
                )}
              >
                {isTranscribing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>

              <Button
                onClick={sendMessage}
                disabled={sendDisabled}
                size="icon"
                className="h-9 w-9 rounded-xl"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              {agent.name} can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTrainingDialog;
