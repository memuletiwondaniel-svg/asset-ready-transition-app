import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ArrowLeft, 
  Plus, 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Filter, 
  Settings,
  BarChart3,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  Table as TableIcon,
  Home,
  FileText,
  FolderOpen,
  GripVertical,
  Columns3,
  Bell,
  Rocket,
  ChevronRight
} from 'lucide-react';
import PSSRFilters from './PSSRFilters';
import PSSRCardsWidget, { CardDensity, ViewMode } from './widgets/PSSRCardsWidget';
import PSSRActivityFeed from './PSSRActivityFeed';
import PSSRDateRangeFilter, { DateRangeFilter } from './PSSRDateRangeFilter';
import PSSRAdvancedSearch from './PSSRAdvancedSearch';
import PSSRStatsWidget from './PSSRStatsWidget';
import { SafeStartupWidgetManagement } from './SafeStartupWidgetManagement';
import { DraggableWidgetCard } from './widgets/DraggableWidgetCard';
import CreatePSSRIntroModal from './CreatePSSRIntroModal';
import CreatePSSRWorkflow from './CreatePSSRWorkflow';
import PSSRDashboard from './PSSRDashboard';
import PSSRCategoryItemsPage from './PSSRCategoryItemsPage';
import ManageChecklistPage from './ManageChecklistPage';
import { OrshSidebar } from './OrshSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
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

interface SafeStartupWidgetConfig {
  id: string;
  title: string;
  isVisible: boolean;
  isExpanded: boolean;
}

