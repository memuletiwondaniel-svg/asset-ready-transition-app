import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Clock, FileText, CheckCircle, Home, Loader2, History, X, Sparkles, Upload, ChevronLeft, ChevronRight, Check, Filter, ArrowUpDown, MoreVertical, Eye, EyeOff, Maximize2, Minimize2, GripVertical, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { AnimatedParticles } from '@/components/ui/AnimatedParticles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OnboardingTour } from '@/components/OnboardingTour';
import { DashboardWidgets } from '@/components/widgets/DashboardWidgets';
import { QuickActionsWidget } from '@/components/widgets/QuickActionsWidget';
import { WorkspacesWidget } from '@/components/widgets/WorkspacesWidget';
import { RecentActivityWidget } from '@/components/widgets/RecentActivityWidget';
import { WidgetCard } from '@/components/widgets/WidgetCard';
import { WidgetManagement } from '@/components/WidgetManagement';
import { OrshSidebar } from '@/components/OrshSidebar';
import { ORSHChatDialog } from '@/components/widgets/ORSHChatDialog';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useToast } from '@/components/ui/use-toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WidgetConfig {
  id: string;
  title: string;
  isVisible: boolean;
  isExpanded: boolean;
}

interface SortableWidgetWrapperProps {
  id: string;
  children: React.ReactNode;
  isExpanded: boolean;
}

