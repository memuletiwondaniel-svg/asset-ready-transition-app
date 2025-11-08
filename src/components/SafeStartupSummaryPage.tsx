import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Plus, ClipboardList, AlertTriangle, CheckCircle, Clock, Search, Filter, Settings, ShieldCheck, BarChart3, Users, Calendar as CalendarIcon, TrendingUp, TrendingDown, Minus, LayoutGrid, Table as TableIcon, Home, FileText, FolderOpen, GripVertical, Columns3, CalendarDays, Bell } from 'lucide-react';
import { WidgetCard } from './widgets/WidgetCard';
import { PSSRStatisticsWidget } from './widgets/PSSRStatisticsWidget';
import { PSSRQuickActionsWidget } from './widgets/PSSRQuickActionsWidget';
import { PSSRRecentActivitiesWidget } from './widgets/PSSRRecentActivitiesWidget';
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
import CreatePSSRWorkflow from './CreatePSSRWorkflow';
import PSSRDashboard from './PSSRDashboard';
import PSSRCategoryItemsPage from './PSSRCategoryItemsPage';
import ManageChecklistPage from './ManageChecklistPage';
import { OrshSidebar } from './OrshSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbEllipsis } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
interface SafeStartupSummaryPageProps {
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
const SafeStartupSummaryPage: React.FC<SafeStartupSummaryPageProps> = ({
  onBack
}) => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access

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
  const [widgetVisibility, setWidgetVisibility] = useState({
    statistics: true,
    quickActions: true,
    recentActivities: true,
    reviews: true,
  });
  const [widgetExpanded, setWidgetExpanded] = useState({
    statistics: false,
    quickActions: false,
    recentActivities: false,
    reviews: false,
  });
  const [showWidgetManagement, setShowWidgetManagement] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
    toast.success(
      filterKey === 'all' 
        ? 'Showing all PSSRs' 
        : `Filtered by: ${filterKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
    );
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
          label: 'Safe Start-Up',
          icon: undefined,
          onClick: undefined
        });
        break;
      case 'create':
        crumbs.push({
          label: 'Safe Start-Up',
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
          label: 'Safe Start-Up',
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
          label: 'Safe Start-Up',
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
          label: 'Safe Start-Up',
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
        return 'bg-success';
      case 'amber':
        return 'bg-warning';
      case 'red':
        return 'bg-destructive';
      default:
        return 'bg-muted';
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
  if (activeView === 'create') {
    return <CreatePSSRWorkflow onBack={() => setActiveView('list')} />;
  }
  if (activeView === 'details' && selectedPSSR) {
    return <PSSRDashboard pssrId={selectedPSSR} onBack={() => setActiveView('list')} onNavigateToCategory={handleNavigateToCategory} />;
  }
  if (activeView === 'category-items' && selectedCategory && selectedPSSR) {
    return <PSSRCategoryItemsPage categoryName={selectedCategory} pssrId={selectedPSSR} onBack={() => setActiveView('details')} />;
  }
  if (activeView === 'manage-checklist') {
    return <ManageChecklistPage onBack={() => setActiveView('list')} />;
  }
  return <div className="h-screen flex w-full overflow-hidden">
      {/* ORSH Sidebar - Fixed */}
      <OrshSidebar 
        userName="Daniel" 
        userTitle="ORA Engr." 
        language="en" 
        currentPage="safe-startup" 
        onNavigate={section => {
          if (section === 'home') {
            onBack();
          }
        }}
        onShowWidgets={() => setShowWidgetManagement(true)}
        onShowOnboarding={() => setShowOnboarding(true)}
        showWidgets={showWidgetManagement}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Modern Minimalist Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-6 py-5">
            {/* Single row with Breadcrumb on left and Title centered */}
            <div className="relative flex items-center">
              {/* Breadcrumb - Left aligned */}
              <div className="flex-shrink-0">
                <Breadcrumb>
                  <BreadcrumbList>
                    {(() => {
                    const breadcrumbs = getBreadcrumbs();
                    const totalItems = breadcrumbs.length;
                    return breadcrumbs.map((crumb, index) => {
                      const Icon = crumb.icon || Home;
                      const isLast = index === breadcrumbs.length - 1;
                      const isFirst = index === 0;

                      // Determine which items to hide based on screen size
                      const shouldHideOnSmall = totalItems > 2 && !isFirst && !isLast;
                      const shouldHideOnMedium = totalItems > 3 && !isFirst && !isLast && index !== 1;

                      // Show ellipsis before the last item if there are hidden items
                      const shouldShowEllipsisSmall = totalItems > 2 && index === totalItems - 1;
                      const shouldShowEllipsisMedium = totalItems > 3 && index === totalItems - 1;

                      // Get hidden items for dropdown
                      const hiddenItemsSmall = totalItems > 2 ? breadcrumbs.slice(1, -1) : [];
                      const hiddenItemsMedium = totalItems > 3 ? breadcrumbs.filter((_, i) => i !== 0 && i !== totalItems - 1 && i !== 1) : [];
                      return <React.Fragment key={index}>
                            {/* Ellipsis dropdown for small screens */}
                            {shouldShowEllipsisSmall && hiddenItemsSmall.length > 0 && <>
                                <BreadcrumbItem className="md:hidden">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
                                      <BreadcrumbEllipsis className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-popover z-50">
                                      {hiddenItemsSmall.map((hiddenCrumb, hiddenIndex) => {
                                  const HiddenIcon = hiddenCrumb.icon || Home;
                                  return <DropdownMenuItem key={hiddenIndex} onClick={hiddenCrumb.onClick} className="flex items-center gap-2 cursor-pointer">
                                            {hiddenCrumb.icon && <HiddenIcon className="h-3.5 w-3.5" />}
                                            {hiddenCrumb.label}
                                          </DropdownMenuItem>;
                                })}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="md:hidden" />
                              </>}
                            
                            {/* Ellipsis dropdown for medium screens */}
                            {shouldShowEllipsisMedium && hiddenItemsMedium.length > 0 && <>
                                <BreadcrumbItem className="hidden md:block lg:hidden">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
                                      <BreadcrumbEllipsis className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="bg-popover z-50">
                                      {hiddenItemsMedium.map((hiddenCrumb, hiddenIndex) => {
                                  const HiddenIcon = hiddenCrumb.icon || Home;
                                  return <DropdownMenuItem key={hiddenIndex} onClick={hiddenCrumb.onClick} className="flex items-center gap-2 cursor-pointer">
                                            {hiddenCrumb.icon && <HiddenIcon className="h-3.5 w-3.5" />}
                                            {hiddenCrumb.label}
                                          </DropdownMenuItem>;
                                })}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block lg:hidden" />
                              </>}
                            
                            {/* Actual breadcrumb item */}
                            <BreadcrumbItem className={shouldHideOnSmall ? 'hidden md:block' : shouldHideOnMedium ? 'hidden lg:block' : ''}>
                              {isLast ? <BreadcrumbPage className="flex items-center gap-1.5">
                                  {crumb.icon && <Icon className="h-3.5 w-3.5" />}
                                  {crumb.label}
                                </BreadcrumbPage> : <BreadcrumbLink asChild>
                                  <button onClick={crumb.onClick} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                                    {crumb.icon && <Icon className="h-3.5 w-3.5" />}
                                    {crumb.label}
                                  </button>
                                </BreadcrumbLink>}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator className={shouldHideOnSmall ? 'hidden md:block' : shouldHideOnMedium ? 'hidden lg:block' : ''} />}
                          </React.Fragment>;
                    });
                  })()}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Centered Title */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Pre-Start-Up Safety Review</h1>
                  <p className="text-xs text-muted-foreground">Safe Start-Up Management</p>
                </div>
              </div>

              {/* Header Actions - Right aligned */}
              
            </div>
          </div>
        </header>

      <main className="flex-1 overflow-y-auto max-w-[1400px] mx-auto px-6 py-8 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistics Widget - Full width on mobile, 1 column on desktop */}
          <div className="lg:col-span-1">
            <PSSRStatisticsWidget 
              stats={stats} 
              onStatClick={handleStatClick}
              isExpanded={widgetExpanded.statistics}
              isVisible={widgetVisibility.statistics}
              onToggleExpand={() => setWidgetExpanded(prev => ({ ...prev, statistics: !prev.statistics }))}
              onToggleVisibility={() => setWidgetVisibility(prev => ({ ...prev, statistics: !prev.statistics }))}
            />
          </div>
          
          {/* Quick Actions Widget */}
          <div className="lg:col-span-1">
            <PSSRQuickActionsWidget
              onCreatePSSR={() => setActiveView('create')}
              onManageChecklist={() => setActiveView('manage-checklist')}
              onChatWithORSH={() => {
                // Navigate to home page where the AI widget is available
                onBack();
              }}
              isExpanded={widgetExpanded.quickActions}
              isVisible={widgetVisibility.quickActions}
              onToggleExpand={() => setWidgetExpanded(prev => ({ ...prev, quickActions: !prev.quickActions }))}
              onToggleVisibility={() => setWidgetVisibility(prev => ({ ...prev, quickActions: !prev.quickActions }))}
            />
          </div>
          
          {/* Recent Activities Widget */}
          <div className="lg:col-span-1">
            <PSSRRecentActivitiesWidget 
              isExpanded={widgetExpanded.recentActivities}
              isVisible={widgetVisibility.recentActivities}
              onToggleExpand={() => setWidgetExpanded(prev => ({ ...prev, recentActivities: !prev.recentActivities }))}
              onToggleVisibility={() => setWidgetVisibility(prev => ({ ...prev, recentActivities: !prev.recentActivities }))}
            />
          </div>
        </div>

        {/* Reviews Widget */}
        {widgetVisibility.reviews && (
          <div className="mt-6">
            <PSSRReviewsWidget
              pssrs={pssrList}
              filteredPSSRs={filteredPSSRs}
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onSelectPSSR={handleViewDetails}
              viewMode={viewMode === 'timeline' ? 'card' : viewMode}
              onViewModeChange={(mode) => setViewMode(mode)}
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
              onToggleExpand={() => setWidgetExpanded(prev => ({ ...prev, reviews: !prev.reviews }))}
              onToggleVisibility={() => setWidgetVisibility(prev => ({ ...prev, reviews: !prev.reviews }))}
            />
          </div>
        )}

      </main>
      </div>
    </div>;
};
export default SafeStartupSummaryPage;