const SafeStartupSummaryPage: React.FC<SafeStartupSummaryPageProps> = ({ onBack }) => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access
  
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details' | 'category-items' | 'manage-checklist'>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [cardDensity, setCardDensity] = useState<CardDensity>('comfortable');
  const [showCreateIntro, setShowCreateIntro] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pssrOrder, setPssrOrder] = useState<string[]>([]);
  const [pinnedPSSRs, setPinnedPSSRs] = useState<string[]>([]);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [dateRangeFilters, setDateRangeFilters] = useState<DateRangeFilter>({});
  const [filters, setFilters] = useState({
    plant: [] as string[],
    status: [] as string[],
    lead: [] as string[]
  });

  // Widget Management State
  const [showWidgetManagement, setShowWidgetManagement] = useState(false);
  const [widgets, setWidgets] = useState<SafeStartupWidgetConfig[]>([
    { id: 'pssr-stats', title: 'PSSR Statistics', isVisible: true, isExpanded: false },
    { id: 'quick-actions', title: 'Quick Actions', isVisible: true, isExpanded: false },
    { id: 'pssr-cards', title: 'PSSR Reviews', isVisible: true, isExpanded: false },
  ]);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(['pssr-stats', 'quick-actions', 'pssr-cards']);

  // Mock PSSR data - starts empty but can be populated
  const pssrList: PSSR[] = [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    }
  ];

  // Initialize PSSR order
  React.useEffect(() => {
    if (pssrOrder.length === 0) {
      setPssrOrder(pssrList.map(pssr => pssr.id));
    }
  }, [pssrOrder.length]);

  // Drag and drop sensors for widgets
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for widgets
  const handleWidgetDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setWidgetOrder((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Widget management handlers
  const toggleWidget = (widgetId: string) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
    ));
  };

  const toggleWidgetExpansion = (widgetId: string) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId ? { ...w, isExpanded: !w.isExpanded } : w
    ));
  };

  const hideWidget = (widgetId: string) => {
    setWidgets(widgets.map(w => 
      w.id === widgetId ? { ...w, isVisible: false } : w
    ));
    toast.success('Widget hidden. You can show it again from Widget Management.');
  };

  const resetWidgets = () => {
    setWidgets([
      { id: 'pssr-stats', title: 'PSSR Statistics', isVisible: true, isExpanded: false },
      { id: 'quick-actions', title: 'Quick Actions', isVisible: true, isExpanded: false },
      { id: 'pssr-cards', title: 'PSSR Reviews', isVisible: true, isExpanded: false },
    ]);
    setWidgetOrder(['pssr-stats', 'quick-actions', 'pssr-cards']);
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
    const criticalIssues = pssrList.filter(p => p.priority === 'Critical').length;
    const avgProgress = total > 0 ? Math.round(pssrList.reduce((sum, p) => sum + p.progress, 0) / total) : 0;
    
    return {
      total,
      approved,
      underReview,
      draft,
      criticalIssues,
      avgProgress
    };
  }, [pssrList]);

  // Filtered PSSRs with date range support
  const filteredPSSRs = useMemo(() => {
    const filtered = pssrList.filter(pssr => {
      const searchQuery = searchTerm.toLowerCase().trim();
      const matchesSearch = searchQuery === '' || 
        pssr.id.toLowerCase().includes(searchQuery) ||
        (pssr.projectId && pssr.projectId.toLowerCase().includes(searchQuery)) ||
        (pssr.projectName && pssr.projectName.toLowerCase().includes(searchQuery)) ||
        pssr.asset.toLowerCase().includes(searchQuery) ||
        pssr.pssrLead.toLowerCase().includes(searchQuery) ||
        pssr.status.toLowerCase().includes(searchQuery);

      const matchesPlant = filters.plant.length === 0 || filters.plant.includes(pssr.asset);
      const matchesStatus = filters.status.length === 0 || filters.status.includes(pssr.status);
      const matchesLead = filters.lead.length === 0 || filters.lead.includes(pssr.pssrLead);

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

      return matchesSearch && matchesPlant && matchesStatus && matchesLead && matchesDateRange;
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

  const toggleFilter = (category: 'plant' | 'status' | 'lead', value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value) 
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      plant: [],
      status: [],
      lead: []
    });
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
    setPinnedPSSRs(prev => 
      prev.includes(pssrId) 
        ? prev.filter(id => id !== pssrId)
        : [...prev, pssrId]
    );
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
    const crumbs = [{ label: 'Home', icon: Home, onClick: onBack }];
    
    switch (activeView) {
      case 'list':
        crumbs.push({ label: 'Safe Start-Up', icon: Rocket, onClick: undefined });
        break;
      case 'create':
        crumbs.push({ label: 'Safe Start-Up', icon: Rocket, onClick: () => setActiveView('list') });
        crumbs.push({ label: 'Create PSSR', icon: Plus, onClick: undefined });
        break;
      case 'details':
        crumbs.push({ label: 'Safe Start-Up', icon: Rocket, onClick: () => setActiveView('list') });
        if (selectedPSSR) {
          crumbs.push({ label: selectedPSSR, icon: FileText, onClick: undefined });
        }
        break;
      case 'category-items':
        crumbs.push({ label: 'Safe Start-Up', icon: Rocket, onClick: () => setActiveView('list') });
        if (selectedPSSR) {
          crumbs.push({ label: selectedPSSR, icon: FileText, onClick: () => setActiveView('details') });
        }
        if (selectedCategory) {
          crumbs.push({ label: selectedCategory, icon: FolderOpen, onClick: undefined });
        }
        break;
      case 'manage-checklist':
        crumbs.push({ label: 'Safe Start-Up', icon: Rocket, onClick: () => setActiveView('list') });
        crumbs.push({ label: 'Manage Checklists', icon: Settings, onClick: undefined });
        break;
    }
    
    return crumbs;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'Under Review': return <Clock className="h-4 w-4 text-warning" />;
      case 'Draft': return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-destructive text-destructive-foreground';
      case 'High': return 'bg-warning text-warning-foreground';
      case 'Medium': return 'bg-primary text-primary-foreground';
      case 'Low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTeamStatusColor = (teamStatus: string) => {
    switch (teamStatus) {
      case 'green': return 'bg-success';
      case 'amber': return 'bg-warning';
      case 'red': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'Medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'Low': return 'text-success bg-success/10 border-success/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  // Render different views
  if (activeView === 'create') {
    return <CreatePSSRWorkflow onBack={() => setActiveView('list')} />;
  }

  if (activeView === 'details' && selectedPSSR) {
    return (
      <PSSRDashboard 
        pssrId={selectedPSSR} 
        onBack={() => setActiveView('list')} 
        onNavigateToCategory={handleNavigateToCategory}
      />
    );
  }

  if (activeView === 'category-items' && selectedCategory && selectedPSSR) {
    return (
      <PSSRCategoryItemsPage 
        categoryName={selectedCategory}
        pssrId={selectedPSSR}
        onBack={() => setActiveView('details')}
      />
    );
  }

  if (activeView === 'manage-checklist') {
    return <ManageChecklistPage onBack={() => setActiveView('list')} />;
  }

  return (
    <div className="min-h-screen flex w-full relative overflow-hidden">
      {/* Dynamic Color Modeled Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0">
          {/* Primary color orb - top left */}
          <div 
            className="absolute top-0 left-0 w-[600px] h-[600px] opacity-30 dark:opacity-20 animate-[morph_20s_ease-in-out_infinite]"
            style={{
              background: `radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, hsl(var(--primary) / 0.2) 30%, transparent 70%)`,
              filter: 'blur(80px)',
              transform: 'translate(-30%, -30%)',
            }}
          />
          
          {/* Accent color orb - top right */}
          <div 
            className="absolute top-0 right-0 w-[500px] h-[500px] opacity-25 dark:opacity-15 animate-[morph_25s_ease-in-out_infinite_reverse]"
            style={{
              background: `radial-gradient(circle, hsl(var(--accent) / 0.3) 0%, hsl(var(--accent) / 0.15) 40%, transparent 70%)`,
              filter: 'blur(70px)',
              transform: 'translate(20%, -40%)',
            }}
          />
          
          {/* Secondary color orb - bottom */}
          <div 
            className="absolute bottom-0 left-1/2 w-[700px] h-[700px] opacity-20 dark:opacity-15 animate-[float_30s_ease-in-out_infinite]"
            style={{
              background: `radial-gradient(circle, hsl(var(--secondary) / 0.3) 0%, hsl(var(--secondary) / 0.1) 35%, transparent 65%)`,
              filter: 'blur(90px)',
              transform: 'translate(-50%, 40%)',
            }}
          />
          
          {/* Muted accent orb - center right */}
          <div 
            className="absolute top-1/2 right-0 w-[450px] h-[450px] opacity-15 dark:opacity-10 animate-[pulse_15s_ease-in-out_infinite]"
            style={{
              background: `radial-gradient(circle, hsl(var(--muted) / 0.4) 0%, hsl(var(--muted) / 0.2) 40%, transparent 70%)`,
              filter: 'blur(60px)',
              transform: 'translate(25%, -50%)',
            }}
          />
        </div>
        
        {/* Subtle mesh overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(0deg, hsl(var(--foreground) / 0.03) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground) / 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      
      {/* ORSH Sidebar */}
      <OrshSidebar 
        userName="Daniel"
        userTitle="ORA Engr."
        language="en"
        currentPage="safe-startup"
        onNavigate={(section) => {
          if (section === 'home') {
            onBack();
          }
        }}
        onShowWidgets={() => setShowWidgetManagement(true)}
      />
      
      <div className="flex-1 relative z-10 overflow-auto">
        {/* Modern Minimalist Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-6 py-5">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
              <Breadcrumb>
                <BreadcrumbList>
                  {getBreadcrumbs().map((crumb, index) => {
                    const Icon = crumb.icon || Home;
                    const isLast = index === getBreadcrumbs().length - 1;
                    
                    return (
                      <React.Fragment key={index}>
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage className="flex items-center gap-1.5 text-sm font-medium">
                              <Icon className="h-3.5 w-3.5" />
                              {crumb.label}
                            </BreadcrumbPage>
                          ) : (
                            <button
                              onClick={crumb.onClick}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {crumb.label}
                            </button>
                          )}
                        </BreadcrumbItem>
                        {!isLast && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 mx-1.5" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Safe Start-Up</h1>
              <p className="text-sm text-muted-foreground">Pre-Start-Up Safety Review Management</p>
            </div>
          </div>
        </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Left Side - Widgets and Filters */}
          <div className="flex-1 space-y-6">
            {/* Stats and Quick Actions Row - Draggable Widgets */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleWidgetDragEnd}
            >
              <SortableContext
                items={widgetOrder.filter(id => id !== 'pssr-cards')}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {widgetOrder.filter(id => id !== 'pssr-cards').map((widgetId) => {
                    const widget = widgets.find(w => w.id === widgetId);
                    if (!widget || !widget.isVisible) return null;

                    if (widgetId === 'pssr-stats') {
                      return (
                        <DraggableWidgetCard
                          key={widgetId}
                          id={widgetId}
                          title="PSSR Statistics"
                          isExpanded={widget.isExpanded}
                          onToggleExpand={() => toggleWidgetExpansion(widgetId)}
                          onHide={() => hideWidget(widgetId)}
                          colSpan="lg:col-span-1"
                        >
                          <PSSRStatsWidget stats={stats} />
                        </DraggableWidgetCard>
                      );
                    }

                    if (widgetId === 'quick-actions') {
                      return (
                        <DraggableWidgetCard
                          key={widgetId}
                          id={widgetId}
                          title="Quick Actions"
                          isExpanded={widget.isExpanded}
                          onToggleExpand={() => toggleWidgetExpansion(widgetId)}
                          onHide={() => hideWidget(widgetId)}
                          colSpan="lg:col-span-2"
                        >
                          <div>
                            <h3 className="text-sm font-semibold mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Button 
                                variant="outline"
                                onClick={() => setActiveView('create')}
                                className="h-auto py-4 flex-col items-start gap-2 text-left hover:bg-muted/50"
                              >
                                <Plus className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-semibold text-sm">Create New PSSR</p>
                                  <p className="text-xs text-muted-foreground">Start a new safety review</p>
                                </div>
                              </Button>
                              {userRole === 'admin' && (
                                <Button 
                                  variant="outline"
                                  onClick={() => setActiveView('manage-checklist')}
                                  className="h-auto py-4 flex-col items-start gap-2 text-left hover:bg-muted/50"
                                >
                                  <Settings className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="font-semibold text-sm">Manage Checklists</p>
                                    <p className="text-xs text-muted-foreground">Configure PSSR templates</p>
                                  </div>
                                </Button>
                              )}
                            </div>
                          </div>
                        </DraggableWidgetCard>
                      );
                    }

                    return null;
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {/* Modern Search and Filters */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                  <PSSRAdvancedSearch
                    pssrs={pssrList}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onSelectPSSR={handleViewDetails}
                    placeholder="Search by Project ID, Name, Asset, Lead..."
                  />
                  
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <PSSRFilters
                      filters={filters}
                      onToggleFilter={toggleFilter}
                      onClearFilters={clearAllFilters}
                      uniquePlants={uniquePlants}
                      uniqueStatuses={uniqueStatuses}
                      uniqueLeads={uniqueLeads}
                    />
                    
                    {/* Date Range Filter */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={`gap-2 ${
                            dateRangeFilters.created || dateRangeFilters.nextReview || dateRangeFilters.completed
                              ? 'border-primary bg-primary/5'
                              : ''
                          }`}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          <span className="hidden md:inline">Dates</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-80">
                        <PSSRDateRangeFilter value={dateRangeFilters} onChange={setDateRangeFilters} />
                      </PopoverContent>
                    </Popover>

                    {/* Activity Feed Toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActivityFeed(!showActivityFeed)}
                      className="gap-2"
                    >
                      <Bell className="h-4 w-4" />
                      <span className="hidden md:inline">Activity</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - PSSR Cards Widget */}
          {widgets.find(w => w.id === 'pssr-cards')?.isVisible && (
            <div className="w-full lg:w-[500px] xl:w-[600px] flex-shrink-0">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-[calc(100vh-280px)] sticky top-[180px]">
                <CardContent className="p-5 h-full flex flex-col">
                  <PSSRCardsWidget
                    pssrs={filteredPSSRs}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    cardDensity={cardDensity}
                    onCardDensityChange={setCardDensity}
                    onViewDetails={handleViewDetails}
                    getPriorityColor={getPriorityColor}
                    getStatusIcon={getStatusIcon}
                    getTeamStatusColor={getTeamStatusColor}
                    getRiskLevelColor={getRiskLevelColor}
                    pinnedPSSRs={pinnedPSSRs}
                    onTogglePin={handleTogglePin}
                    onEdit={handleEditPSSR}
                    onDuplicate={handleDuplicatePSSR}
                    onArchive={handleArchivePSSR}
                    pssrOrder={pssrOrder}
                    onPssrOrderChange={setPssrOrder}
                    totalCount={stats.total}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    filterPriority={filterPriority}
                    onFilterPriorityChange={setFilterPriority}
                    filterTier={filterTier}
                    onFilterTierChange={setFilterTier}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Activity Feed - Absolutely positioned when open */}
        {showActivityFeed && (
          <div className="fixed right-6 top-[180px] w-[350px] h-[calc(100vh-220px)] z-40">
            <Card className="border-border/50 bg-card/95 backdrop-blur-md shadow-xl h-full">
              <CardContent className="p-5 h-full overflow-y-auto">
                <PSSRActivityFeed />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      </div>

      {/* Safe Start-Up Widget Management Modal */}
      <SafeStartupWidgetManagement
        open={showWidgetManagement}
        onOpenChange={setShowWidgetManagement}
        widgets={widgets}
        onToggleWidget={toggleWidget}
        onResetWidgets={resetWidgets}
      />
    </div>
  );
};

export default SafeStartupSummaryPage;