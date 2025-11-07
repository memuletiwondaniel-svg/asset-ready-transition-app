import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  ShieldCheck,
  BarChart3,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  Table as TableIcon,
  Home,
  FileText,
  FolderOpen
} from 'lucide-react';
import PSSRFilters from './PSSRFilters';
import DraggablePSSRCard from './DraggablePSSRCard';
import PSSRTableView from './PSSRTableView';
import CreatePSSRIntroModal from './CreatePSSRIntroModal';
import CreatePSSRWorkflow from './CreatePSSRWorkflow';
import PSSRDashboard from './PSSRDashboard';
import PSSRCategoryItemsPage from './PSSRCategoryItemsPage';
import ManageChecklistPage from './ManageChecklistPage';
import { OrshSidebar } from './OrshSidebar';

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

const SafeStartupSummaryPage: React.FC<SafeStartupSummaryPageProps> = ({ onBack }) => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access
  
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details' | 'category-items' | 'manage-checklist'>('list');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showCreateIntro, setShowCreateIntro] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pssrOrder, setPssrOrder] = useState<string[]>([]);
  const [pinnedPSSRs, setPinnedPSSRs] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    plant: [] as string[],
    status: [] as string[],
    lead: [] as string[]
  });

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

  // Drag and drop sensors
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

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setPssrOrder((items) => {
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

  // Filtered PSSRs
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

      return matchesSearch && matchesPlant && matchesStatus && matchesLead;
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
  }, [searchTerm, filters, pssrList, pssrOrder, pinnedPSSRs]);

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

  // Generate breadcrumbs based on current view
  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'Home', icon: Home, onClick: onBack }];
    
    switch (activeView) {
      case 'list':
        crumbs.push({ label: 'Safe Start-Up', icon: ShieldCheck, onClick: undefined });
        break;
      case 'create':
        crumbs.push({ label: 'Safe Start-Up', icon: ShieldCheck, onClick: () => setActiveView('list') });
        crumbs.push({ label: 'Create PSSR', icon: Plus, onClick: undefined });
        break;
      case 'details':
        crumbs.push({ label: 'Safe Start-Up', icon: ShieldCheck, onClick: () => setActiveView('list') });
        if (selectedPSSR) {
          crumbs.push({ label: selectedPSSR, icon: FileText, onClick: undefined });
        }
        break;
      case 'category-items':
        crumbs.push({ label: 'Safe Start-Up', icon: ShieldCheck, onClick: () => setActiveView('list') });
        if (selectedPSSR) {
          crumbs.push({ label: selectedPSSR, icon: FileText, onClick: () => setActiveView('details') });
        }
        if (selectedCategory) {
          crumbs.push({ label: selectedCategory, icon: FolderOpen, onClick: undefined });
        }
        break;
      case 'manage-checklist':
        crumbs.push({ label: 'Safe Start-Up', icon: ShieldCheck, onClick: () => setActiveView('list') });
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
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-background">
        {/* Main layer */}
        <div className="absolute inset-0 opacity-25 dark:opacity-20">
          <div 
            className="absolute inset-0 animate-gradient-shift-morph"
            style={{
              background: 'radial-gradient(at 20% 30%, hsl(220, 12%, 90%) 0%, transparent 40%), radial-gradient(at 80% 20%, hsl(240, 10%, 92%) 0%, transparent 40%), radial-gradient(at 40% 80%, hsl(210, 11%, 91%) 0%, transparent 40%)',
              filter: 'blur(50px)',
            }}
          />
        </div>

        {/* Sweep layer */}
        <div className="absolute inset-0 opacity-20 dark:opacity-15">
          <div 
            className="absolute inset-0 animate-gradient-sweep-morph"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 50%, hsl(230, 10%, 88%) 0%, transparent 50%)',
              filter: 'blur(60px)',
            }}
          />
        </div>
        
        {/* Overlay gradient */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 8%, 92%) 0%, transparent 30%, hsl(var(--primary) / 0.05) 50%, transparent 70%)',
          }}
        />
      </div>
      
      {/* ORSH Sidebar */}
      <OrshSidebar 
        userName="Daniel"
        userTitle="ORA Engr."
        language="en"
        breadcrumbs={getBreadcrumbs()}
      />
      
      <div className="flex-1 relative z-10 overflow-auto">
      {/* Header */}
      <header className="fluent-navigation sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="fluent-button hover:bg-secondary/80 group"
              >
                <ArrowLeft className="h-4 w-4 mr-3 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="font-medium">Back to Dashboard</span>
              </Button>
              
              <div className="h-8 w-px bg-border"></div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Safe Start-Up</h1>
                  <p className="text-sm text-muted-foreground font-medium">Pre-Start-Up Safety Review System</p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
              {userRole === 'admin' && (
                <Button 
                  variant="outline"
                  onClick={() => setActiveView('manage-checklist')}
                  className="fluent-button border-border/50 hover:bg-secondary/50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Checklists
                </Button>
              )}
              <Button 
                onClick={() => setActiveView('create')}
                className="fluent-button bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg group"
              >
                <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                New PSSR
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="fluent-card bg-card/60 backdrop-blur-sm border-border/40 hover:bg-muted/20 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total PSSRs</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Active reviews
              </p>
            </CardContent>
          </Card>

          <Card className="fluent-card bg-card/60 backdrop-blur-sm border-border/40 hover:bg-muted/20 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-success">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">
                Completed reviews
              </p>
            </CardContent>
          </Card>

          <Card className="fluent-card bg-card/60 backdrop-blur-sm border-border/40 hover:bg-muted/20 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-warning">{stats.underReview}</div>
              <p className="text-xs text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card className="fluent-card bg-card/60 backdrop-blur-sm border-border/40 hover:bg-muted/20 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">
                Not submitted
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="fluent-card p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search PSSR by Project ID, Asset, Lead..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 h-12 rounded-xl border-border/50 bg-muted/20 focus:bg-background transition-colors duration-200"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <PSSRFilters
                filters={filters}
                onToggleFilter={toggleFilter}
                onClearFilters={clearAllFilters}
                uniquePlants={uniquePlants}
                uniqueStatuses={uniqueStatuses}
                uniqueLeads={uniqueLeads}
              />
            </div>
          </div>
        </Card>

        {/* PSSR List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-foreground">
                PSSR Reviews ({filteredPSSRs.length})
              </h2>
              
              {/* View Mode Toggle - Modern Pill Style */}
              <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-muted/50 border border-border/30 backdrop-blur-sm">
                <button
                  onClick={() => setViewMode('card')}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-all duration-200 ease-out
                    ${viewMode === 'card' 
                      ? 'bg-background text-foreground shadow-sm scale-[1.02]' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }
                  `}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-all duration-200 ease-out
                    ${viewMode === 'table' 
                      ? 'bg-background text-foreground shadow-sm scale-[1.02]' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    }
                  `}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Showing {filteredPSSRs.length} of {stats.total} reviews</span>
              {filteredPSSRs.length > 0 && viewMode === 'card' && (
                <span className="text-xs bg-muted/50 px-2 py-1 rounded-lg">
                  💡 Drag cards to reorder
                </span>
              )}
            </div>
          </div>

          {viewMode === 'table' ? (
            <PSSRTableView 
              pssrs={filteredPSSRs}
              onViewDetails={handleViewDetails}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredPSSRs.map(pssr => pssr.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4">
                  {filteredPSSRs.map((pssr, index) => (
                    <DraggablePSSRCard
                      key={pssr.id}
                      pssr={pssr}
                      index={index}
                      onViewDetails={handleViewDetails}
                      getPriorityColor={getPriorityColor}
                      getStatusIcon={getStatusIcon}
                      getTeamStatusColor={getTeamStatusColor}
                      getRiskLevelColor={getRiskLevelColor}
                      isPinned={pinnedPSSRs.includes(pssr.id)}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeDragId ? (
                  <div className="fluent-card p-5 shadow-2xl bg-background/95 backdrop-blur-md border-2 border-primary/50">
                    <div className="text-center">
                      <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="font-semibold text-foreground">Moving PSSR...</p>
                      <p className="text-sm text-muted-foreground">
                        {filteredPSSRs.find(p => p.id === activeDragId)?.projectId}
                      </p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {filteredPSSRs.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {pssrList.length === 0 ? 'No PSSR Reviews Yet' : 'No PSSR Reviews Found'}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {pssrList.length === 0 
                    ? 'Get started by creating your first Pre-Start-Up Safety Review to ensure safe facility operations.'
                    : searchTerm || filters.plant.length || filters.status.length || filters.lead.length
                      ? 'Try adjusting your search criteria or filters to find more reviews.'
                      : 'No PSSR reviews are available at the moment.'
                  }
                </p>
                <Button 
                  onClick={() => setShowCreateIntro(true)}
                  className="fluent-button bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New PSSR
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
};

export default SafeStartupSummaryPage;