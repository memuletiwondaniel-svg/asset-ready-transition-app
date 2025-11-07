import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Clock, FileText, CheckCircle, Home, Loader2, History, X, Sparkles, Upload, ListTodo, ChevronLeft, ChevronRight, Check, Filter, ArrowUpDown, MoreVertical, Eye, EyeOff, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useUserTasks } from '@/hooks/useUserTasks';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
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

const SortableWidgetWrapper: React.FC<SortableWidgetWrapperProps> = ({ id, children, isExpanded }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`${isExpanded ? 'col-span-full' : ''}`}
    >
      {/* Clone children and pass drag attributes only to header */}
      {React.cloneElement(children as React.ReactElement, {
        dragAttributes: attributes,
        dragListeners: listeners
      })}
    </div>
  );
};

// Sortable wrapper for column panels (AI Assistant, Tasks, etc.)
interface SortablePanelWrapperProps {
  id: string;
  children: React.ReactNode;
}

const SortablePanelWrapper: React.FC<SortablePanelWrapperProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={isDragging ? 'z-50' : ''}
    >
      {/* Clone children and pass drag attributes to be applied to drag handle */}
      {React.cloneElement(children as React.ReactElement, {
        dragAttributes: attributes,
        dragListeners: listeners
      })}
    </div>
  );
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
  const [isTasksPanelCollapsed, setIsTasksPanelCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'due_date' | 'type'>('priority');
  const [taskFilterType, setTaskFilterType] = useState<string>('all');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskAction, setTaskAction] = useState<'complete' | 'dismiss' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWidgetManagement, setShowWidgetManagement] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Widget grid configuration
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboardWidgetConfig');
    return saved ? JSON.parse(saved) : [
      { id: 'quick-actions', title: 'Quick Actions', isVisible: true, isExpanded: false },
      { id: 'workspaces', title: 'Workspaces', isVisible: true, isExpanded: false },
      { id: 'recent-activity', title: 'Recent Activity', isVisible: true, isExpanded: false }
    ];
  });

  // Left column items order (AI Assistant and widgets section)
  const [leftColumnOrder, setLeftColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('leftColumnOrder');
    return saved ? JSON.parse(saved) : ['ai-assistant', 'widgets-section'];
  });

  // Right column items order (Tasks panel and future additions)
  const [rightColumnOrder, setRightColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('rightColumnOrder');
    return saved ? JSON.parse(saved) : ['tasks-panel'];
  });

  // AI Panel and Tasks Panel state
  const [aiPanelVisible, setAiPanelVisible] = useState(() => {
    const saved = localStorage.getItem('aiPanelVisible');
    return saved ? JSON.parse(saved) : true;
  });

  const [aiPanelExpanded, setAiPanelExpanded] = useState(() => {
    const saved = localStorage.getItem('aiPanelExpanded');
    return saved ? JSON.parse(saved) : false;
  });

  const [tasksPanelVisible, setTasksPanelVisible] = useState(() => {
    const saved = localStorage.getItem('tasksPanelVisible');
    return saved ? JSON.parse(saved) : true;
  });

  const MAX_IMAGES = 5;
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Save widget config to localStorage
  React.useEffect(() => {
    localStorage.setItem('dashboardWidgetConfig', JSON.stringify(widgets));
  }, [widgets]);

  // Save column orders to localStorage
  React.useEffect(() => {
    localStorage.setItem('leftColumnOrder', JSON.stringify(leftColumnOrder));
  }, [leftColumnOrder]);

  React.useEffect(() => {
    localStorage.setItem('rightColumnOrder', JSON.stringify(rightColumnOrder));
  }, [rightColumnOrder]);

  // Save panel states to localStorage
  React.useEffect(() => {
    localStorage.setItem('aiPanelVisible', JSON.stringify(aiPanelVisible));
  }, [aiPanelVisible]);

  React.useEffect(() => {
    localStorage.setItem('aiPanelExpanded', JSON.stringify(aiPanelExpanded));
  }, [aiPanelExpanded]);

  React.useEffect(() => {
    localStorage.setItem('tasksPanelVisible', JSON.stringify(tasksPanelVisible));
  }, [tasksPanelVisible]);

  // Drag and drop sensors for all draggable areas
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle drag end for left column items
  const handleLeftColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLeftColumnOrder((items) => {
        const oldIndex = items.findIndex((id) => id === active.id);
        const newIndex = items.findIndex((id) => id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast({
        title: 'Layout updated',
        description: 'Left column panels reordered'
      });
    }
  };

  // Handle drag end for right column items
  const handleRightColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setRightColumnOrder((items) => {
        const oldIndex = items.findIndex((id) => id === active.id);
        const newIndex = items.findIndex((id) => id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast({
        title: 'Layout updated',
        description: 'Right column panels reordered'
      });
    }
  };

  const handleToggleVisibility = (widgetId: string) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, isVisible: false } : item
      )
    );
    toast({
      title: 'Widget hidden',
      description: 'Widget has been hidden from your dashboard'
    });
  };

  const handleToggleExpand = (widgetId: string) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === widgetId ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  const handleShowAllWidgets = () => {
    setWidgets((items) =>
      items.map((item) => ({ ...item, isVisible: true }))
    );
    toast({
      title: 'All widgets visible',
      description: 'All widgets have been restored to your dashboard'
    });
  };

  const handleResetWidgets = () => {
    const defaultWidgets = [
      { id: 'quick-actions', title: 'Quick Actions', isVisible: true, isExpanded: false },
      { id: 'workspaces', title: 'Workspaces', isVisible: true, isExpanded: false },
      { id: 'recent-activity', title: 'Recent Activity', isVisible: true, isExpanded: false }
    ];
    setWidgets(defaultWidgets);
    setAiPanelVisible(true);
    setTasksPanelVisible(true);
  };

  const hasHiddenWidgets = widgets.some((w) => !w.isVisible);

  // Check if user has seen the tour before
  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      // Show tour after a brief delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);
  const {
    tasks,
    loading: tasksLoading,
    updateTaskStatus,
    deleteTask
  } = useUserTasks();
  
  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const {
    isListening,
    startListening,
    stopListening,
    isSupported
  } = useVoiceInput();
  const {
    toast
  } = useToast();

  // Fetch current user profile
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);

  const fetchUserProfile = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, position, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        // Construct full avatar URL if needed
        let avatarUrl = profile.avatar_url;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          const { data: { publicUrl } } = supabase.storage
            .from('user-avatars')
            .getPublicUrl(avatarUrl);
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

    // Check if adding these files would exceed the limit
    if (uploadedImages.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too many images",
        description: `You can only attach up to ${MAX_IMAGES} images per query`,
        variant: "destructive"
      });
      return;
    }

    // Validate all files
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of files) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Image too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive"
        });
        continue;
      }

      // Validate file type
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

      // Create preview
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
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

      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ai-query-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ai-query-images')
          .getPublicUrl(fileName);

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
    
    // Upload images if present
    if (uploadedImages.length > 0) {
      imageUrls = await uploadImagesToStorage(uploadedImages);
      if (imageUrls.length === 0 && uploadedImages.length > 0) {
        // Upload failed, don't proceed
        return;
      }
    }
    
    // Add to search history
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
    setShowHistory(false);
    let assistantContent = '';
    try {
      const response = await fetch('https://kgnrjqjbonuvpxxfvfjq.supabase.co/functions/v1/ai-chat', {
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
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
          stream: true
        });
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

  const handleTaskAction = async (taskId: string, action: 'complete' | 'dismiss') => {
    if (action === 'complete') {
      await updateTaskStatus(taskId, 'completed');
    } else {
      await deleteTask(taskId);
    }
    setTaskToDelete(null);
    setTaskAction(null);
    toast({
      title: action === 'complete' ? 'Task completed' : 'Task dismissed',
      description: `Task has been ${action === 'complete' ? 'marked as complete' : 'removed from your list'}`
    });
  };

  // Calculate task counts by type
  const taskCounts = React.useMemo(() => {
    return {
      all: tasks.length,
      approval: tasks.filter(t => t.type === 'approval').length,
      review: tasks.filter(t => t.type === 'review').length,
      action: tasks.filter(t => t.type === 'action').length
    };
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks;
    
    // Filter by type
    if (taskFilterType !== 'all') {
      filtered = filtered.filter(task => task.type === taskFilterType);
    }
    
    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (taskSortBy === 'priority') {
        const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      } else if (taskSortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (taskSortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });
    
    return sorted;
  }, [tasks, taskFilterType, taskSortBy]);

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
    id: 'safe-startup',
    title: 'Safe Start-Up',
    description: 'Manage PSSR processes and safety checklists',
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

  return <AnimatedBackground>
      {/* Particle Effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <AnimatedParticles />
      </div>

      <div className="h-screen flex">
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
          showWidgets={showWidgetManagement}
          currentPage="dashboard"
          searchHistory={searchHistory}
          onSearchHistoryClick={(item) => {
            setUserInput(item);
            setShowHistory(false);
          }}
          showSearchHistory={showHistory}
          onToggleSearchHistory={() => setShowHistory(!showHistory)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Left Column with Draggable Panels */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleLeftColumnDragEnd}
          >
            <SortableContext items={leftColumnOrder} strategy={rectSortingStrategy}>
              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {leftColumnOrder.map((panelId) => {
                  if (panelId === 'ai-assistant' && aiPanelVisible) {
                    return (
                      <SortablePanelWrapper key="ai-assistant" id="ai-assistant">
                        <Card className={`glass-card glass-card-hover overflow-hidden flex flex-col animate-smooth-in group ${aiPanelExpanded ? 'flex-1' : ''}`} style={{ height: aiPanelExpanded ? 'auto' : (messages.length > 0 ? '50%' : '30%') }}>
                          <CardHeader className="flex-shrink-0 py-4 pb-3 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-grab active:cursor-grabbing hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Drag to reposition (coming soon)"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <CardTitle className="text-2xl font-bold">
                      Welcome {userProfile?.full_name || 'User'}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50 bg-background">
                      <DropdownMenuItem onClick={() => setAiPanelExpanded(!aiPanelExpanded)}>
                        {aiPanelExpanded ? (
                          <>
                            <Minimize2 className="w-4 h-4 mr-2" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Expand
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setAiPanelVisible(false);
                        toast({ title: 'AI Assistant hidden' });
                      }}>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
              <CardContent className="p-4 pt-3 flex flex-col flex-1 overflow-hidden">
                <div className="space-y-1.5 flex-shrink-0">
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative inline-block">
                          <img 
                            src={preview} 
                            alt={`Upload preview ${index + 1}`} 
                            className="h-20 w-20 rounded-lg border border-border/40 object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {imagePreviews.length < MAX_IMAGES && (
                        <Button
                          variant="outline"
                          className="h-20 w-20 border-dashed border-2 hover:bg-primary/5"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )}
                    <div className="relative group" data-tour="ai-input">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Textarea 
                    value={userInput} 
                    onChange={e => setUserInput(e.target.value)} 
                    onKeyPress={handleKeyPress} 
                    placeholder="Ask a question or describe what you need..." 
                    className="min-h-[120px] resize-none border-border/40 pr-24 relative backdrop-blur-sm bg-muted/20 focus:bg-muted/30 transition-all duration-300" 
                    disabled={isLoadingAI} 
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleVoiceInput} 
                      disabled={!isSupported || isLoadingAI} 
                      className="h-9 w-9 hover:bg-primary/10 transition-all duration-300"
                    >
                      <Mic className={`w-4 h-4 ${isListening ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoadingAI || uploadedImages.length >= MAX_IMAGES}
                      className="h-9 w-9 hover:bg-primary/10 transition-all duration-300"
                      title={uploadedImages.length >= MAX_IMAGES ? `Maximum ${MAX_IMAGES} images` : "Attach images"}
                    >
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      {uploadedImages.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                          {uploadedImages.length}
                        </Badge>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSend} 
                      disabled={isLoadingAI || (!userInput.trim() && uploadedImages.length === 0)} 
                      className={`rounded-full h-9 w-9 hover:scale-105 transition-all duration-300 ${
                        userInput.trim() || uploadedImages.length > 0
                          ? 'bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl'
                          : 'bg-muted/60 hover:bg-muted/80'
                      }`}
                    >
                      <Send className={`w-4 h-4 ${userInput.trim() || uploadedImages.length > 0 ? 'text-white' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                </div>

              </div>
              
              {/* AI Conversation Display */}
              {messages.length > 0 && (
                <ScrollArea className="flex-1 pr-4 mt-4">
                  <div className="space-y-4 py-2">
                    {messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-smooth-in`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground' 
                            : 'bg-gradient-to-br from-muted/80 to-muted/60 border border-border/40'
                        }`}>
                          {msg.imageUrls && msg.imageUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {msg.imageUrls.map((url, idx) => (
                                <img 
                                  key={idx}
                                  src={url} 
                                  alt={`User uploaded ${idx + 1}`} 
                                  className="w-full rounded-lg object-cover max-h-40"
                                />
                              ))}
                            </div>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoadingAI && (
                      <div className="flex justify-start animate-smooth-in">
                        <div className="bg-gradient-to-br from-muted/80 to-muted/60 rounded-2xl px-5 py-3 border border-border/40 backdrop-blur-sm">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                )}
              </CardContent>
              </Card>
                        </SortablePanelWrapper>
                      );
                    }
                    
                    if (panelId === 'widgets-section' && !aiPanelExpanded) {
                      return (
                        <React.Fragment key="widgets-section">
                          {/* Widgets Section with Drag and Drop */}
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
                    {!tasksPanelVisible && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTasksPanelVisible(true);
                          toast({ title: 'Tasks panel shown' });
                        }}
                        className="text-xs"
                      >
                        Show Tasks Panel
                      </Button>
                    )}
                    {hasHiddenWidgets && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleShowAllWidgets}
                        className="text-xs"
                      >
                        Show All Widgets
                      </Button>
                    )}
                  </div>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 gap-4 animate-smooth-in stagger-2" style={{ height: messages.length > 0 ? '48%' : '68%' }}>
                      {widgets.filter(w => w.isVisible).map((widget) => (
                        <SortableWidgetWrapper key={widget.id} id={widget.id} isExpanded={widget.isExpanded}>
                          <WidgetCard
                            title={widget.title}
                            isExpanded={widget.isExpanded}
                            isVisible={widget.isVisible}
                            onToggleVisibility={() => handleToggleVisibility(widget.id)}
                            onToggleExpand={() => handleToggleExpand(widget.id)}
                          >
                            {widget.id === 'quick-actions' && <QuickActionsWidget onActionClick={setUserInput} />}
                            {widget.id === 'workspaces' && <WorkspacesWidget onNavigate={onNavigate} />}
                            {widget.id === 'recent-activity' && <RecentActivityWidget />}
                          </WidgetCard>
                        </SortableWidgetWrapper>
                      ))}
                    </div>
                  </SortableContext>
                  </DndContext>
                        </React.Fragment>
                      );
                    }
                    
                    return null;
                  })}
                </div>
              </SortableContext>
            </DndContext>

          {/* Tasks Panel */}
          {tasksPanelVisible && (
            <Card className={`glass-panel shadow-xl transition-all duration-500 animate-smooth-in stagger-3 group ${isTasksPanelCollapsed ? 'w-16' : 'w-80'}`} data-tour="tasks">
              <CardHeader className="border-b border-border/40 py-4">
                <div className="flex items-center justify-between">
                  {!isTasksPanelCollapsed && (
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 cursor-grab active:cursor-grabbing hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Drag to reposition (coming soon)"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center shadow-lg">
                        <ListTodo className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold">Pending Tasks</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50 bg-background">
                          <DropdownMenuItem onClick={() => {
                            setTasksPanelVisible(false);
                            toast({ title: 'Tasks panel hidden' });
                          }}>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setIsTasksPanelCollapsed(!isTasksPanelCollapsed)}
                    className="h-10 w-10 flex-shrink-0 hover:bg-primary/10 transition-all duration-300"
                  >
                    {isTasksPanelCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </Button>
                </div>
              </CardHeader>
          {!isTasksPanelCollapsed && (
            <>
              <div className="border-b border-border/40 p-4 space-y-3 bg-gradient-to-r from-muted/30 to-muted/10">
                <div className="flex gap-3">
                  <Select value={taskFilterType} onValueChange={setTaskFilterType}>
                    <SelectTrigger className="h-9 text-sm flex-1 backdrop-blur-sm bg-background/80 hover:bg-background transition-colors">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/98">
                      <SelectItem value="all">
                        <div className="flex items-center justify-between w-full">
                          <span>All Types</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.all}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="approval">
                        <div className="flex items-center justify-between w-full">
                          <span>Approval</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.approval}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="review">
                        <div className="flex items-center justify-between w-full">
                          <span>Review</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.review}
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="action">
                        <div className="flex items-center justify-between w-full">
                          <span>Action</span>
                          <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                            {taskCounts.action}
                          </Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={taskSortBy} onValueChange={(value) => setTaskSortBy(value as 'priority' | 'due_date' | 'type')}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)]">
                {tasksLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div> : filteredAndSortedTasks.map(task => <Card key={task.id} className="glass-subtle hover:shadow-lg transition-all cursor-pointer group relative">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'default' : 'secondary'} className="text-xs">
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            Due: {task.due_date ? formatDistanceToNow(new Date(task.due_date), {
                        addSuffix: true
                      }) : 'No deadline'}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          {task.type === 'approval' ? (
                            <>
                              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => updateTaskStatus(task.id, 'completed')}>
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 h-8 text-xs font-medium hover:bg-destructive/10 transition-all" 
                                onClick={() => updateTaskStatus(task.id, 'cancelled')}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="flex-1 h-8 text-xs font-medium shadow-sm hover:shadow-md transition-all" 
                                onClick={() => {
                                  setTaskToDelete(task.id);
                                  setTaskAction('complete');
                                }}
                              >
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                Complete
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 h-8 text-xs font-medium hover:bg-destructive/10 transition-all" 
                                onClick={() => {
                                  setTaskToDelete(task.id);
                                  setTaskAction('dismiss');
                                }}
                              >
                                <X className="w-3.5 h-3.5 mr-1.5" />
                                Dismiss
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>)}
              </CardContent>
            </>
          )}
          </Card>
          )}
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
        tasksPanelVisible={tasksPanelVisible}
        onToggleAiPanel={() => {
          setAiPanelVisible(!aiPanelVisible);
          toast({ title: aiPanelVisible ? 'AI Assistant hidden' : 'AI Assistant shown' });
        }}
        onToggleTasksPanel={() => {
          setTasksPanelVisible(!tasksPanelVisible);
          toast({ title: tasksPanelVisible ? 'Tasks panel hidden' : 'Tasks panel shown' });
        }}
      />

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour 
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasSeenTour', 'true');
          }}
        />
      )}

      {/* Task Action Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {taskAction === 'complete' ? 'Complete Task' : 'Dismiss Task'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {taskAction === 'complete' 
                ? 'Are you sure you want to mark this task as completed? This action cannot be undone.'
                : 'Are you sure you want to dismiss this task? It will be removed from your list.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => taskToDelete && taskAction && handleTaskAction(taskToDelete, taskAction)}>
              {taskAction === 'complete' ? 'Complete' : 'Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AnimatedBackground>
};
const LandingPage: React.FC<LandingPageProps> = props => {
  return <LanguageProvider>
      <LandingPageContent {...props} />
    </LanguageProvider>;
};
export default LandingPage;