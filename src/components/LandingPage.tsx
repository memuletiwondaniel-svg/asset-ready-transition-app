import React, { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ClipboardList, KeyRound, Send, Mic, ImagePlus, Clock, FileText, CheckCircle, Home, Loader2, History, X, Sparkles, Upload, ChevronLeft, ChevronRight, Check, Filter, ArrowUpDown, MoreVertical, Eye, EyeOff, Maximize2, Minimize2, GripVertical, MessageSquare, ChevronDown, ChevronUp, Bot, Zap, BarChart3, Paperclip, Key, AlertTriangle, ListChecks, Gauge, Wrench, Users, Shield, Bookmark, Building2, CalendarCheck, GanttChart, Sliders, Activity, LayoutTemplate, Plug, Database, Archive, BookOpen, Flag, Compass, Container, MapPin, GitBranch, Timer, ShieldAlert, Webhook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useTypingEffect } from '@/hooks/useTypingEffect';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OnboardingTour } from '@/components/OnboardingTour';
import { DashboardWidgets } from '@/components/widgets/DashboardWidgets';
import { QuickActionsWidget } from '@/components/widgets/QuickActionsWidget';
import { WidgetCard } from '@/components/widgets/WidgetCard';
import { WidgetManagement } from '@/components/WidgetManagement';

import { ORSHChatDialog } from '@/components/widgets/ORSHChatDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useToast } from '@/components/ui/use-toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { processUserInput, getBlockedResponse } from '@/lib/security';
import { useFavoritePages } from '@/hooks/useFavoritePages';
import { useNewTaskCount } from '@/hooks/useNewTaskCount';
import { useTenantSetupStatus } from '@/hooks/useTenantSetupStatus';

const TenantSetupWizardLazy = lazy(() => import('./tenant-setup/TenantSetupWizard').then(m => ({ default: m.TenantSetupWizard })));

// Maps favorite paths to appropriate icons and colors matching page headers
const FAVORITE_ICON_MAP: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  // Main navigation pages (icons match sidebar & page headers)
  '/home': { icon: Home, color: 'bg-primary' },
  '/vcrs': { icon: Key, color: 'bg-blue-500' },
  '/projects': { icon: Building2, color: 'bg-purple-500' },
  '/project-management': { icon: Building2, color: 'bg-purple-500' },
  '/pssr': { icon: AlertTriangle, color: 'bg-orange-500' },
  '/my-tasks': { icon: CalendarCheck, color: 'bg-indigo-500' },
  '/my-backlog': { icon: ClipboardList, color: 'bg-indigo-500' },
  '/executive-dashboard': { icon: Gauge, color: 'bg-cyan-500' },
  '/or-maintenance': { icon: Wrench, color: 'bg-slate-500' },
  '/ask-orsh': { icon: MessageSquare, color: 'bg-violet-500' },
  '/operation-readiness': { icon: GanttChart, color: 'bg-emerald-500' },
  
  
  // Standalone pages
  '/users': { icon: Users, color: 'bg-blue-500' },
  '/user-management': { icon: Users, color: 'bg-blue-500' },
  '/settings': { icon: Settings, color: 'bg-zinc-500' },
  
  // Admin tools main dashboard
  '/admin-tools': { icon: Sliders, color: 'bg-slate-600' },
  
  // Admin sub-pages (using virtual paths for differentiation)
  '/admin-tools/users': { icon: Users, color: 'bg-blue-500' },
  '/admin-tools/projects': { icon: Building2, color: 'bg-purple-500' },
  '/admin-tools/handover-management': { icon: Key, color: 'bg-blue-500' },
  '/admin-tools/activity-log': { icon: Activity, color: 'bg-cyan-500' },
  '/admin-tools/ora-configuration': { icon: LayoutTemplate, color: 'bg-amber-500' },
  '/admin-tools/apis': { icon: Plug, color: 'bg-emerald-500' },
  '/admin-tools/sso': { icon: Shield, color: 'bg-indigo-500' },
  '/admin-tools/roles-permissions': { icon: Shield, color: 'bg-rose-500' },
  '/admin-tools/audit-logs': { icon: FileText, color: 'bg-slate-600' },
  '/admin-tools/api-keys': { icon: KeyRound, color: 'bg-violet-500' },
  '/admin-tools/data-export': { icon: Database, color: 'bg-teal-500' },
  '/admin-tools/audit-retention': { icon: Archive, color: 'bg-orange-500' },
  '/admin-tools/disaster-recovery': { icon: BookOpen, color: 'bg-blue-600' },
  '/admin-tools/feature-flags': { icon: Flag, color: 'bg-amber-500' },
  '/admin-tools/security-document': { icon: FileText, color: 'bg-slate-600' },
  '/admin-tools/platform-guide': { icon: BookOpen, color: 'bg-blue-600' },
  '/admin-tools/northstar-document': { icon: Compass, color: 'bg-amber-600' },
  '/admin-tools/incident-response': { icon: AlertTriangle, color: 'bg-red-600' },
  '/admin-tools/deployment-configs': { icon: Container, color: 'bg-cyan-600' },
  '/admin-tools/journey-maps': { icon: MapPin, color: 'bg-pink-600' },
  '/admin-tools/process-flows': { icon: GitBranch, color: 'bg-emerald-600' },
  '/admin-tools/session-timeout': { icon: Timer, color: 'bg-orange-500' },
  '/admin-tools/brute-force': { icon: ShieldAlert, color: 'bg-red-500' },
  '/admin-tools/webhook-security': { icon: Webhook, color: 'bg-teal-600' },
};

