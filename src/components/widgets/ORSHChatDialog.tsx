import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Search, Edit2, Check, X, Mic, MicOff, Paperclip, FileText, Image as ImageIcon, Loader2 as LoaderIcon, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrls?: string[];
  fileUrls?: string[];
  fileNames?: string[];
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
  "What are the key steps in a PSSR process?",
  "How do I create a safety checklist?",
  "What should I include in a pre-startup review?",
  "Explain the approval workflow for PSSRs",
  "What are common safety review compliance requirements?",
  "How do I assign tasks in a PSSR?",
];

export const ORSHChatDialog: React.FC<ORSHChatDialogProps> = ({ open, onOpenChange, onUnreadCountChange, initialMessage }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m ORSH, your AI assistant for PSSRs and safety reviews. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isListening, startListening, stopListening, isSupported } = useVoiceInput();

  // Handle initial message when dialog opens
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

  // Set up realtime subscription for conversation updates
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
        (payload) => {
          console.log('Conversation change received:', payload);
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (open) {
      loadConversations();
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
      
      // Count unread conversations
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
      
      // Mark conversation as read when loaded
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

      // Create new conversation if needed
      if (!conversationId) {
        const firstMessage = content.substring(0, 50);
        const { data: conv, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            title: firstMessage
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = conv.id;
        setCurrentConversationId(conversationId);
        loadConversations();
      }

      // Save message
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content
        });

      if (error) throw error;

      // Update conversation timestamp
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

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(filePath);

      if (file.type.startsWith('image/')) {
        imageUrls.push(publicUrl);
      } else {
        // Parse document to extract text
        try {
          const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-document', {
            body: { filePath: filePath }
          });

          if (!parseError && parseResult?.text) {
            documentTexts.push(`[Document: ${file.name}]\n${parseResult.text}\n`);
          } else {
            documentTexts.push(`[Document: ${file.name}] - Unable to extract text automatically. File available at: ${publicUrl}`);
          }
        } catch (parseError) {
          console.error('Error parsing document:', parseError);
          documentTexts.push(`[Document: ${file.name}] - Unable to extract text automatically. File available at: ${publicUrl}`);
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

    if (!messageText) {
      setInput('');
    }

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
    
    // Combine text content with document texts
    let finalContent = textToSend || '';
    if (documentTexts.length > 0) {
      finalContent = finalContent + (finalContent ? '\n\n' : '') + documentTexts.join('\n\n');
    }
    if (!finalContent) {
      finalContent = 'Please analyze these files.';
    }
    
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
      const response = await fetch(`https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
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

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add empty assistant message that we'll update
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
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Save the complete assistant message
      if (assistantMessage) {
        await saveMessage('assistant', assistantMessage);
        
        // Mark conversation as unread
        if (currentConversationId) {
          await supabase
            .from('chat_conversations')
            .update({ is_read: false })
            .eq('id', currentConversationId);
        }
        
        loadConversations();
      }
    } catch (error) {
      console.error('Error calling AI chat:', error);
      toast.error('Failed to get response from ORSH. Please try again.');
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
        toast.error('Some files were skipped. Only images and documents (PDF, DOC, DOCX, XLS, XLSX) are supported.');
      }
      
      setAttachedFiles(prev => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m ORSH, your AI assistant for PSSRs and safety reviews. How can I help you today?'
      }
    ]);
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

      if (conversationId === currentConversationId) {
        handleNewChat();
      }
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
      toast.success('Conversation renamed');
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

  const cancelEditing = () => {
    setEditingConvId(null);
    setEditingTitle('');
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = searchQuery && new Date(conv.updated_at).toLocaleDateString().includes(searchQuery);
    return matchesSearch || matchesDate;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 bg-background/95 backdrop-blur-xl border-2 border-border/50 shadow-2xl animate-scale-in">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Ask ORSH AI
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Your intelligent assistant for PSSRs and safety reviews
                </DialogDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleNewChat} className="hover:bg-primary/10 transition-all">
                <Plus className="h-4 w-4 mr-1" />
                New Chat
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSidebar(!showSidebar)}
                className="hover:bg-primary/10 transition-all"
              >
                {showSidebar ? (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Hide History
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-1" />
                    Show History
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Conversation History Sidebar */}
          {showSidebar && (
            <div className="w-64 border-r flex flex-col">
              <div className="px-4 py-3 border-b space-y-2">
                <h3 className="font-semibold text-sm">Recent Conversations</h3>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors relative group ${
                        conv.id === currentConversationId ? 'bg-accent border border-primary' : 'border border-transparent'
                      }`}
                      onClick={() => editingConvId !== conv.id && loadConversation(conv.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editingConvId === conv.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="h-7 text-xs"
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRenameConversation(conv.id, editingTitle);
                                  } else if (e.key === 'Escape') {
                                    cancelEditing();
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleRenameConversation(conv.id, editingTitle)}
                              >
                                <Check className="h-3 w-3 text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={cancelEditing}
                              >
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <p className="text-xs font-medium truncate">{conv.title}</p>
                              {!conv.is_read && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(conv.updated_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {editingConvId !== conv.id && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => startEditing(conv, e)}
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredConversations.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {searchQuery ? 'No conversations found' : 'No conversation history yet'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden px-6">
              <ScrollArea className="h-full pr-4" ref={scrollRef}>
                <div className="space-y-4 py-4">
                  {messages.length === 1 && (
                    <div className="mb-6">
                      <p className="text-sm text-muted-foreground mb-3">Quick questions:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {SUGGESTED_PROMPTS.map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="justify-start text-left h-auto py-2 px-3"
                            onClick={() => handleSend(prompt)}
                            disabled={isLoading}
                          >
                            <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                            <span className="text-sm">{prompt}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
                        
                        {/* Display attached images */}
                        {message.imageUrls && message.imageUrls.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {message.imageUrls.map((url, idx) => (
                              <img 
                                key={idx} 
                                src={url} 
                                alt={`Attachment ${idx + 1}`}
                                className="rounded border max-h-48 w-full object-cover"
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Display attached files */}
                        {message.fileUrls && message.fileUrls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.fileUrls.map((url, idx) => (
                              <a 
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded border ${
                                  message.role === 'user' 
                                    ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' 
                                    : 'bg-background/50 hover:bg-background/70'
                                }`}
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-xs">{message.fileNames?.[idx] || 'Document'}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="rounded-lg px-4 py-2 bg-muted">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="p-6 pt-4 border-t space-y-3">
              {/* File attachments preview */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Textarea
                  placeholder="Ask ORSH about PSSRs, safety reviews, checklists..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="min-h-[60px] max-h-[120px] resize-none"
                  disabled={isLoading || uploadingFiles}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || uploadingFiles}
                    variant="outline"
                    className="self-end"
                    title="Attach files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  {isSupported && (
                    <Button
                      onClick={handleVoiceInput}
                      disabled={isLoading || uploadingFiles}
                      variant={isListening ? "destructive" : "outline"}
                      className={`self-end ${isListening ? 'animate-pulse' : ''}`}
                      title={isListening ? "Stop listening" : "Voice input"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || uploadingFiles}
                    className="self-end"
                  >
                    {uploadingFiles ? (
                      <LoaderIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
