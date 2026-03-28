import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { renderWithStatusBadges } from '@/components/bob/StatusBadge';
import { StructuredResponse, parseStructuredResponse, renderInlineMarkdown, DocumentNumberLink } from '@/components/bob/StructuredResponse';
import { ASSAI_DOC_NUMBER_REGEX } from '@/lib/assaiLinks';

/** Replace known status codes and Assai doc numbers in text children */
function processChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      // First auto-link document numbers, then apply status badges to remaining text
      const docRegex = /\b(\d{4}-[A-Z]{2,6}-[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-[A-Z]{2}-[A-Z]\d{2}-\d{5}-\d{3})\b/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let key = 0;
      while ((match = docRegex.exec(child)) !== null) {
        if (match.index > lastIndex) {
          parts.push(<React.Fragment key={key++}>{renderWithStatusBadges(child.slice(lastIndex, match.index))}</React.Fragment>);
        }
        parts.push(<DocumentNumberLink key={key++} docNumber={match[1]} />);
        lastIndex = match.index + match[0].length;
      }
      if (parts.length > 0) {
        if (lastIndex < child.length) {
          parts.push(<React.Fragment key={key++}>{renderWithStatusBadges(child.slice(lastIndex))}</React.Fragment>);
        }
        return <>{parts}</>;
      }
      return <>{renderWithStatusBadges(child)}</>;
    }
    return child;
  });
}
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Bot, 
  User, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Search, 
  Edit2, 
  Check, 
  X, 
  Mic, 
  MicOff, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  XCircle,
  Sparkles,
  ArrowUp,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';
import { processUserInput, getBlockedResponse } from '@/lib/security';
import { ChatMessageFeedback } from '@/components/widgets/ChatMessageFeedback';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  fileUrls?: string[];
  fileNames?: string[];
  messageId?: string;
  feedbackGiven?: 'positive' | 'negative' | null;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  is_read?: boolean;
}

interface ORSHChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
  initialMessage?: string;
}


