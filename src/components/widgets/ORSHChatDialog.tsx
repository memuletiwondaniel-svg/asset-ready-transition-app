import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
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
  ThumbsDown
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';
import { processUserInput, getBlockedResponse } from '@/lib/security';
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

const SUGGESTED_PROMPTS = [
  "Show me my tasks",
  "What are the 6 phases of ORA?",
  "What is a Priority A action?",
  "Take me to PSSR module",
];

export const ORSHChatDialog: React.FC<ORSHChatDialogProps> = ({ 
  open, 
  onOpenChange, 
  onUnreadCountChange, 
  initialMessage 
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  const { isListening, startListening, stopListening, isSupported } = useVoiceInput();
  const { data: roleData } = useCurrentUserRole();
  const welcomeSentRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if (open && initialMessage) {
      setInput(initialMessage);
    }
  }, [open, initialMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      toast.error('Failed to get response from Bob. Please try again.');
      setMessages(newMessages);
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
      startListening((transcript) => {
        setInput((prev) => prev + (prev ? ' ' : '') + transcript);
      });
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

  const handleFeedback = async (messageIndex: number, rating: 'positive' | 'negative') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const message = messages[messageIndex];
      if (message.feedbackGiven === rating) return;

      const { error } = await supabase
        .from('ai_response_feedback')
        .insert({
          user_id: user.id,
          conversation_id: currentConversationId,
          rating,
          agent_code: 'bob-copilot',
        });

      if (error) throw error;

      setMessages(prev => prev.map((m, i) => 
        i === messageIndex ? { ...m, feedbackGiven: rating } : m
      ));

      toast.success(rating === 'positive' ? 'Thanks for the feedback!' : 'Thanks, we\'ll improve!');
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isEmptyChat = messages.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex p-0 gap-0 bg-background border-border/50 shadow-2xl overflow-hidden">
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
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Bob</h2>
                  <p className="text-xs text-muted-foreground">ORSH Assistant</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNewChat} className="gap-2">
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="max-w-3xl mx-auto px-4 py-6">
              {isEmptyChat ? (
                /* Welcome Screen */
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">Hi, I'm Bob</h1>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    Your ORSH assistant. Ask me anything or let me navigate you around.
                  </p>
                  
                  {/* Simple prompt suggestions */}
                  <div className="flex flex-wrap justify-center gap-2 w-full max-w-lg">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(prompt)}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm rounded-full border border-border/50 bg-muted/30 hover:bg-muted/50 hover:border-border transition-all text-muted-foreground hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div key={index} className={cn("flex gap-4", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {message.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-br-md' 
                          : 'bg-muted rounded-bl-md'
                      )}>
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        )}
                        
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
                        <div className="flex items-center gap-1 mt-1 ml-12">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 rounded-full",
                              message.feedbackGiven === 'positive' && "bg-green-500/10 text-green-600"
                            )}
                            onClick={() => handleFeedback(index, 'positive')}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 rounded-full",
                              message.feedbackGiven === 'negative' && "bg-destructive/10 text-destructive"
                            )}
                            onClick={() => handleFeedback(index, 'negative')}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {message.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-4">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
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
                          disabled={isLoading || uploadingFiles}
                          className={cn(
                            "h-9 w-9 rounded-xl hover:bg-background",
                            isListening && "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          )}
                        >
                          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isListening ? 'Stop recording' : 'Voice input'}</TooltipContent>
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
      </DialogContent>
    </Dialog>
  );
};
