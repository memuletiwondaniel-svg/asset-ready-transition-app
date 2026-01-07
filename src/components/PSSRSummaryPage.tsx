import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useWidgetConfigs } from '@/hooks/useWidgetConfigs';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, ClipboardList, AlertTriangle, CheckCircle, Clock, Settings, Home, FileText, FolderOpen } from 'lucide-react';
import { PSSRQuickStatsBar } from './widgets/PSSRQuickStatsBar';

import { PSSRReviewsWidget } from './widgets/PSSRReviewsWidget';
import PSSRFilters from './PSSRFilters';
import DraggablePSSRCard from './DraggablePSSRCard';
import PSSRTableView from './PSSRTableView';
import PSSRKanbanBoard from './PSSRKanbanBoard';
import PSSRTimelineView from './PSSRTimelineView';
import PSSRActivityFeed from './PSSRActivityFeed';
import PSSRDateRangeFilter, { DateRangeFilter } from './PSSRDateRangeFilter';
import PSSRAdvancedSearch from './PSSRAdvancedSearch';
import CreatePSSRIntroModal from './CreatePSSRIntroModal';
import CreatePSSRWizard from './pssr/CreatePSSRWizard';
import PSSRDashboard from './PSSRDashboard';
import { OrshSidebar } from './OrshSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbEllipsis } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
interface PSSRSummaryPageProps {
  onBack: () => void;
}
interface PSSR {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  status: string;
  priority: string;
  progress: number;
  created: string;
  pssrLead: string;
  pssrLeadAvatar: string;
  teamStatus: string;
  pendingApprovals: number;
  completedDate: string | null;
  riskLevel: string;
  nextReview: string | null;
  teamMembers: number;
  lastActivity: string;
  location: string;
  tier: 1 | 2 | 3;
}
const PSSRSummaryPage: React.FC<PSSRSummaryPageProps> = ({
  onBack
}) => {
  const navigate = useNavigate();
  
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access
  
  // Breadcrumb context
  const { buildBreadcrumbsFromPath } = useBreadcrumb();

  const {
    widgets,
    loading: widgetsLoading,
    updateWidgetPosition,
    toggleWidgetVisibility,
    updateWidgetSettings,
    reorderWidgets
  } = useWidgetConfigs();
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details' | 'category-items' | 'manage-checklist'>('list');
  const [viewMode, setViewMode] = useState<'card' | 'table' | 'kanban' | 'timeline'>('card');
  const [showCreateIntro, setShowCreateIntro] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pssrOrder, setPssrOrder] = useState<string[]>([]);
  const [pinnedPSSRs, setPinnedPSSRs] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [dateRangeFilters, setDateRangeFilters] = useState<DateRangeFilter>({});
  const [showWidgetManagement, setShowWidgetManagement] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);

  // Fetch current user profile
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    position: string;
    avatar_url: string;
  } | null>(null);

  React.useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, position, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
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
    };
    fetchUserProfile();
  }, []);

  // Derive widget states from persisted configs
  const widgetVisibility = useMemo(() => {
    const stats = widgets.find(w => w.widget_type === 'pssr-statistics');
    const quick = widgets.find(w => w.widget_type === 'pssr-quick-actions');
    const recent = widgets.find(w => w.widget_type === 'pssr-recent-activities');
    const reviews = widgets.find(w => w.widget_type === 'pssr-reviews');
    return {
      statistics: stats?.is_visible ?? true,
      quickActions: quick?.is_visible ?? true,
      recentActivities: recent?.is_visible ?? true,
      reviews: reviews?.is_visible ?? true
    };
  }, [widgets]);
  const widgetExpanded = useMemo(() => {
    const stats = widgets.find(w => w.widget_type === 'pssr-statistics');
    const quick = widgets.find(w => w.widget_type === 'pssr-quick-actions');
    const recent = widgets.find(w => w.widget_type === 'pssr-recent-activities');
    const reviews = widgets.find(w => w.widget_type === 'pssr-reviews');
    return {
      statistics: stats?.settings?.expanded ?? false,
      quickActions: quick?.settings?.expanded ?? false,
      recentActivities: recent?.settings?.expanded ?? false,
      reviews: reviews?.settings?.expanded ?? true
    };
  }, [widgets]);
  const widgetOrder = useMemo(() => {
    const sorted = [...widgets].filter(w => ['pssr-statistics', 'pssr-quick-actions', 'pssr-recent-activities', 'pssr-reviews'].includes(w.widget_type)).sort((a, b) => a.position - b.position).map(w => {
      if (w.widget_type === 'pssr-statistics') return 'statistics';
      if (w.widget_type === 'pssr-quick-actions') return 'quickActions';
      if (w.widget_type === 'pssr-recent-activities') return 'recentActivities';
      if (w.widget_type === 'pssr-reviews') return 'reviews';
      return '';
    }).filter(Boolean);
    const defaultOrder: Array<'statistics' | 'quickActions' | 'recentActivities' | 'reviews'> = ['statistics', 'quickActions', 'recentActivities', 'reviews'];
    return sorted.length > 0 ? sorted as Array<'statistics' | 'quickActions' | 'recentActivities' | 'reviews'> : defaultOrder;
  }, [widgets]);

  // Local, optimistic order state for immediate visual reordering
  const [widgetOrderLocal, setWidgetOrderLocal] = useState<Array<'statistics' | 'quickActions' | 'recentActivities' | 'reviews'>>(widgetOrder);
  useEffect(() => {
    setWidgetOrderLocal(widgetOrder);
  }, [widgetOrder]);
  const widgetSensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleWidgetDragStart = (event: DragStartEvent) => {
    setActiveWidgetId(event.active.id as string);
  };
  const handleWidgetDragEnd = async (event: DragEndEvent) => {
    setActiveWidgetId(null);
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgetOrderLocal.indexOf(active.id as any);
    const newIndex = widgetOrderLocal.indexOf(over.id as any);
    const newOrder = arrayMove(widgetOrderLocal, oldIndex, newIndex);

    // Optimistically update UI
    setWidgetOrderLocal(newOrder);

    // Update positions in Supabase
    const typeMap: Record<string, string> = {
      statistics: 'pssr-statistics',
      quickActions: 'pssr-quick-actions',
      recentActivities: 'pssr-recent-activities',
      reviews: 'pssr-reviews'
    };
    const reorderedConfigs = newOrder.map((widgetKey, index) => {
      const widget = widgets.find(w => w.widget_type === typeMap[widgetKey]);
      return widget ? {
        ...widget,
        position: index
      } : null;
    }).filter(Boolean);
    if (reorderedConfigs.length > 0) {
      await reorderWidgets(reorderedConfigs as any);
    }
  };
  const handleToggleWidgetVisibility = async (widgetKey: 'statistics' | 'quickActions' | 'recentActivities' | 'reviews') => {
    const typeMap: Record<string, string> = {
      statistics: 'pssr-statistics',
      quickActions: 'pssr-quick-actions',
      recentActivities: 'pssr-recent-activities',
      reviews: 'pssr-reviews'
    };
    const widget = widgets.find(w => w.widget_type === typeMap[widgetKey]);
    if (widget) {
      await toggleWidgetVisibility(widget.id);
    }
  };
  const handleToggleWidgetExpanded = async (widgetKey: 'statistics' | 'quickActions' | 'recentActivities' | 'reviews') => {
    const typeMap: Record<string, string> = {
      statistics: 'pssr-statistics',
      quickActions: 'pssr-quick-actions',
      recentActivities: 'pssr-recent-activities',
      reviews: 'pssr-reviews'
    };
    const widget = widgets.find(w => w.widget_type === typeMap[widgetKey]);
    if (widget) {
      const newExpanded = !(widget.settings?.expanded ?? false);
      await updateWidgetSettings(widget.id, {
        ...widget.settings,
        expanded: newExpanded
      });
    }
  };
  const [filters, setFilters] = useState({
    plant: [] as string[],
    status: [] as string[],
    lead: [] as string[],
    dateFrom: '',
    dateTo: '',
    statFilter: 'all' as 'all' | 'approved' | 'under-review' | 'draft' | 'open-actions' | 'completed'
  });

  // Mock PSSR data - starts empty but can be populated
  const pssrList: PSSR[] = [{
    id: 'PSSR-2024-001',
    projectId: 'DP 300',
    projectName: 'HM Additional Compressors',
    asset: 'Compression Station',
    status: 'Under Review',
    priority: 'High',
    progress: 75,
    created: '2024-01-15',
    pssrLead: 'Ahmed Al-Rashid',
    pssrLeadAvatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face',
    teamStatus: 'green',
    pendingApprovals: 3,
    completedDate: null,
    riskLevel: 'Medium',
    nextReview: '2024-02-15',
    teamMembers: 8,
    lastActivity: '2 hours ago',
    location: 'Hassi Messaoud',
    tier: 1 as 1 | 2 | 3
  }, {
    id: 'PSSR-2024-002',
    projectId: 'DP 163',
    projectName: 'LPG Unit 12.1 Rehabilitation',
    asset: 'KAZ',
    status: 'Draft',
    priority: 'Medium',
    progress: 30,
    created: '2024-01-20',
    pssrLead: 'Sarah Johnson',
    pssrLeadAvatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
    teamStatus: 'red',
    pendingApprovals: 0,
    completedDate: null,
    riskLevel: 'Low',
    nextReview: '2024-02-20',
    teamMembers: 5,
    lastActivity: '1 day ago',
    location: 'Kazakhstan',
    tier: 3 as 1 | 2 | 3
  }, {
    id: 'PSSR-2024-003',
    projectId: 'DP 083',
    projectName: 'UQ Jetty 2 Export Terminal',
    asset: 'UQ',
    status: 'Approved',
    priority: 'High',
    progress: 100,
    created: '2024-01-10',
    pssrLead: 'Mohammed Hassan',
    pssrLeadAvatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
    teamStatus: 'amber',
    pendingApprovals: 0,
    completedDate: '2024-02-08',
    riskLevel: 'Low',
    nextReview: null,
    teamMembers: 12,
    lastActivity: 'Completed',
    location: 'Queensland',
    tier: 2 as 1 | 2 | 3
  }, {
    id: 'PSSR-2024-004',
    projectId: 'DP 317',
    projectName: 'Majnoon New Gas Tie-in',
    asset: 'NRNGL',
    status: 'Under Review',
    priority: 'Critical',
    progress: 45,
    created: '2024-01-25',
    pssrLead: 'Omar Al-Basri',
    pssrLeadAvatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face',
    teamStatus: 'red',
    pendingApprovals: 5,
    completedDate: null,
    riskLevel: 'High',
    nextReview: '2024-02-10',
    teamMembers: 6,
    lastActivity: '30 minutes ago',
    location: 'Majnoon Field',
    tier: 1 as 1 | 2 | 3
  }];

  // Initialize PSSR order
  React.useEffect(() => {
    if (pssrOrder.length === 0) {
      setPssrOrder(pssrList.map(pssr => pssr.id));
    }
  }, [pssrOrder.length]);

  // Drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) {
      return;
    }
    setPssrOrder(items => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Get unique values for filter options
  const uniquePlants = [...new Set(pssrList.map(pssr => pssr.asset))];
  const uniqueStatuses = [...new Set(pssrList.map(pssr => pssr.status))];
  const uniqueLeads = [...new Set(pssrList.map(pssr => pssr.pssrLead))];

  // Dashboard statistics
  const stats = useMemo(() => {
    const total = pssrList.length;
    const approved = pssrList.filter(p => p.status === 'Approved').length;
    const underReview = pssrList.filter(p => p.status === 'Under Review').length;
    const draft = pssrList.filter(p => p.status === 'Draft').length;
    const openActions = pssrList.filter(p => p.pendingApprovals > 0).length;
    const completed = pssrList.filter(p => p.completedDate !== null).length;
    return {
      total,
      approved,
      underReview,
      draft,
      openActions,
      completed
    };
  }, [pssrList]);

  // Filtered PSSRs with date range support
  const filteredPSSRs = useMemo(() => {
    const filtered = pssrList.filter(pssr => {
      const searchQuery = searchTerm.toLowerCase().trim();
      const matchesSearch = searchQuery === '' || pssr.id.toLowerCase().includes(searchQuery) || pssr.projectId && pssr.projectId.toLowerCase().includes(searchQuery) || pssr.projectName && pssr.projectName.toLowerCase().includes(searchQuery) || pssr.asset.toLowerCase().includes(searchQuery) || pssr.pssrLead.toLowerCase().includes(searchQuery) || pssr.status.toLowerCase().includes(searchQuery);
      const matchesPlant = filters.plant.length === 0 || filters.plant.includes(pssr.asset);
      const matchesStatus = filters.status.length === 0 || filters.status.includes(pssr.status);
      const matchesLead = filters.lead.length === 0 || filters.lead.includes(pssr.pssrLead);

      // Stat filter
      let matchesStatFilter = true;
      if (filters.statFilter !== 'all') {
        switch (filters.statFilter) {
          case 'approved':
            matchesStatFilter = pssr.status === 'Approved';
            break;
          case 'under-review':
            matchesStatFilter = pssr.status === 'Under Review';
            break;
          case 'draft':
            matchesStatFilter = pssr.status === 'Draft';
            break;
          case 'open-actions':
            // Mock logic: filter items with pending approvals
            matchesStatFilter = pssr.pendingApprovals > 0;
            break;
          case 'completed':
            // Mock logic: filter items with completedDate
            matchesStatFilter = pssr.completedDate !== null;
            break;
        }
      }

      // Date range filtering
      let matchesDateRange = true;
      if (dateRangeFilters.created) {
        const createdDate = parseISO(pssr.created);
        if (dateRangeFilters.created.from && dateRangeFilters.created.to) {
          matchesDateRange = matchesDateRange && isWithinInterval(createdDate, {
            start: startOfDay(dateRangeFilters.created.from),
            end: endOfDay(dateRangeFilters.created.to)
          });
        } else if (dateRangeFilters.created.from) {
          matchesDateRange = matchesDateRange && createdDate >= startOfDay(dateRangeFilters.created.from);
        }
      }
      if (dateRangeFilters.nextReview && pssr.nextReview) {
        const reviewDate = parseISO(pssr.nextReview);
        if (dateRangeFilters.nextReview.from && dateRangeFilters.nextReview.to) {
          matchesDateRange = matchesDateRange && isWithinInterval(reviewDate, {
            start: startOfDay(dateRangeFilters.nextReview.from),
            end: endOfDay(dateRangeFilters.nextReview.to)
          });
        } else if (dateRangeFilters.nextReview.from) {
          matchesDateRange = matchesDateRange && reviewDate >= startOfDay(dateRangeFilters.nextReview.from);
        }
      }
      if (dateRangeFilters.completed && pssr.completedDate) {
        const completedDate = parseISO(pssr.completedDate);
        if (dateRangeFilters.completed.from && dateRangeFilters.completed.to) {
          matchesDateRange = matchesDateRange && isWithinInterval(completedDate, {
            start: startOfDay(dateRangeFilters.completed.from),
            end: endOfDay(dateRangeFilters.completed.to)
          });
        } else if (dateRangeFilters.completed.from) {
          matchesDateRange = matchesDateRange && completedDate >= startOfDay(dateRangeFilters.completed.from);
        }
      }
      return matchesSearch && matchesPlant && matchesStatus && matchesLead && matchesStatFilter && matchesDateRange;
    });
    return filtered.sort((a, b) => {
      const aPinned = pinnedPSSRs.includes(a.id);
      const bPinned = pinnedPSSRs.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (pssrOrder.length > 0) {
        const aIndex = pssrOrder.indexOf(a.id);
        const bIndex = pssrOrder.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
      }
      return 0;
    });
  }, [searchTerm, filters, pssrList, pssrOrder, pinnedPSSRs, dateRangeFilters]);
  const handleStatClick = (filterKey: 'all' | 'approved' | 'under-review' | 'draft' | 'open-actions' | 'completed') => {
    setFilters(prev => ({
      ...prev,
      statFilter: filterKey
    }));
    toast.success(filterKey === 'all' ? 'Showing all PSSRs' : `Filtered by: ${filterKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`);
  };
  const toggleFilter = (category: 'plant' | 'status' | 'lead', value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value) ? prev[category].filter(item => item !== value) : [...prev[category], value]
    }));
  };
  const clearAllFilters = () => {
    setFilters({
      plant: [],
      status: [],
      lead: [],
      dateFrom: '',
      dateTo: '',
      statFilter: 'all'
    });
    setDateRangeFilters({});
  };
  const handleDateChange = (dateType: 'dateFrom' | 'dateTo', value: string) => {
    setFilters(prev => ({
      ...prev,
      [dateType]: value
    }));
  };
  const handleViewDetails = (pssrId: string) => {
    setSelectedPSSR(pssrId);
    setActiveView('details');
  };
  const handleNavigateToCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setActiveView('category-items');
  };
  const handleTogglePin = (pssrId: string) => {
    setPinnedPSSRs(prev => prev.includes(pssrId) ? prev.filter(id => id !== pssrId) : [...prev, pssrId]);
  };
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Quick action handlers
  const handleEditPSSR = (pssrId: string) => {
    toast.info(`Edit PSSR ${pssrId}`);
    // In production, navigate to edit view
  };
  const handleDuplicatePSSR = (pssrId: string) => {
    toast.success(`PSSR ${pssrId} duplicated successfully`);
    // In production, duplicate the PSSR
  };
  const handleArchivePSSR = (pssrId: string) => {
    toast.success(`PSSR ${pssrId} archived`);
    // In production, archive the PSSR
  };

  // Generate breadcrumbs based on current view
  const getBreadcrumbs = () => {
    const crumbs = [{
      label: 'Home',
      icon: Home,
      onClick: onBack
    }];
    switch (activeView) {
      case 'list':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: undefined
        });
        break;
      case 'create':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: () => setActiveView('list')
        });
        crumbs.push({
          label: 'Create PSSR',
          icon: Plus,
          onClick: undefined
        });
        break;
      case 'details':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: () => setActiveView('list')
        });
        if (selectedPSSR) {
          crumbs.push({
            label: selectedPSSR,
            icon: FileText,
            onClick: undefined
          });
        }
        break;
      case 'category-items':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: () => setActiveView('list')
        });
        if (selectedPSSR) {
          crumbs.push({
            label: selectedPSSR,
            icon: FileText,
            onClick: () => setActiveView('details')
          });
        }
        if (selectedCategory) {
          crumbs.push({
            label: selectedCategory,
            icon: FolderOpen,
            onClick: undefined
          });
        }
        break;
      case 'manage-checklist':
        crumbs.push({
          label: 'PSSR',
          icon: undefined,
          onClick: () => setActiveView('list')
        });
        crumbs.push({
          label: 'Manage Checklists',
          icon: Settings,
          onClick: undefined
        });
        break;
    }
    return crumbs;
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'Under Review':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'Draft':
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-destructive text-destructive-foreground';
      case 'High':
        return 'bg-warning text-warning-foreground';
      case 'Medium':
        return 'bg-primary text-primary-foreground';
      case 'Low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const getTeamStatusColor = (teamStatus: string) => {
    switch (teamStatus) {
      case 'green':
        return 'bg-emerald-500';
      case 'amber':
        return 'bg-warning';
      case 'red':
        return 'bg-destructive';
      case 'grey':
      case 'gray':
        return 'bg-muted-foreground/40';
      default:
        return 'bg-muted-foreground/40';
    }
  };
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'Medium':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'Low':
        return 'text-success bg-success/10 border-success/20';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  // Render different views
  if (activeView === 'details' && selectedPSSR) {
    return <PSSRDashboard pssrId={selectedPSSR} onBack={() => setActiveView('list')} onNavigateToCategory={handleNavigateToCategory} />;
  }
  return <div className="h-screen flex w-full overflow-hidden">
      {/* ORSH Sidebar - Fixed */}
      <OrshSidebar 
        userName={userProfile?.full_name || 'User'} 
        userTitle={userProfile?.position || 'Team Member'} 
        userAvatar={userProfile?.avatar_url || ''} 
        language="en" 
        currentPage="pssr" 
        onNavigate={section => {
      console.log('PSSR page navigation:', section);
      if (section === 'home') {
        onBack();
      } else if (section === 'pssr') {
        setActiveView('list');
      } else {
        // Navigate to other sections via router
        navigate(`/${section}`);
      }
    }} onLogout={onBack} onShowWidgets={() => setShowWidgetManagement(true)} onShowOnboarding={() => setShowOnboarding(true)} showWidgets={showWidgetManagement} />
      
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Modern Minimalist Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-6 py-5">
            {/* Breadcrumb at top */}
            <Breadcrumb>
              <BreadcrumbList>
                {(() => {
                  const breadcrumbs = getBreadcrumbs();
                  const totalItems = breadcrumbs.length;
                  return breadcrumbs.map((crumb, index) => {
                    const Icon = crumb.icon || Home;
                    const isLast = index === breadcrumbs.length - 1;
                    const isFirst = index === 0;
                    const shouldHideOnSmall = totalItems > 2 && !isFirst && !isLast;
                    const shouldHideOnMedium = totalItems > 3 && !isFirst && !isLast && index !== 1;
                    const shouldShowEllipsisSmall = totalItems > 2 && index === totalItems - 1;
                    const shouldShowEllipsisMedium = totalItems > 3 && index === totalItems - 1;
                    const hiddenItemsSmall = totalItems > 2 ? breadcrumbs.slice(1, -1) : [];
                    const hiddenItemsMedium = totalItems > 3 ? breadcrumbs.filter((_, i) => i !== 0 && i !== totalItems - 1 && i !== 1) : [];
                    
                    return (
                      <React.Fragment key={index}>
                        {shouldShowEllipsisSmall && hiddenItemsSmall.length > 0 && (
                          <>
                            <BreadcrumbItem className="md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
                                  <BreadcrumbEllipsis className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-popover z-50">
                                  {hiddenItemsSmall.map((hiddenCrumb, hiddenIndex) => {
                                    const HiddenIcon = hiddenCrumb.icon || Home;
                                    return (
                                      <DropdownMenuItem key={hiddenIndex} onClick={hiddenCrumb.onClick} className="flex items-center gap-2 cursor-pointer">
                                        {hiddenCrumb.icon && <HiddenIcon className="h-3.5 w-3.5" />}
                                        {hiddenCrumb.label}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="md:hidden" />
                          </>
                        )}
                        
                        {shouldShowEllipsisMedium && hiddenItemsMedium.length > 0 && (
                          <>
                            <BreadcrumbItem className="hidden md:block lg:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
                                  <BreadcrumbEllipsis className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-popover z-50">
                                  {hiddenItemsMedium.map((hiddenCrumb, hiddenIndex) => {
                                    const HiddenIcon = hiddenCrumb.icon || Home;
                                    return (
                                      <DropdownMenuItem key={hiddenIndex} onClick={hiddenCrumb.onClick} className="flex items-center gap-2 cursor-pointer">
                                        {hiddenCrumb.icon && <HiddenIcon className="h-3.5 w-3.5" />}
                                        {hiddenCrumb.label}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block lg:hidden" />
                          </>
                        )}
                        
                        <BreadcrumbItem className={shouldHideOnSmall ? 'hidden md:block' : shouldHideOnMedium ? 'hidden lg:block' : ''}>
                          {isLast ? (
                            <BreadcrumbPage className="flex items-center gap-1.5">
                              {crumb.icon && <Icon className="h-3.5 w-3.5" />}
                              {crumb.label}
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <button onClick={crumb.onClick} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                                {crumb.icon && <Icon className="h-3.5 w-3.5" />}
                                {crumb.label}
                              </button>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!isLast && <BreadcrumbSeparator className={shouldHideOnSmall ? 'hidden md:block' : shouldHideOnMedium ? 'hidden lg:block' : ''} />}
                      </React.Fragment>
                    );
                  });
                })()}
              </BreadcrumbList>
            </Breadcrumb>
            
            {/* Icon and Title below breadcrumb - matching Projects page layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Pre-Start-Up Safety Review
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Manage and track all PSSR activities
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setActiveView('manage-checklist')}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Manage Checklist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => setShowCreateIntro(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create PSSR
                </Button>
              </div>
            </div>
            
            {/* Quick Stats Bar - Clickable filters */}
            <div className="mt-4">
              <PSSRQuickStatsBar
                stats={stats}
                activeFilter={filters.statFilter}
                onFilterClick={handleStatClick}
              />
            </div>
          </div>
        </header>

      <main className="flex-1 overflow-y-auto max-w-[1400px] mx-auto px-6 py-8 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* PSSR Reviews Widget */}
        {widgetVisibility.reviews && (
          <PSSRReviewsWidget 
            pssrs={pssrList} 
            filteredPSSRs={filteredPSSRs} 
            searchTerm={searchTerm} 
            onSearchChange={handleSearchChange} 
            onSelectPSSR={handleViewDetails} 
            viewMode={viewMode === 'timeline' ? 'card' : viewMode} 
            onViewModeChange={mode => setViewMode(mode)} 
            filters={filters} 
            onToggleFilter={toggleFilter} 
            onDateChange={handleDateChange} 
            onClearFilters={clearAllFilters} 
            uniquePlants={uniquePlants} 
            uniqueStatuses={uniqueStatuses} 
            uniqueLeads={uniqueLeads} 
            onViewDetails={handleViewDetails} 
            getPriorityColor={getPriorityColor} 
            getStatusIcon={getStatusIcon} 
            getTeamStatusColor={getTeamStatusColor} 
            getRiskLevelColor={getRiskLevelColor} 
            pinnedPSSRs={pinnedPSSRs} 
            onTogglePin={handleTogglePin} 
            onStatusChange={(pssrId, newStatus) => {
              toast.success(`PSSR ${pssrId} moved to ${newStatus}`);
            }} 
            onPSSROrderChange={setPssrOrder} 
            pssrOrder={pssrOrder} 
            isExpanded={widgetExpanded.reviews} 
            isVisible={widgetVisibility.reviews} 
            onToggleExpand={() => handleToggleWidgetExpanded('reviews')} 
            onToggleVisibility={() => handleToggleWidgetVisibility('reviews')} 
          />
        )}
      </main>
      </div>
      
      {/* Create PSSR Intro Modal */}
      <CreatePSSRIntroModal 
        isOpen={showCreateIntro} 
        onClose={() => setShowCreateIntro(false)} 
        onContinue={() => {
          setShowCreateIntro(false);
          setActiveView('create');
        }} 
      />
      
      {/* Create PSSR Wizard */}
      <CreatePSSRWizard
        open={activeView === 'create'}
        onOpenChange={(open) => {
          if (!open) setActiveView('list');
        }}
        onSuccess={(pssrId) => {
          setSelectedPSSR(pssrId);
          setActiveView('details');
          toast.success('PSSR created successfully');
        }}
      />
    </div>;
};
export default PSSRSummaryPage;