const SortableWidgetWrapper: React.FC<SortableWidgetWrapperProps> = ({
  id,
  children,
  isExpanded
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return <div ref={setNodeRef} style={style} className={`${isExpanded ? 'col-span-full' : ''}`}>
      {React.cloneElement(children as React.ReactElement, {
      dragAttributes: attributes,
      dragListeners: listeners
    })}
    </div>;
};

interface LandingPageProps {
  onBack: () => void;
  onNavigate: (section: string) => void;
}

const LandingPageContent: React.FC<LandingPageProps> = ({
  onBack,
  onNavigate
}) => {
  const {
    language,
    setLanguage,
    translations: t
  } = useLanguage();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    imageUrls?: string[];
  }>>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWidgetManagement, setShowWidgetManagement] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [welcomeBannerCollapsed, setWelcomeBannerCollapsed] = useState(() => {
    const saved = localStorage.getItem('welcomeBannerCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Widget grid configuration
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboardWidgetConfig');
    return saved ? JSON.parse(saved) : [{
      id: 'quick-actions',
      title: 'Quick Actions',
      isVisible: true,
      isExpanded: false
    }, {
      id: 'workspaces',
      title: 'Workspaces',
      isVisible: true,
      isExpanded: false
    }, {
      id: 'recent-activity',
      title: 'Recent Activity',
      isVisible: true,
      isExpanded: false
    }];
  });

  // AI Panel state
  const [aiPanelVisible, setAiPanelVisible] = useState(() => {
    const saved = localStorage.getItem('aiPanelVisible');
    return saved ? JSON.parse(saved) : true;
  });
  const [aiPanelExpanded, setAiPanelExpanded] = useState(() => {
    const saved = localStorage.getItem('aiPanelExpanded');
    return saved ? JSON.parse(saved) : false;
  });
  
  const MAX_IMAGES = 5;
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Save widget config to localStorage
  React.useEffect(() => {
    localStorage.setItem('dashboardWidgetConfig', JSON.stringify(widgets));
  }, [widgets]);

  // Save panel states to localStorage
  React.useEffect(() => {
    localStorage.setItem('aiPanelVisible', JSON.stringify(aiPanelVisible));
  }, [aiPanelVisible]);
  React.useEffect(() => {
    localStorage.setItem('aiPanelExpanded', JSON.stringify(aiPanelExpanded));
  }, [aiPanelExpanded]);
  React.useEffect(() => {
    localStorage.setItem('welcomeBannerCollapsed', JSON.stringify(welcomeBannerCollapsed));
  }, [welcomeBannerCollapsed]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Drag and drop sensors for widgets
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleVisibility = (widgetId: string) => {
    setWidgets(items => items.map(item => item.id === widgetId ? {
      ...item,
      isVisible: false
    } : item));
    toast({
      title: 'Widget hidden',
      description: 'Widget has been hidden from your dashboard'
    });
  };

  const handleToggleExpand = (widgetId: string) => {
    setWidgets(items => items.map(item => item.id === widgetId ? {
      ...item,
      isExpanded: !item.isExpanded
    } : item));
  };

  const handleShowAllWidgets = () => {
    setWidgets(items => items.map(item => ({
      ...item,
      isVisible: true
    })));
    toast({
      title: 'All widgets visible',
      description: 'All widgets have been restored to your dashboard'
    });
  };

  const handleResetWidgets = () => {
    const defaultWidgets = [{
      id: 'quick-actions',
      title: 'Quick Actions',
      isVisible: true,
      isExpanded: false
    }, {
      id: 'workspaces',
      title: 'Workspaces',
      isVisible: true,
      isExpanded: false
    }, {
      id: 'recent-activity',
      title: 'Recent Activity',
      isVisible: true,
      isExpanded: false
    }];
    setWidgets(defaultWidgets);
    setAiPanelVisible(true);
  };

  const hasHiddenWidgets = widgets.some(w => !w.isVisible);

  // Check if user has seen the tour before
  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages]);

  const {
    isListening,
    startListening,
    stopListening,
    isSupported
  } = useVoiceInput();

  const { toast } = useToast();

  // Fetch current user profile
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);

  const fetchUserProfile = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name, position, avatar_url').eq('user_id', user.id).single();
      if (profile) {
        let avatarUrl = profile.avatar_url;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
          avatarUrl = publicUrl;
        }
        setUserProfile({
          full_name: profile.full_name || 'User',
          position: profile.position || 'Team Member',
          avatar_url: avatarUrl || ''
        });
      }
    }
  }, []);

  React.useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(transcript => {
        setUserInput(transcript);
        toast({
          title: "Voice Input Received",
          description: transcript
        });
      });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (uploadedImages.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too many images",
        description: `You can only attach up to ${MAX_IMAGES} images per query`,
        variant: "destructive"
      });
      return;
    }

    const validFiles: File[] = [];
    const validPreviews: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Image too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive"
        });
        continue;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image format`,
          variant: "destructive"
        });
        continue;
      }
      validFiles.push(file);

      const reader = new FileReader();
      await new Promise<void>(resolve => {
        reader.onloadend = () => {
          validPreviews.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    if (validFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...validPreviews]);
      toast({
        title: `${validFiles.length} image${validFiles.length > 1 ? 's' : ''} attached`,
        description: `${uploadedImages.length + validFiles.length}/${MAX_IMAGES} images selected`
      });
    }
  };

  const uploadImagesToStorage = async (files: File[]): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload images",
          variant: "destructive"
        });
        return [];
      }
      const uploadPromises = files.map(async file => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('ai-query-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('ai-query-images').getPublicUrl(fileName);
        return publicUrl;
      });
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload one or more images. Please try again.",
        variant: "destructive"
      });
      return [];
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Image removed",
      description: `${uploadedImages.length - 1}/${MAX_IMAGES} images selected`
    });
  };

  const clearImages = () => {
    setUploadedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessageToAI = async (message: string) => {
    if (!message.trim() && uploadedImages.length === 0) return;
    let imageUrls: string[] = [];

    if (uploadedImages.length > 0) {
      imageUrls = await uploadImagesToStorage(uploadedImages);
      if (imageUrls.length === 0 && uploadedImages.length > 0) {
        return;
      }
    }

    setSearchHistory(prev => {
      const newHistory = [message, ...prev.filter(h => h !== message)].slice(0, 10);
      return newHistory;
    });
    const userMessage = {
      role: 'user' as const,
      content: message || `Analyzing ${imageUrls.length} image${imageUrls.length > 1 ? 's' : ''} for safety review...`,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined
    };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    clearImages();
    setIsLoadingAI(true);
    let assistantContent = '';

    try {
      const response = await fetch('https://ubsppmglyobecrpdensa.supabase.co/functions/v1/openai-streaming', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }
      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? {
                    ...m,
                    content: assistantContent
                  } : m);
                }
                return [...prev, {
                  role: 'assistant',
                  content: assistantContent
                }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('AI Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSend = () => {
    if (userInput.trim()) {
      sendMessageToAI(userInput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [{
    id: 'create-pssr',
    label: 'Create a PSSR',
    icon: ClipboardList
  }, {
    id: 'approve-pssr',
    label: 'Approve a PSSR',
    icon: CheckCircle
  }, {
    id: 'develop-p2a',
    label: 'Develop a P2A Plan',
    icon: FileText
  }];

  const workspaceCards = [{
    id: 'pssr',
    title: 'PSSR',
    description: 'Pre-Start Up Safety Review & Checklists',
    icon: ClipboardList,
    gradient: 'from-blue-500 to-blue-600',
    bgTone: 'bg-blue-500/5'
  }, {
    id: 'p2o',
    title: 'Project-to-Operations',
    description: 'Manage seamless project handovers',
    icon: KeyRound,
    gradient: 'from-purple-500 to-purple-600',
    bgTone: 'bg-purple-500/5'
  }, {
    id: 'admin-tools',
    title: 'Admin & Tools',
    description: 'Manage users, roles, and permissions',
    icon: Settings,
    gradient: 'from-orange-500 to-orange-600',
    bgTone: 'bg-orange-500/5'
  }];

  return (
    <AnimatedBackground>
      {/* Particle Effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <AnimatedParticles />
      </div>

      <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden">
        {/* ORSH Sidebar Component */}
        <OrshSidebar 
          userName={userProfile?.full_name || 'User'} 
          userTitle={userProfile?.position || 'Team Member'} 
          userAvatar={userProfile?.avatar_url || ''} 
          language={language} 
          onLanguageChange={setLanguage} 
          onNavigate={onNavigate} 
          onShowWidgets={() => setShowWidgetManagement(true)} 
          onShowOnboarding={() => setShowOnboarding(true)} 
          onLogout={onBack} 
          showWidgets={showWidgetManagement} 
          currentPage="home" 
          searchHistory={searchHistory} 
          onSearchHistoryClick={item => {
            setUserInput(item);
            setShowHistory(false);
          }} 
          showSearchHistory={showHistory} 
          onToggleSearchHistory={() => setShowHistory(!showHistory)} 
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 p-4 md:p-6 overflow-y-auto">
          <div className="flex-1 flex flex-col gap-6 transition-all duration-500">
            {/* Welcome User Banner - Ask ORSH AI */}
            <Card className="glass-card overflow-hidden animate-fade-in border-2 border-primary/20 shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
                <div className={`${welcomeBannerCollapsed ? 'p-3' : 'p-6'} transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h2 className={`font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent ${welcomeBannerCollapsed ? 'text-lg' : 'text-2xl'} transition-all duration-300`}>
                            {getGreeting()}, {userProfile?.full_name?.split(' ')[0] || 'User'}!
                          </h2>
                          {!welcomeBannerCollapsed && (
                            <p className="text-sm text-muted-foreground mt-1">
                              How can ORSH AI assist you today?
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setWelcomeBannerCollapsed(!welcomeBannerCollapsed)} 
                      className="h-8 w-8 hover:bg-primary/10 flex-shrink-0"
                    >
                      {welcomeBannerCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {!welcomeBannerCollapsed && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 mt-3 md:mt-4 animate-fade-in">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setInitialPrompt('How can I help you today?');
                          setChatOpen(true);
                        }} 
                        className="w-full justify-start gap-3 h-auto py-4 bg-background/80 backdrop-blur-sm hover:bg-primary/10 border-border/40 transition-all hover:scale-105"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold">Ask AI</p>
                          <p className="text-xs text-muted-foreground">Get instant answers</p>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setInitialPrompt('Summarize my recent PSSR');
                          setChatOpen(true);
                        }} 
                        className="w-full justify-start gap-3 h-auto py-4 bg-background/80 backdrop-blur-sm hover:bg-primary/10 border-border/40 transition-all hover:scale-105"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold">Summarize PSSR</p>
                          <p className="text-xs text-muted-foreground">Quick overview</p>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setInitialPrompt('Review my checklist items');
                          setChatOpen(true);
                        }} 
                        className="w-full justify-start gap-3 h-auto py-4 bg-background/80 backdrop-blur-sm hover:bg-primary/10 border-border/40 transition-all hover:scale-105"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold">Review Checklist</p>
                          <p className="text-xs text-muted-foreground">Check progress</p>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Widgets Section with Drag and Drop */}
            {!aiPanelExpanded && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">Dashboard Widgets</h2>
                  <div className="flex gap-2">
                    {!aiPanelVisible && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setAiPanelVisible(true);
                          toast({ title: 'AI Assistant shown' });
                        }} 
                        className="text-xs"
                      >
                        Show AI Assistant
                      </Button>
                    )}
                    {hasHiddenWidgets && (
                      <Button size="sm" variant="outline" onClick={handleShowAllWidgets} className="text-xs">
                        Show All Widgets
                      </Button>
                    )}
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 animate-smooth-in stagger-2">
                      {widgets.filter(w => w.isVisible).map(widget => (
                        <SortableWidgetWrapper key={widget.id} id={widget.id} isExpanded={widget.isExpanded}>
                          <WidgetCard 
                            title={widget.title} 
                            isExpanded={widget.isExpanded} 
                            isVisible={widget.isVisible} 
                            onToggleVisibility={() => handleToggleVisibility(widget.id)} 
                            onToggleExpand={() => handleToggleExpand(widget.id)}
                          >
                            {widget.id === 'quick-actions' && (
                              <QuickActionsWidget onActionClick={(actionId) => {
                                if (actionId === 'create-pssr') onNavigate('pssr');
                                else if (actionId === 'approve-pssr') onNavigate('pssr');
                                else if (actionId === 'develop-p2a') onNavigate('p2a');
                              }} />
                            )}
                            {widget.id === 'workspaces' && <WorkspacesWidget onNavigate={onNavigate} />}
                            {widget.id === 'recent-activity' && <RecentActivityWidget />}
                          </WidgetCard>
                        </SortableWidgetWrapper>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Widget Management Dialog */}
      <WidgetManagement 
        open={showWidgetManagement} 
        onOpenChange={setShowWidgetManagement} 
        widgets={widgets} 
        onToggleWidget={handleToggleVisibility} 
        onResetWidgets={handleResetWidgets} 
        aiPanelVisible={aiPanelVisible} 
        tasksPanelVisible={false} 
        onToggleAiPanel={() => {
          setAiPanelVisible(!aiPanelVisible);
          toast({ title: aiPanelVisible ? 'AI Assistant hidden' : 'AI Assistant shown' });
        }} 
        onToggleTasksPanel={() => {}} 
      />

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour onComplete={() => {
          setShowOnboarding(false);
          localStorage.setItem('hasSeenTour', 'true');
        }} />
      )}

      {/* ORSH Chat Dialog */}
      <ORSHChatDialog open={chatOpen} onOpenChange={setChatOpen} initialMessage={initialPrompt} />
    </AnimatedBackground>
  );
};

const LandingPage: React.FC<LandingPageProps> = props => {
  return (
    <LanguageProvider>
      <LandingPageContent {...props} />
    </LanguageProvider>
  );
};

export default LandingPage;