// Label-based fallback for stale localStorage entries
const LABEL_ICON_MAP: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  'User Management': { icon: Users, color: 'bg-blue-500' },
  'Users': { icon: Users, color: 'bg-blue-500' },
  'Activity Log': { icon: Activity, color: 'bg-cyan-500' },
  'API Management': { icon: Plug, color: 'bg-emerald-500' },
  'ORA Plan': { icon: LayoutTemplate, color: 'bg-amber-500' },
  'Manage ORA Plans': { icon: LayoutTemplate, color: 'bg-amber-500' },
  'SSO Configuration': { icon: Shield, color: 'bg-indigo-500' },
  'Role & Permissions': { icon: Shield, color: 'bg-rose-500' },
  'Audit Logs': { icon: FileText, color: 'bg-slate-600' },
  'API Keys': { icon: KeyRound, color: 'bg-violet-500' },
  'Data Export': { icon: Database, color: 'bg-teal-500' },
  'Audit Retention': { icon: Archive, color: 'bg-orange-500' },
  'Handover Management': { icon: Key, color: 'bg-blue-500' },
  'Manage Handover': { icon: Key, color: 'bg-blue-500' },
  'Projects': { icon: Building2, color: 'bg-purple-500' },
};

function getFavoriteIcon(path: string, label?: string) {
  return FAVORITE_ICON_MAP[path]?.icon || (label && LABEL_ICON_MAP[label]?.icon) || Bookmark;
}