export const ORSHChatDialog: React.FC<ORSHChatDialogProps> = ({ 
  open, 
  onOpenChange, 
  onUnreadCountChange, 
  initialMessage,
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isListening, isTranscribing, startListening, stopListening, isSupported } = useVoiceInput();
  const { data: roleData } = useCurrentUserRole();
  const welcomeSentRef = useRef(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

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
    if (open) fetchProfile();
  }, [open]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Pre-seed the user message instantly so the modal never appears empty
  useEffect(() => {
    if (open && initialMessage) {
      const userMsg: Message = { role: 'user', content: initialMessage };
      setMessages([userMsg]);
      setIsLoading(true);
      // Then trigger the actual send (which will append assistant response)
      handleSend(initialMessage);
    }
  }, [open, initialMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        // ScrollArea's actual scrollable element is the Viewport child
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    });
  }, [messages, isLoading]);

  useEffect(() => {
    const channel = supabase
      .channel('chat-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations'
        },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check if user is new and inject proactive welcome message
  const checkAndSendWelcome = useCallback(async () => {
    if (welcomeSentRef.current) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if account is < 7 days old
      const createdAt = new Date(user.created_at);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) return;

      // Check flag in ai_user_context
      const { data: ctxData } = await supabase
        .from('ai_user_context')
        .select('context_value')
        .eq('user_id', user.id)
        .eq('context_key', 'bob_welcome_sent')
        .maybeSingle();

      if (ctxData?.context_value === true) return;

      // Check if user has any previous conversations
      const { count } = await supabase
        .from('chat_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((count || 0) > 0) return;

      // Get first name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const firstName = profile?.full_name?.split(' ')[0] || 'there';

      const welcomeMsg = `Hi ${firstName}! 👋 I'm Bob, your ORSH CoPilot. I can see you're just getting started. Would you like me to walk you through ORSH based on your role? Just say **"yes"** and I'll guide you step by step.`;

      welcomeSentRef.current = true;
      setMessages([{ role: 'assistant', content: welcomeMsg }]);

      // Store flag so it only appears once
      await (supabase.from('ai_user_context' as any).upsert({
        user_id: user.id,
        context_key: 'bob_welcome_sent',
        context_value: true,
      }, { onConflict: 'user_id,context_key' }) as any);
    } catch (err) {
      console.error('Welcome check error:', err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadConversations();
      // Only trigger welcome check when opening a fresh chat (no conversation loaded)
      if (!currentConversationId && messages.length === 0) {
        checkAndSendWelcome();
      }
    }
  }, [open]);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, title, updated_at, is_read')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
      
      const unreadCount = (data || []).filter(conv => !conv.is_read).length;
      onUnreadCountChange?.(unreadCount);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (data || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      
      await supabase
        .from('chat_conversations')
        .update({ is_read: true })
        .eq('id', conversationId);
      
      loadConversations();
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let conversationId = currentConversationId;

      if (!conversationId) {
        const firstMessage = content.substring(0, 50);
        const { data: conv, error: convError } = await supabase
          .from('chat_conversations')
          .insert({ user_id: user.id, title: firstMessage })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = conv.id;
        setCurrentConversationId(conversationId);
        loadConversations();
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({ conversation_id: conversationId, role, content });

      if (error) throw error;

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const uploadFilesToStorage = async (files: File[]): Promise<{ imageUrls: string[], fileUrls: string[], fileNames: string[], documentTexts: string[] }> => {
    const imageUrls: string[] = [];
    const fileUrls: string[] = [];
    const fileNames: string[] = [];
    const documentTexts: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      if (file.type.startsWith('image/')) {
        imageUrls.push(publicUrl);
      } else {
        try {
          const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-document', {
            body: { filePath: filePath }
          });

          if (!parseError && parseResult?.text) {
            documentTexts.push(`[Document: ${file.name}]\n${parseResult.text}\n`);
          } else {
            documentTexts.push(`[Document: ${file.name}] - File available at: ${publicUrl}`);
          }
        } catch {
          documentTexts.push(`[Document: ${file.name}] - File available at: ${publicUrl}`);
        }
        
        fileUrls.push(publicUrl);
        fileNames.push(file.name);
      }
    }

    return { imageUrls, fileUrls, fileNames, documentTexts };
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if ((!textToSend && attachedFiles.length === 0) || isLoading) return;

    // Security check - validate input before processing
    const securityCheck = processUserInput(textToSend);
    
    if (!securityCheck.isValid) {
      if (securityCheck.blockedReason === 'rate_limited') {
        toast.error('Too many requests. Please wait a moment.');
        return;
      }
      
      if (securityCheck.blockedReason === 'injection_detected') {
        // Silently handle - show Bob's deflection response without revealing detection
        if (!messageText) setInput('');
        const userMessage: Message = { role: 'user', content: textToSend };
        const blockedResponse: Message = { role: 'assistant', content: getBlockedResponse() };
        setMessages(prev => [...prev, userMessage, blockedResponse]);
        return;
      }
    }

    if (!messageText) setInput('');
    setUploadingFiles(true);
    
    let imageUrls: string[] = [];
    let fileUrls: string[] = [];
    let fileNames: string[] = [];
    let documentTexts: string[] = [];

    try {
      if (attachedFiles.length > 0) {
        const uploadResult = await uploadFilesToStorage(attachedFiles);
        imageUrls = uploadResult.imageUrls;
        fileUrls = uploadResult.fileUrls;
        fileNames = uploadResult.fileNames;
        documentTexts = uploadResult.documentTexts;
        setAttachedFiles([]);
      }
    } catch (error) {
      toast.error('Failed to upload files. Please try again.');
      setUploadingFiles(false);
      return;
    }

    setUploadingFiles(false);
    
    // Use sanitized input
    let finalContent = securityCheck.sanitizedInput || '';
    if (documentTexts.length > 0) {
      finalContent = finalContent + (finalContent ? '\n\n' : '') + documentTexts.join('\n\n');
    }
    if (!finalContent) finalContent = 'Please analyze these files.';
    
    const userMessage: Message = { 
      role: 'user', 
      content: finalContent,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      fileUrls: fileUrls.length > 0 ? fileUrls : undefined,
      fileNames: fileNames.length > 0 ? fileNames : undefined
    };
    
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setLastFailedMessage(null);

    await saveMessage('user', textToSend);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const response = await fetch(`https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ 
            role: m.role, 
            content: m.content,
            imageUrls: m.imageUrls,
            fileUrls: m.fileUrls
          }))
        })
      });

      if (!response.ok || !response.body) throw new Error('Failed to get response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
              }
            } catch {}
          }
        }
      }

      // Detect stub/incomplete responses (ends with ":" and very short, or no content)
      const trimmed = assistantMessage.trim();
      if (!trimmed || (trimmed.endsWith(':') && trimmed.length < 200 && !trimmed.includes('\n'))) {
        const errorMsg = `Bob encountered a temporary issue but is working on it. Please try again in a moment.`;
        setMessages([...newMessages, { role: 'assistant', content: errorMsg }]);
        setLastFailedMessage(textToSend);
        await saveMessage('assistant', errorMsg);
        loadConversations();
        return;
      }

      if (assistantMessage) {
        await saveMessage('assistant', assistantMessage);
        
        // More flexible regex to detect navigation JSON anywhere in message with optional extra fields
        const navigationMatch = assistantMessage.match(/\{"action"\s*:\s*"navigate"\s*,\s*"path"\s*:\s*"([^"]+)"[^}]*\}/);
        if (navigationMatch) {
          const path = navigationMatch[1];
          const cleanMessage = assistantMessage.replace(/\{"action"\s*:\s*"navigate"\s*,\s*"path"\s*:\s*"[^"]+?"[^}]*\}/g, '').trim();
          setMessages([...newMessages, { role: 'assistant', content: cleanMessage }]);
          
          setTimeout(() => {
            onOpenChange(false);
            navigate(path);
          }, 1000);
        }
        
        if (currentConversationId) {
          await supabase
            .from('chat_conversations')
            .update({ is_read: false })
            .eq('id', currentConversationId);
        }
        
        loadConversations();
      }
    } catch (error) {
      console.error('Error calling Bob:', error);
      const userQuery = textToSend?.substring(0, 60).trim() || 'your request';
      const errorMsg = `I had trouble connecting to process "${userQuery}". This is usually a temporary issue.\n\nYou can:\n• **Try again** in a moment\n• **Start a new chat** if the problem continues\n• **Contact your ORSH administrator** if it persists`;
      setMessages([...newMessages, { role: 'assistant', content: errorMsg }]);
      try { await saveMessage('assistant', errorMsg); } catch (_) {}
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(
        (transcript) => {
          setInput(transcript);
        },
        () => {
          // Auto-submit after transcription
          setTimeout(() => {
            const textarea = textareaRef.current;
            if (textarea) {
              const event = new KeyboardEvent('keydown', { key: 'Enter' });
              textarea.dispatchEvent(event);
            }
            // Fallback: directly call handleSend if the input has content
            handleSend();
          }, 200);
        }
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles = files.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isDocument = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ].includes(file.type);
        return isImage || isDocument;
      });
      
      if (validFiles.length < files.length) {
        toast.error('Some files were skipped. Only images and documents are supported.');
      }
      
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (conversationId === currentConversationId) handleNewChat();
      loadConversations();
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ title: newTitle.trim() })
        .eq('id', conversationId);

      if (error) throw error;

      setEditingConvId(null);
      setEditingTitle('');
      loadConversations();
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename conversation');
    }
  };

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleFeedbackChange = (messageIndex: number, rating: 'positive' | 'negative') => {
    setMessages(prev => prev.map((m, i) => 
      i === messageIndex ? { ...m, feedbackGiven: rating } : m
    ));
  };

  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isEmptyChat = messages.length === 0;

  const chatContent = (
    <>
        {/* Sidebar */}
        <div className={cn(
          "flex flex-col border-r border-border/50 bg-muted/30 transition-all duration-300",
          showSidebar ? "w-64" : "w-0 overflow-hidden"
        )}>
          {/* Sidebar Header */}
          <div className="p-3 border-b border-border/50">
            <Button 
              onClick={handleNewChat}
              variant="outline" 
              className="w-full justify-start gap-2 h-10 bg-background hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          </div>
          
          {/* Search */}
          <div className="p-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/50 border-border/50"
              />
            </div>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => editingConvId !== conv.id && loadConversation(conv.id)}
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                    conv.id === currentConversationId 
                      ? "bg-muted" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {editingConvId === conv.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameConversation(conv.id, editingTitle);
                            if (e.key === 'Escape') { setEditingConvId(null); setEditingTitle(''); }
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRenameConversation(conv.id, editingTitle)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingConvId(null); setEditingTitle(''); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm truncate block">{conv.title}</span>
                    )}
                  </div>
                  {!conv.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  {editingConvId !== conv.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => startEditing(conv, e as any)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteConversation(conv.id, e as any)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
              {filteredConversations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {searchQuery ? 'No chats found' : 'No chat history'}
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-8 w-8"
              >
                {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">B</span>
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Bob</h2>
                  <p className="text-xs text-muted-foreground">Co-Pilot</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleNewChat} className="gap-2">
                <Plus className="h-4 w-4" />
                New chat
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-6">
              {isEmptyChat ? (
                /* Welcome Screen */
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-3xl font-bold text-white">B</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Hi, I'm Bob</h1>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    Your Co-Pilot. Ask me anything or let me navigate you around.
                  </p>
                  
                </div>
              ) : (
                /* Messages */
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={index} className={cn("flex gap-4", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {message.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">B</span>
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === 'user' 
                          ? 'bg-muted text-foreground rounded-br-md' 
                          : 'bg-transparent rounded-bl-md'
                      )}>
                        {message.content && (() => {
                          const { before, data: structuredData, after } = parseStructuredResponse(message.content);
                          if (structuredData) {
                            return (
                              <div className="text-sm leading-relaxed">
                                {before && (
                                  <p className="mb-2">
                                    {renderInlineMarkdown(before)}
                                  </p>
                                )}
                                <StructuredResponse 
                                  data={structuredData} 
                                  onFollowupClick={(text) => {
                                    handleSend(text);
                                  }}
                                />
                                {after && <p className="mt-2">{renderInlineMarkdown(after)}</p>}
                              </div>
                            );
                          }
                          // Pre-process: normalize plain-text section headers to ## markdown headers
                          // Icon map for known section headers
                          const sectionIcons: Record<string, string> = {
                            'Critical Observations': '⚠️',
                            'Critical Observation': '⚠️',
                            'Expected Content': '📋',
                            'Handover Readiness Impact': '🎯',
                            'What I recommend': '💡',
                            'What I can tell you from the metadata': '📄',
                            'What I can tell you': '📄',
                            'Document Overview': '📄',
                            'Key Observations': '🔍',
                            'Summary': '📊',
                            'Analysis': '🔬',
                            'Recommendations': '💡',
                            'Document Details': '📄',
                            'Status Overview': '📊',
                            'Next Steps': '➡️',
                            'Key Findings': '🔍',
                            'Document Metadata': '📄',
                            'Revision History': '📅',
                            'Action Items': '✅',
                            'The pattern I\'m seeing': '🔍',
                            'Would you like me to': '💬',
                            "Here's what this likely means": '🔍',
                            "Here's what I recommend": '💡',
                            'What I know from the Assai register': '📋',
                            'What I know from the metadata': '📄',
                            'What I found': '📋',
                            'Comparison': '⚖️',
                            'Context': '📝',
                            'Additional context': '📝',
                            'Key details': '📋',
                            'Observations': '🔍',
                          };

                          let processed = message.content;

                          // Only apply section header normalization to assistant messages
                          if (message.role === 'assistant') {
                          processed = processed
                            // Bold-wrapped headers: **Some Header:** or **Some Header**
                            .replace(/^\*\*([^*]+?)\*\*:?\s*$/gm, (_m, g1) => {
                              const clean = g1.replace(/:$/, '').trim();
                              const icon = sectionIcons[clean] || '📌';
                              return `## ${icon} ${clean}`;
                            })
                            // Plain text headers ending with colon on own line
                            .replace(/^([A-Z][A-Za-z\s''''"]+(?:from the metadata)?):?\s*$/gm, (_m, g1) => {
                              const clean = g1.replace(/:$/, '').trim();
                              // Only convert if it's a known header or looks like one
                              const partialMatch = Object.keys(sectionIcons).find(k => clean.toLowerCase().startsWith(k.toLowerCase()));
                              if (sectionIcons[clean]) {
                                return `## ${sectionIcons[clean]} ${clean}`;
                              }
                              if (partialMatch) {
                                return `## ${sectionIcons[partialMatch]} ${clean}`;
                              }
                              // Check if it looks like a title-case header (starts with capital, mostly alpha)
                              if (/^[A-Z][a-z]/.test(clean) && clean.length > 8 && clean.length < 60) {
                                return `## 📌 ${clean}`;
                              }
                              return _m; // Leave unchanged
                            });
                          } // end assistant-only header normalization

                          // Extract follow-up suggestions (bullet items after "Would you like me to")
                          const followUpRegex = /## [💬📌⚠️💡🔍📄📋🎯📝🔬📊➡️📅✅]+ Would you like me to[\s\S]*?(?=\n## |\n---|\s*$)/i;
                          const followUpMatch = processed.match(followUpRegex);
                          let followUpItems: string[] = [];
                          if (followUpMatch) {
                            const bulletRegex = /[-•*]\s+(.+)/g;
                            let bm: RegExpExecArray | null;
                            while ((bm = bulletRegex.exec(followUpMatch[0])) !== null) {
                              followUpItems.push(bm[1].replace(/\?$/, '').trim());
                            }
                            if (followUpItems.length > 0) {
                              processed = processed.replace(followUpMatch[0], '').trim();
                            }
                          }

                          return (
                            <>
                               <div className="text-sm leading-relaxed max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border/50 [&_th]:px-3 [&_th]:py-1.5 [&_th]:bg-muted/50 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_td]:border [&_td]:border-border/50 [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-xs [&_p]:my-1.5 [&_p]:leading-relaxed [&_ul]:my-1.5 [&_ul]:space-y-0.5 [&_ol]:my-1.5 [&_ol]:space-y-0.5 [&_li]:my-0 [&_li]:leading-relaxed [&_pre]:bg-background/50 [&_pre]:rounded-lg [&_code]:text-xs [&_strong]:font-semibold [&_strong]:text-foreground/80 [&_hr]:my-3 [&_hr]:border-border/30 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_em]:text-muted-foreground">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h2: ({ children }) => <h2 className="mt-5 mb-2 border-t border-border/60 pt-3 text-base font-extrabold tracking-tight text-foreground flex items-center gap-2" style={{ fontWeight: 800 }}>{children}</h2>,
                                    h3: ({ children }) => <h3 className="mt-4 mb-1.5 text-[15px] font-bold text-foreground" style={{ fontWeight: 700 }}>{children}</h3>,
                                    p: ({ children }) => <p>{processChildren(children)}</p>,
                                    ul: ({ children }) => <ul className="my-2 ml-6 list-disc space-y-1 text-sm">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-2 ml-6 list-decimal space-y-1 text-sm">{children}</ol>,
                                    li: ({ children }) => <li className="pl-1.5">{processChildren(children)}</li>,
                                    td: ({ children }) => <td>{processChildren(children)}</td>,
                                    th: ({ children }) => <th>{processChildren(children)}</th>,
                                    em: ({ children }) => <em className="text-muted-foreground italic">{children}</em>,
                                    a: ({ href, children }) => <a href={href} className="font-medium text-primary underline underline-offset-2" target="_blank" rel="noreferrer">{children}</a>,
                                  }}
                                >
                                  {processed}
                                </ReactMarkdown>
                              </div>
                              {followUpItems.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-border/60">
                                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Suggested actions</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {followUpItems.map((item, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleSend(item.replace(/\*\*/g, '') + '?')}
                                        className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer text-left"
                                      >
                                        {item.replace(/\*\*/g, '')}?
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        
                        {message.imageUrls && message.imageUrls.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {message.imageUrls.map((url, idx) => (
                              <img 
                                key={idx} 
                                src={url} 
                                alt={`Attachment ${idx + 1}`}
                                className="rounded-lg border max-h-48 w-full object-cover"
                              />
                            ))}
                          </div>
                        )}
                        
                        {message.fileUrls && message.fileUrls.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.fileUrls.map((url, idx) => (
                              <a 
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-background/50 hover:bg-background/70 transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-xs truncate">{message.fileNames?.[idx] || 'Document'}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.role === 'assistant' && !isLoading && (
                        <div className="flex flex-col mt-1.5">
                          <ChatMessageFeedback
                            messageIndex={index}
                            conversationId={currentConversationId}
                            agentName="bob"
                            feedbackGiven={message.feedbackGiven}
                            onFeedbackChange={handleFeedbackChange}
                            messageContent={message.content}
                          />
                        </div>
                      )}
                      {message.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {userProfile?.avatar_url ? (
                            <img 
                              src={userProfile.avatar_url.startsWith('http') ? userProfile.avatar_url : `https://kgnrjqjbonuvpxxfvfjq.supabase.co/storage/v1/object/public/user-avatars/${userProfile.avatar_url}`}
                              alt="You"
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-primary-foreground">
                              {userProfile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-4 items-start">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="space-y-2">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs text-muted-foreground ml-1">Bob is thinking…</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {lastFailedMessage && !isLoading && (
                    <div className="flex justify-center mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const msg = lastFailedMessage;
                          setLastFailedMessage(null);
                          handleSend(msg);
                        }}
                        className="text-xs gap-1.5"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-border/50">
            <div className="max-w-3xl mx-auto">
              {/* File Attachments Preview */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachedFiles.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg group"
                    >
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Container */}
              <div className="relative flex items-end gap-2 bg-muted/50 rounded-2xl border border-border/50 p-2 focus-within:border-primary/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Attachment Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || uploadingFiles}
                        className="h-9 w-9 rounded-xl hover:bg-background"
                      >
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach files</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Text Input */}
                <textarea
                  ref={textareaRef}
                  placeholder="Message Bob..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                  disabled={isLoading || uploadingFiles}
                  className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1 text-sm placeholder:text-muted-foreground max-h-[200px] min-h-[40px]"
                />

                {/* Voice Button */}
                {isSupported && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleVoiceInput}
                          disabled={isLoading || uploadingFiles || isTranscribing}
                          className={cn(
                            "h-9 w-9 rounded-xl hover:bg-background",
                            isListening && "bg-destructive/10 text-destructive hover:bg-destructive/20 animate-pulse",
                            isTranscribing && "opacity-70"
                          )}
                        >
                          {isTranscribing ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : isListening ? (
                            <MicOff className="h-5 w-5" />
                          ) : (
                            <Mic className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isTranscribing ? 'Transcribing...' : isListening ? 'Stop recording' : 'Speak to Bob'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Send Button */}
                <Button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || uploadingFiles}
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                >
                  {uploadingFiles ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-3">
                Bob can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </div>
    </>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      {/* Chat panel */}
      <div className="relative z-10 w-[960px] max-w-[95vw] h-[90vh] flex bg-background border border-border/50 shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
        {chatContent}
      </div>
    </div>
  );
};
