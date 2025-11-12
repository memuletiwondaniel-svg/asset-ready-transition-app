import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Clock, FileText, CheckCircle, Home, Loader2, History, X, Sparkles, Upload, ListChecks, ChevronLeft, ChevronRight, Check, Filter, ArrowUpDown, MoreVertical, Eye, EyeOff, Maximize2, Minimize2, GripVertical, Search, Plus, Trash2, Link2, AlertCircle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
import { DraggableTask } from '@/components/DraggableTask';
import { ORSHChatDialog } from '@/components/widgets/ORSHChatDialog';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useUserTasks } from '@/hooks/useUserTasks';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
      {/* Clone children and pass drag attributes only to header */}
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
  const [isTasksPanelCollapsed, setIsTasksPanelCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [taskSortBy, setTaskSortBy] = useState<'priority' | 'due_date' | 'type'>('priority');
  const [taskFilterType, setTaskFilterType] = useState<string>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskAction, setTaskAction] = useState<'complete' | 'dismiss' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWidgetManagement, setShowWidgetManagement] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [showQuickTaskDialog, setShowQuickTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskType, setNewTaskType] = useState('action');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState<string>('');
  const [dependsOnTaskId, setDependsOnTaskId] = useState<string>('');
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
  const [tasksPanelExpanded, setTasksPanelExpanded] = useState(() => {
    const saved = localStorage.getItem('tasksPanelExpanded');
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
    localStorage.setItem('tasksPanelVisible', JSON.stringify(tasksPanelVisible));
  }, [tasksPanelVisible]);
  React.useEffect(() => {
    localStorage.setItem('tasksPanelExpanded', JSON.stringify(tasksPanelExpanded));
  }, [tasksPanelExpanded]);
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
    const {
      active,
      over
    } = event;
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
    setTasksPanelVisible(true);
  };
  const hasHiddenWidgets = widgets.some(w => !w.isVisible);

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
    dependencies,
    loading: tasksLoading,
    updateTaskStatus,
    deleteTask,
    reorderTasks,
    addDependency,
    removeDependency,
    bulkUpdateStatus,
    bulkDelete
  } = useUserTasks();

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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data: profile
      } = await supabase.from('profiles').select('full_name, position, avatar_url').eq('user_id', user.id).single();
      if (profile) {
        // Construct full avatar URL if needed
        let avatarUrl = profile.avatar_url;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
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
        const {
          error: uploadError
        } = await supabase.storage.from('ai-query-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('ai-query-images').getPublicUrl(fileName);
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
  const handleCreateQuickTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      const {
        error
      } = await supabase.from('user_tasks').insert({
        title: newTaskTitle,
        description: newTaskDescription || null,
        type: newTaskType,
        priority: newTaskPriority,
        due_date: newTaskDueDate || null,
        status: 'pending',
        user_id: user.id
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Task created successfully"
      });

      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskType('action');
      setNewTaskPriority('Medium');
      setNewTaskDueDate('');
      setShowQuickTaskDialog(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    }
  };
  const handleTaskDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const oldIndex = filteredAndSortedTasks.findIndex(t => t.id === active.id);
      const newIndex = filteredAndSortedTasks.findIndex(t => t.id === over.id);
      const reordered = arrayMove(filteredAndSortedTasks, oldIndex, newIndex);
      reorderTasks(reordered);
    }
  };
  const handleTaskSelect = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };
  const handleBulkComplete = async () => {
    await bulkUpdateStatus(Array.from(selectedTasks), 'completed');
    setSelectedTasks(new Set());
  };
  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) {
      await bulkDelete(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    }
  };
  const handleManageDependencies = (taskId: string) => {
    setDependencyTaskId(taskId);
    setShowDependencyDialog(true);
  };
  const handleAddDependency = async () => {
    if (dependencyTaskId && dependsOnTaskId) {
      await addDependency(dependencyTaskId, dependsOnTaskId);
      setShowDependencyDialog(false);
      setDependencyTaskId('');
      setDependsOnTaskId('');
    }
  };

  // Calculate task counts by type and detect overdue tasks
  const taskCounts = React.useMemo(() => {
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
    return {
      all: tasks.length,
      approval: tasks.filter(t => t.type === 'approval').length,
      review: tasks.filter(t => t.type === 'review').length,
      action: tasks.filter(t => t.type === 'action').length,
      overdue: overdueTasks.length
    };
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks;

    // Filter by search query
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(task => task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query) || task.type.toLowerCase().includes(query) || task.priority.toLowerCase().includes(query));
    }

    // Filter by type
    if (taskFilterType !== 'all') {
      filtered = filtered.filter(task => task.type === taskFilterType);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (taskSortBy === 'priority') {
        const priorityOrder = {
          'High': 0,
          'Medium': 1,
          'Low': 2
        };
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
  }, [tasks, taskFilterType, taskSortBy, taskSearchQuery]);
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
        <OrshSidebar userName={userProfile?.full_name || 'User'} userTitle={userProfile?.position || 'Team Member'} userAvatar={userProfile?.avatar_url || ''} language={language} onLanguageChange={setLanguage} onNavigate={onNavigate} onShowWidgets={() => setShowWidgetManagement(true)} onShowOnboarding={() => setShowOnboarding(true)} showWidgets={showWidgetManagement} currentPage="home" searchHistory={searchHistory} onSearchHistoryClick={item => {
        setUserInput(item);
        setShowHistory(false);
      }} showSearchHistory={showHistory} onToggleSearchHistory={() => setShowHistory(!showHistory)} />

        {/* Main Content Area */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          <div className={`flex-1 flex flex-col gap-6 overflow-hidden transition-all duration-500 ${tasksPanelExpanded ? 'hidden' : ''}`}>
            {/* Welcome User Banner - Ask ORSH AI */}
            <Card className="glass-card overflow-hidden animate-fade-in border-2 border-primary/20 shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
                <div className={`${welcomeBannerCollapsed ? 'p-3' : 'p-6'} transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {!welcomeBannerCollapsed}
                        <div>
                          <h2 className={`font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent ${welcomeBannerCollapsed ? 'text-lg' : 'text-2xl'} transition-all duration-300`}>
                            {getGreeting()}, {userProfile?.full_name || 'User'}!
                          </h2>
                          {!welcomeBannerCollapsed && <p className="text-sm text-muted-foreground mt-1">
                              How can ORSH AI assist you today?
                            </p>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setWelcomeBannerCollapsed(!welcomeBannerCollapsed)} className="h-8 w-8 hover:bg-primary/10 flex-shrink-0">
                      {welcomeBannerCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {!welcomeBannerCollapsed && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 animate-fade-in">
                      <Button variant="outline" onClick={() => {
                    setInitialPrompt('How can I help you today?');
                    setChatOpen(true);
                  }} className="w-full justify-start gap-3 h-auto py-4 bg-background/80 backdrop-blur-sm hover:bg-primary/10 border-border/40 transition-all hover:scale-105">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold">Ask AI</p>
                          <p className="text-xs text-muted-foreground">Get instant answers</p>
                        </div>
                      </Button>
                      
                      <Button variant="outline" onClick={() => {
                    setInitialPrompt('Summarize my recent PSSR');
                    setChatOpen(true);
                  }} className="w-full justify-start gap-3 h-auto py-4 bg-background/80 backdrop-blur-sm hover:bg-primary/10 border-border/40 transition-all hover:scale-105">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold">Summarize PSSR</p>
                          <p className="text-xs text-muted-foreground">Quick overview</p>
                        </div>
                      </Button>
                      
                      <Button variant="outline" onClick={() => {
                    setInitialPrompt('Review my checklist items');
                    setChatOpen(true);
                  }} className="w-full justify-start gap-3 h-auto py-4 bg-background/80 backdrop-blur-sm hover:bg-primary/10 border-border/40 transition-all hover:scale-105">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold">Review Checklist</p>
                          <p className="text-xs text-muted-foreground">Check progress</p>
                        </div>
                      </Button>
                    </div>}
                </div>
              </div>
            </Card>


            {/* Widgets Section with Drag and Drop */}
            {!aiPanelExpanded && <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">Dashboard Widgets</h2>
                  <div className="flex gap-2">
                    {!aiPanelVisible && <Button size="sm" variant="outline" onClick={() => {
                  setAiPanelVisible(true);
                  toast({
                    title: 'AI Assistant shown'
                  });
                }} className="text-xs">
                        Show AI Assistant
                      </Button>}
                    {!tasksPanelVisible && <Button size="sm" variant="outline" onClick={() => {
                  setTasksPanelVisible(true);
                  toast({
                    title: 'Tasks panel shown'
                  });
                }} className="text-xs">
                        Show Tasks Panel
                      </Button>}
                    {hasHiddenWidgets && <Button size="sm" variant="outline" onClick={handleShowAllWidgets} className="text-xs">
                        Show All Widgets
                      </Button>}
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 gap-4 animate-smooth-in stagger-2" style={{
                  height: messages.length > 0 ? '48%' : '68%'
                }}>
                      {widgets.filter(w => w.isVisible).map(widget => <SortableWidgetWrapper key={widget.id} id={widget.id} isExpanded={widget.isExpanded}>
                          <WidgetCard title={widget.title} isExpanded={widget.isExpanded} isVisible={widget.isVisible} onToggleVisibility={() => handleToggleVisibility(widget.id)} onToggleExpand={() => handleToggleExpand(widget.id)}>
                            {widget.id === 'quick-actions' && <QuickActionsWidget onActionClick={setUserInput} />}
                            {widget.id === 'workspaces' && <WorkspacesWidget onNavigate={onNavigate} />}
                            {widget.id === 'recent-activity' && <RecentActivityWidget />}
                          </WidgetCard>
                        </SortableWidgetWrapper>)}
                    </div>
                  </SortableContext>
                </DndContext>
              </>}
          </div>

          {/* Tasks Panel */}
          {tasksPanelVisible && !tasksPanelExpanded && <Card className={`glass-panel shadow-xl transition-all duration-500 animate-smooth-in stagger-3 group ${isTasksPanelCollapsed ? 'w-16' : 'w-80'}`} data-tour="tasks">
              <CardHeader className="border-b border-border/40 py-4">
                <div className="flex items-center justify-between">
                  {!isTasksPanelCollapsed && <div className="flex items-center gap-3 flex-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 cursor-grab active:cursor-grabbing hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title="Drag to reposition (coming soon)">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg flex-shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                        {/* Animated background shine */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <ListChecks className="w-6 h-6 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <CardTitle className="text-xl font-bold whitespace-nowrap">My Tasks</CardTitle>
                        <div className="flex items-center gap-1.5">
                          {taskCounts.overdue > 0 ? <Badge variant="destructive" className="animate-pulse font-semibold px-2 py-0.5">
                              {taskCounts.overdue} Overdue
                            </Badge> : tasks.length > 0 && <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold px-2 py-0.5">
                              {tasks.length}
                            </Badge>}
                          {taskCounts.approval > 0 && <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {taskCounts.approval} Approval
                            </Badge>}
                          {taskCounts.review > 0 && <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {taskCounts.review} Review
                            </Badge>}
                          {taskCounts.action > 0 && <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {taskCounts.action} Action
                            </Badge>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setShowQuickTaskDialog(true)} className="h-8 w-8 p-0 hover:bg-primary/10 flex-shrink-0" title="Quick add task">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50 bg-background">
                          <DropdownMenuItem onClick={() => {
                      setTasksPanelExpanded(!tasksPanelExpanded);
                      toast({
                        title: tasksPanelExpanded ? 'Tasks panel restored' : 'Tasks panel expanded'
                      });
                    }}>
                            {tasksPanelExpanded ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                            {tasksPanelExpanded ? 'Restore' : 'Expand'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                      setTasksPanelVisible(false);
                      toast({
                        title: 'Tasks panel hidden'
                      });
                    }}>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>}
                  <Button size="icon" variant="ghost" onClick={() => setIsTasksPanelCollapsed(!isTasksPanelCollapsed)} className="h-10 w-10 flex-shrink-0 hover:bg-primary/10 transition-all duration-300">
                    {isTasksPanelCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </Button>
                </div>
              </CardHeader>
          {!isTasksPanelCollapsed && <>
              <div className="border-b border-border/40 p-4 space-y-3 bg-gradient-to-r from-muted/30 to-muted/10">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search tasks..." value={taskSearchQuery} onChange={e => setTaskSearchQuery(e.target.value)} className="pl-9 h-9 text-sm backdrop-blur-sm bg-background/80 hover:bg-background transition-colors" />
                  {taskSearchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setTaskSearchQuery('')}>
                      <X className="w-3 h-3" />
                    </Button>}
                </div>
                <div className="flex gap-3">
                  <Select value={taskFilterType} onValueChange={setTaskFilterType}>
                    <SelectTrigger className="h-9 text-sm flex-1 backdrop-blur-sm bg-background/80 hover:bg-background transition-colors">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/98">
                      <SelectItem value="all">
                        <div className="flex items-center justify-between w-full">
                          <span>All</span>
                          {taskCounts.all > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.all}
                            </Badge>}
                        </div>
                      </SelectItem>
                      <SelectItem value="approval">
                        <div className="flex items-center justify-between w-full">
                          <span>Approval</span>
                          {taskCounts.approval > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.approval}
                            </Badge>}
                        </div>
                      </SelectItem>
                      <SelectItem value="review">
                        <div className="flex items-center justify-between w-full">
                          <span>Review</span>
                          {taskCounts.review > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.review}
                            </Badge>}
                        </div>
                      </SelectItem>
                      <SelectItem value="action">
                        <div className="flex items-center justify-between w-full">
                          <span>Action</span>
                          {taskCounts.action > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.action}
                            </Badge>}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={taskSortBy} onValueChange={value => setTaskSortBy(value as 'priority' | 'due_date' | 'type')}>
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
              
              {/* Bulk Actions Toolbar */}
              {selectedTasks.size > 0 && <div className="border-b border-border/40 p-3 bg-primary/5 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedTasks.size === filteredAndSortedTasks.length} onCheckedChange={handleSelectAll} />
                    <span className="text-sm font-medium">
                      {selectedTasks.size} task(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleBulkComplete} className="h-8 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete All
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleBulkDelete} className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedTasks(new Set())} className="h-8 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>}

              <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)]">
                {tasksLoading ? <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div> : filteredAndSortedTasks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No tasks found</p>
                  </div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                    <SortableContext items={filteredAndSortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {filteredAndSortedTasks.map(task => <DraggableTask key={task.id} task={task} isSelected={selectedTasks.has(task.id)} onSelect={handleTaskSelect} onComplete={id => {
                      setTaskToDelete(id);
                      setTaskAction('complete');
                    }} onDismiss={id => {
                      setTaskToDelete(id);
                      setTaskAction('dismiss');
                    }} onDelete={deleteTask} onManageDependencies={handleManageDependencies} allTasks={tasks} />)}
                      </div>
                    </SortableContext>
                  </DndContext>}
              </CardContent>
            </>}
          </Card>}

          {/* Expanded Tasks Panel - Full Width */}
          {tasksPanelVisible && tasksPanelExpanded && <div className="flex-1 animate-fade-in">
            <Card className="glass-panel shadow-xl h-full flex flex-col" data-tour="tasks-expanded">
              <CardHeader className="border-b border-border/40 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg flex-shrink-0 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <ListChecks className="w-6 h-6 text-white relative z-10" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <CardTitle className="text-2xl font-bold whitespace-nowrap">My Tasks</CardTitle>
                      <div className="flex items-center gap-1.5">
                        {taskCounts.overdue > 0 ? <Badge variant="destructive" className="animate-pulse font-semibold px-2 py-0.5">
                            {taskCounts.overdue} Overdue
                          </Badge> : tasks.length > 0 && <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold px-2 py-0.5">
                            {tasks.length}
                          </Badge>}
                        {taskCounts.approval > 0 && <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {taskCounts.approval} Approval
                          </Badge>}
                        {taskCounts.review > 0 && <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {taskCounts.review} Review
                          </Badge>}
                        {taskCounts.action > 0 && <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {taskCounts.action} Action
                          </Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setShowQuickTaskDialog(true)} className="h-8 w-8 p-0 hover:bg-primary/10 flex-shrink-0" title="Quick add task">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50 bg-background">
                        <DropdownMenuItem onClick={() => {
                    setTasksPanelExpanded(false);
                    toast({
                      title: 'Tasks panel restored'
                    });
                  }}>
                          <Minimize2 className="w-4 h-4 mr-2" />
                          Restore
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                    setTasksPanelVisible(false);
                    setTasksPanelExpanded(false);
                    toast({
                      title: 'Tasks panel hidden'
                    });
                  }}>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <div className="border-b border-border/40 p-4 space-y-3 bg-gradient-to-r from-muted/30 to-muted/10">
                <div className="flex gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search tasks..." value={taskSearchQuery} onChange={e => setTaskSearchQuery(e.target.value)} className="pl-9 h-9 text-sm backdrop-blur-sm bg-background/80 hover:bg-background transition-colors" />
                    {taskSearchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setTaskSearchQuery('')}>
                        <X className="w-3 h-3" />
                      </Button>}
                  </div>

                  <Select value={taskFilterType} onValueChange={setTaskFilterType}>
                    <SelectTrigger className="h-9 text-sm w-48 backdrop-blur-sm bg-background/80 hover:bg-background transition-colors">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/98">
                      <SelectItem value="all">
                        <div className="flex items-center justify-between w-full">
                          <span>All</span>
                          {taskCounts.all > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.all}
                            </Badge>}
                        </div>
                      </SelectItem>
                      <SelectItem value="approval">
                        <div className="flex items-center justify-between w-full">
                          <span>Approval</span>
                          {taskCounts.approval > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.approval}
                            </Badge>}
                        </div>
                      </SelectItem>
                      <SelectItem value="review">
                        <div className="flex items-center justify-between w-full">
                          <span>Review</span>
                          {taskCounts.review > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.review}
                            </Badge>}
                        </div>
                      </SelectItem>
                      <SelectItem value="action">
                        <div className="flex items-center justify-between w-full">
                          <span>Action</span>
                          {taskCounts.action > 0 && <Badge variant="secondary" className="ml-3 text-[10px] h-5 px-2">
                              {taskCounts.action}
                            </Badge>}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={taskSortBy} onValueChange={value => setTaskSortBy(value as 'priority' | 'due_date' | 'type')}>
                    <SelectTrigger className="h-9 text-sm w-40">
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

              {/* Bulk Actions Toolbar */}
              {selectedTasks.size > 0 && <div className="border-b border-border/40 p-3 bg-primary/5 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedTasks.size === filteredAndSortedTasks.length} onCheckedChange={handleSelectAll} />
                    <span className="text-sm font-medium">
                      {selectedTasks.size} task(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleBulkComplete} className="h-8 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete All
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleBulkDelete} className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedTasks(new Set())} className="h-8 text-xs">
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>}

              <CardContent className="flex-1 p-6 overflow-y-auto">
                {tasksLoading ? <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div> : filteredAndSortedTasks.length === 0 ? <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No tasks found</p>
                  </div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                    <SortableContext items={filteredAndSortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAndSortedTasks.map(task => <DraggableTask key={task.id} task={task} isSelected={selectedTasks.has(task.id)} onSelect={handleTaskSelect} onComplete={id => {
                      setTaskToDelete(id);
                      setTaskAction('complete');
                    }} onDismiss={id => {
                      setTaskToDelete(id);
                      setTaskAction('dismiss');
                    }} onDelete={deleteTask} onManageDependencies={handleManageDependencies} allTasks={tasks} />)}
                      </div>
                    </SortableContext>
                  </DndContext>}
              </CardContent>
            </Card>
          </div>}
        </div>
      </div>

      {/* Widget Management Dialog */}
      <WidgetManagement open={showWidgetManagement} onOpenChange={setShowWidgetManagement} widgets={widgets} onToggleWidget={handleToggleVisibility} onResetWidgets={handleResetWidgets} aiPanelVisible={aiPanelVisible} tasksPanelVisible={tasksPanelVisible} onToggleAiPanel={() => {
      setAiPanelVisible(!aiPanelVisible);
      toast({
        title: aiPanelVisible ? 'AI Assistant hidden' : 'AI Assistant shown'
      });
    }} onToggleTasksPanel={() => {
      setTasksPanelVisible(!tasksPanelVisible);
      toast({
        title: tasksPanelVisible ? 'Tasks panel hidden' : 'Tasks panel shown'
      });
    }} />

      {/* Onboarding Tour */}
      {showOnboarding && <OnboardingTour onComplete={() => {
      setShowOnboarding(false);
      localStorage.setItem('hasSeenTour', 'true');
    }} />}

      {/* Task Action Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={open => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {taskAction === 'complete' ? 'Complete Task' : 'Dismiss Task'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {taskAction === 'complete' ? 'Are you sure you want to mark this task as completed? This action cannot be undone.' : 'Are you sure you want to dismiss this task? It will be removed from your list.'}
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

      {/* Quick Task Creation Dialog */}
      <Dialog open={showQuickTaskDialog} onOpenChange={setShowQuickTaskDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Quick Task</DialogTitle>
            <DialogDescription>
              Add a new task to your list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input id="task-title" placeholder="Enter task title" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" placeholder="Enter task description (optional)" value={newTaskDescription} onChange={e => setNewTaskDescription(e.target.value)} className="resize-none" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-type">Type</Label>
                <Select value={newTaskType} onValueChange={setNewTaskType}>
                  <SelectTrigger id="task-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="action">Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input id="task-due-date" type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuickTask}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dependency Management Dialog */}
      <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Task Dependencies</DialogTitle>
            <DialogDescription>
              Set which task this task depends on (is blocked by)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>This task depends on:</Label>
              <Select value={dependsOnTaskId} onValueChange={setDependsOnTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.filter(t => t.id !== dependencyTaskId).map(task => <SelectItem key={task.id} value={task.id}>
                        {task.title} ({task.priority})
                      </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            {dependencyTaskId && <div className="space-y-2">
                <Label>Current Dependencies:</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {dependencies.filter(dep => dep.task_id === dependencyTaskId).map(dep => {
                const depTask = tasks.find(t => t.id === dep.depends_on_task_id);
                return depTask ? <div key={dep.id} className="flex items-center justify-between text-sm">
                          <span>{depTask.title}</span>
                          <Button size="sm" variant="ghost" onClick={() => removeDependency(dep.task_id, dep.depends_on_task_id)} className="h-6 w-6 p-0 text-destructive">
                            <X className="h-3 w-3" />
                          </Button>
                        </div> : null;
              })}
                  {dependencies.filter(dep => dep.task_id === dependencyTaskId).length === 0 && <p className="text-sm text-muted-foreground text-center">No dependencies yet</p>}
                </div>
              </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setShowDependencyDialog(false);
            setDependsOnTaskId('');
          }}>
              Cancel
            </Button>
            <Button onClick={handleAddDependency} disabled={!dependsOnTaskId}>
              Add Dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ORSH Chat Dialog */}
      <ORSHChatDialog open={chatOpen} onOpenChange={setChatOpen} initialMessage={initialPrompt} />
    </AnimatedBackground>;
};
const LandingPage: React.FC<LandingPageProps> = props => {
  return <LanguageProvider>
      <LandingPageContent {...props} />
    </LanguageProvider>;
};
export default LandingPage;