function getFavoriteColor(path: string, label?: string) {
  return FAVORITE_ICON_MAP[path]?.color || (label && LABEL_ICON_MAP[label]?.color) || 'bg-primary';
}

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
  const { favorites, toggleFavorite } = useFavoritePages();
  const newTaskCount = useNewTaskCount();
  const navigate = useNavigate();
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
  const { needsSetup } = useTenantSetupStatus();
  const [tenantSetupOpen, setTenantSetupOpen] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);

  // Auto-show tenant setup wizard for unconfigured tenants
  React.useEffect(() => {
    if (needsSetup && !setupDismissed) setTenantSetupOpen(true);
  }, [needsSetup, setupDismissed]);

  // Context-aware placeholder questions
  const [contextPlaceholders, setContextPlaceholders] = useState<string[]>([
    "Ask Bob anything about ORSH...",
  ]);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: ctx } = await (supabase.from('ai_user_context' as any)
          .select('context_key, context_value')
          .eq('user_id', user.id) as any);
        if (!ctx || ctx.length === 0) return;

        const suggestions: string[] = [];
        const ctxMap: Record<string, any> = {};
        (ctx as any[]).forEach((c: any) => { ctxMap[c.context_key] = c.context_value; });

        if (ctxMap.last_active_pssr?.value) {
          suggestions.push(`Any updates on ${ctxMap.last_active_pssr.value} today?`);
        }
        if (ctxMap.last_active_project?.value) {
          suggestions.push(`What's the status of ${ctxMap.last_active_project.value}?`);
        }
        suggestions.push("What are my priority tasks today?");
        suggestions.push("What's the document readiness score today?");

        if (suggestions.length > 0) setContextPlaceholders(suggestions);
      } catch {}
    };
    loadContext();
  }, []);

  const { displayText: placeholderText, isTyping } = useTypingEffect({
    texts: contextPlaceholders,
    typingSpeed: 40,
    pauseBeforeNext: 2500,
    pauseBeforeType: 300,
  });

  // Widget grid configuration
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboardWidgetConfig');
    if (saved) {
      // Filter out removed widgets from saved config
      const parsed = JSON.parse(saved);
      return parsed.filter((w: WidgetConfig) => w.id === 'quick-actions');
    }
    return [{
      id: 'quick-actions',
      title: 'Quick Actions',
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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.goodMorning || 'Good morning';
    if (hour < 18) return t.goodAfternoon || 'Good afternoon';
    return t.goodEvening || 'Good evening';
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
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const fetchUserProfile = React.useCallback(async () => {
    setIsProfileLoading(true);
    try {
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
    } finally {
      setIsProfileLoading(false);
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
    
    // Security check - validate input before processing
    const securityCheck = processUserInput(message);
    
    if (!securityCheck.isValid) {
      if (securityCheck.blockedReason === 'rate_limited') {
        toast({
          title: 'Too many requests',
          description: 'Please wait a moment before trying again.',
          variant: 'destructive'
        });
        return;
      }
      
      if (securityCheck.blockedReason === 'injection_detected') {
        // Silently handle - show deflection response without revealing detection
        const userMessage = { role: 'user' as const, content: message };
        const blockedResponse = { role: 'assistant' as const, content: getBlockedResponse() };
        setMessages(prev => [...prev, userMessage, blockedResponse]);
        setUserInput('');
        return;
      }
    }
    
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
      content: securityCheck.sanitizedInput || `Analyzing ${imageUrls.length} image${imageUrls.length > 1 ? 's' : ''} for safety review...`,
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
    <div className="flex-1 overflow-y-auto">
      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 relative">
          <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 transition-all duration-500 relative z-10">
            {/* Spacer for vertical centering */}
            <div className="flex-1 min-h-[5vh] sm:min-h-[10vh] md:min-h-[15vh]" />
            
            {/* Bob AI Hero Section - Centered */}
            <Card className="w-full max-w-3xl glass-card overflow-hidden animate-fade-in border border-border/40 shadow-xl rounded-2xl sm:rounded-3xl">
              <div className="p-6 sm:p-10 md:p-16 min-h-[160px] sm:min-h-[200px] md:min-h-[280px]">
                <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
                  {/* Greeting */}
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {isProfileLoading ? (
                      <span className="inline-block animate-pulse bg-muted rounded h-8 w-48" />
                    ) : (
                      <>{getGreeting()}, {userProfile?.full_name?.split(' ')[0] || 'User'}!</>
                    )}
                  </h1>
                  <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
                    {t.askBobAnything || 'Ask Bob anything about ORSH'}
                  </p>
                  
                  {/* Bob Input Field */}
                  <div className="w-full max-w-xl">
                    <div className="relative flex items-center gap-2 bg-background/50 border border-border/50 rounded-2xl p-2 shadow-inner">
                      <input
                        type="text"
                        placeholder={placeholderText}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && userInput.trim()) {
                            setInitialPrompt(userInput);
                            setChatOpen(true);
                            setUserInput('');
                          }
                        }}
                        className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm placeholder:text-muted-foreground"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-muted/50"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-muted/50"
                        onClick={() => {
                          if (isListening) {
                            stopListening();
                          } else {
                            startListening((transcript) => {
                              setUserInput(transcript);
                            });
                          }
                        }}
                      >
                        <Mic className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        size="icon"
                        className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 hover:opacity-90"
                        onClick={() => {
                          if (userInput.trim()) {
                            setInitialPrompt(userInput);
                            setChatOpen(true);
                            setUserInput('');
                          } else {
                            setChatOpen(true);
                          }
                        }}
                      >
                        <Send className="h-4 w-4 text-white" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>


            {/* Favorites / Quick Actions Section */}
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              {favorites.length > 0 ? (
                <>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-center mb-4">
                    Favorites
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {favorites.map((fav) => {
                      const IconComponent = getFavoriteIcon(fav.path, fav.label);
                      const colorClass = getFavoriteColor(fav.path, fav.label);
                      return (
                        <div
                          key={fav.path}
                          className="group/fav relative flex flex-col items-center gap-2 sm:gap-2.5 p-4 sm:p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 min-w-[88px] sm:min-w-[100px] min-h-[72px] touch-manipulation"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(fav.path, fav.label);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/fav:opacity-100 transition-opacity duration-150 hover:scale-110 z-20"
                            title="Remove from favorites"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (fav.path.startsWith('/admin-tools/')) {
                                const subView = fav.path.replace('/admin-tools/', '');
                                navigate('/admin-tools', { state: { activeView: subView, navKey: Date.now() } });
                              } else {
                                navigate(fav.path);
                              }
                            }}
                            className="flex flex-col items-center gap-2.5 w-full"
                          >
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${colorClass} transition-transform duration-200 group-hover/fav:scale-110`}>
                              <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            {fav.path === '/my-tasks' && newTaskCount > 0 && (
                              <span className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground z-10">
                                {newTaskCount}
                              </span>
                            )}
                            <span className="text-[10px] sm:text-xs font-medium text-foreground/80 group-hover/fav:text-foreground transition-colors line-clamp-1 max-w-[80px] sm:max-w-[100px] text-center">
                              {fav.label}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-center mb-4">{t.quickActions || 'Quick Actions'}</h2>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    <button
                      onClick={() => onNavigate('pssr')}
                      className="group flex flex-col items-center gap-2 sm:gap-2.5 p-4 sm:p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 min-w-[80px] sm:min-w-[100px] min-h-[72px] touch-manipulation"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-primary transition-transform duration-200 group-hover:scale-110">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{t.createAPSSR || 'Create PSSR'}</span>
                    </button>
                    <button
                      onClick={() => onNavigate('pssr')}
                      className="group flex flex-col items-center gap-2 sm:gap-2.5 p-4 sm:p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 min-w-[80px] sm:min-w-[100px] min-h-[72px] touch-manipulation"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-emerald-500 transition-transform duration-200 group-hover:scale-110">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{t.approveAPSSR || 'Approve PSSR'}</span>
                    </button>
                    <button
                      onClick={() => onNavigate('projects')}
                      className="group flex flex-col items-center gap-2 sm:gap-2.5 p-4 sm:p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 min-w-[80px] sm:min-w-[100px] min-h-[72px] touch-manipulation"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-violet-500 transition-transform duration-200 group-hover:scale-110">
                        <Key className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{t.addNewProject || 'Add Project'}</span>
                    </button>
                    <button
                      onClick={() => onNavigate('my-tasks')}
                      className="group flex flex-col items-center gap-2 sm:gap-2.5 p-4 sm:p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 min-w-[80px] sm:min-w-[100px] min-h-[72px] touch-manipulation"
                    >
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-amber-500 transition-transform duration-200 group-hover:scale-110">
                        <ListChecks className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">{t.myTasks || 'My Tasks'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Bottom spacer for vertical centering */}
            <div className="flex-1 min-h-[5vh]" />
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
      <ORSHChatDialog open={chatOpen} onOpenChange={(v) => { setChatOpen(v); if (!v) setInitialPrompt(''); }} initialMessage={initialPrompt} />

      {/* Tenant Setup Wizard — auto-shows for new tenants */}
      <Suspense fallback={null}>
        {tenantSetupOpen && (
          <TenantSetupWizardLazy
            open={tenantSetupOpen}
            onOpenChange={(open) => {
              setTenantSetupOpen(open);
              if (!open) setSetupDismissed(true);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = props => {
  return <LandingPageContent {...props} />;
};

export default LandingPage;
