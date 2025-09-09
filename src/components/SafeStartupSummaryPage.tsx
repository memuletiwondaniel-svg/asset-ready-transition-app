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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  ClipboardList, 
  Search, 
  Filter, 
  Settings, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react';
import CreatePSSRIntroModal from './CreatePSSRIntroModal';
import CreatePSSRWorkflow from './CreatePSSRWorkflow';
import PSSRDashboard from './PSSRDashboard';
import PSSRFilters from './PSSRFilters';
import DraggablePSSRCard from './DraggablePSSRCard';
import ManageChecklistPage from './ManageChecklistPage';

interface SafeStartupSummaryPageProps {
  onBack: () => void;
}

// PSSR interface
interface PSSR {
  id: string;
  projectId?: string;
  projectName?: string;
  plant?: string;
  asset: string;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Pending' | 'On Hold';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  progress: number;
  created: string;
  pssrLead: string;
  pssrLeadAvatar: string;
  teamStatus: 'green' | 'amber' | 'red';
  pendingApprovals: number;
  completedDate: string | null;
  riskLevel: 'High' | 'Medium' | 'Low';
  nextReview: string | null;
  teamMembers: number;
  lastActivity: string;
  location: string;
  reason: string;
  scope: string;
  initiator: string;
  checklist?: string;
  linkedPSSRs?: string[];
  totalItems?: number;
  completedItems?: number;
  approvedItems?: number;
}

const SafeStartupSummaryPage: React.FC<SafeStartupSummaryPageProps> = ({ onBack }) => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin';
  
  const [activeView, setActiveView] = useState<'summary' | 'create-intro' | 'create-workflow' | 'dashboard' | 'manage-checklist'>('summary');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [pssrOrder, setPssrOrder] = useState<string[]>([]);
  const [pinnedPSSRs, setPinnedPSSRs] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    plant: [] as string[],
    status: [] as string[],
    lead: [] as string[],
    priority: [] as string[],
    reason: [] as string[]
  });

  // Mock PSSR data - this will be gradually populated as new PSSRs are created
  const [pssrList, setPssrList] = useState<PSSR[]>([
    {
      id: 'PSSR-2024-001',
      projectId: 'DP-300',
      projectName: 'HM Additional Compressors',
      plant: 'Compression Station',
      asset: 'CS - Hassi Messaoud',
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
      reason: 'Start-up or Commissioning of a new Asset',
      scope: 'Installation and commissioning of two new gas compressors including all associated piping, instrumentation, and control systems.',
      initiator: 'Mohammed Hassan',
      checklist: 'Standard Commissioning Checklist',
      totalItems: 45,
      completedItems: 34,
      approvedItems: 28
    },
    {
      id: 'PSSR-2024-002',
      projectId: 'DP-163',
      projectName: 'LPG Unit 12.1 Rehabilitation',
      plant: 'KAZ',
      asset: 'KAZ Processing Unit',
      status: 'Draft',
      priority: 'Medium',
      progress: 30,
      created: '2024-01-20',
      pssrLead: 'Sarah Johnson',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
      teamStatus: 'amber',
      pendingApprovals: 0,
      completedDate: null,
      riskLevel: 'Low',
      nextReview: '2024-02-20',
      teamMembers: 5,
      lastActivity: '1 day ago',
      location: 'Kazakhstan',
      reason: 'Restart following modification to existing Hardware',
      scope: 'Complete rehabilitation of LPG Unit 12.1 including vessel inspection, piping replacement, and control system upgrade.',
      initiator: 'Omar Al-Basri',
      checklist: 'Modification Restart Checklist',
      totalItems: 32,
      completedItems: 10,
      approvedItems: 8
    }
  ]);

  // Initialize PSSR order on first render
  React.useEffect(() => {
    if (pssrOrder.length === 0) {
      setPssrOrder(pssrList.map(pssr => pssr.id));
    }
  }, [pssrOrder.length, pssrList]);

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
  const uniquePlants = [...new Set(pssrList.map(pssr => pssr.plant || pssr.asset))];
  const uniqueStatuses = [...new Set(pssrList.map(pssr => pssr.status))];
  const uniqueLeads = [...new Set(pssrList.map(pssr => pssr.pssrLead))];
  const uniquePriorities = [...new Set(pssrList.map(pssr => pssr.priority))];
  const uniqueReasons = [...new Set(pssrList.map(pssr => pssr.reason))];

  // Dashboard statistics
  const stats = {
    total: pssrList.length,
    approved: pssrList.filter(p => p.status === 'Approved').length,
    underReview: pssrList.filter(p => p.status === 'Under Review').length,
    draft: pssrList.filter(p => p.status === 'Draft').length,
    criticalIssues: pssrList.filter(p => p.priority === 'Critical').length,
    avgProgress: Math.round(pssrList.reduce((acc, p) => acc + p.progress, 0) / pssrList.length) || 0
  };

  // Filtered PSSRs with sorting
  const filteredPSSRs = useMemo(() => {
    const filtered = pssrList.filter(pssr => {
      const searchQuery = searchTerm.toLowerCase().trim();
      const matchesSearch = searchQuery === '' || 
        pssr.id.toLowerCase().includes(searchQuery) ||
        (pssr.projectId && pssr.projectId.toLowerCase().includes(searchQuery)) ||
        (pssr.projectName && pssr.projectName.toLowerCase().includes(searchQuery)) ||
        pssr.asset.toLowerCase().includes(searchQuery) ||
        pssr.pssrLead.toLowerCase().includes(searchQuery) ||
        pssr.status.toLowerCase().includes(searchQuery) ||
        pssr.reason.toLowerCase().includes(searchQuery);

      const matchesPlant = filters.plant.length === 0 || filters.plant.includes(pssr.plant || pssr.asset);
      const matchesStatus = filters.status.length === 0 || filters.status.includes(pssr.status);
      const matchesLead = filters.lead.length === 0 || filters.lead.includes(pssr.pssrLead);
      const matchesPriority = filters.priority.length === 0 || filters.priority.includes(pssr.priority);
      const matchesReason = filters.reason.length === 0 || filters.reason.includes(pssr.reason);

      return matchesSearch && matchesPlant && matchesStatus && matchesLead && matchesPriority && matchesReason;
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

  const toggleFilter = (category: keyof typeof filters, value: string) => {
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
      lead: [],
      priority: [],
      reason: []
    });
  };

  const handleViewDetails = (pssrId: string) => {
    setSelectedPSSR(pssrId);
    setActiveView('dashboard');
  };

  const handleTogglePin = (pssrId: string) => {
    setPinnedPSSRs(prev => 
      prev.includes(pssrId) 
        ? prev.filter(id => id !== pssrId)
        : [...prev, pssrId]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'Under Review': return <Clock className="h-4 w-4 text-warning" />;
      case 'Draft': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'Pending': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'On Hold': return <AlertTriangle className="h-4 w-4 text-destructive" />;
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

  const handleCreatePSSR = () => {
    setActiveView('create-intro');
  };

  const handleContinueToWorkflow = () => {
    setActiveView('create-workflow');
  };

  const handlePSSRCreated = (newPSSR: any) => {
    setPssrList(prev => [...prev, newPSSR]);
    setPssrOrder(prev => [...prev, newPSSR.id]);
    setActiveView('summary');
  };

  const handleBackToSummary = () => {
    setActiveView('summary');
    setSelectedPSSR(null);
  };

  // Conditional rendering based on active view
  if (activeView === 'create-intro') {
    return (
      <CreatePSSRIntroModal
        onCancel={handleBackToSummary}
        onContinue={handleContinueToWorkflow}
      />
    );
  }

  if (activeView === 'create-workflow') {
    return (
      <CreatePSSRWorkflow
        onBack={handleBackToSummary}
        onPSSRCreated={handlePSSRCreated}
      />
    );
  }

  if (activeView === 'dashboard' && selectedPSSR) {
    const pssr = pssrList.find(p => p.id === selectedPSSR);
    return (
      <PSSRDashboard
        pssr={pssr}
        onBack={handleBackToSummary}
      />
    );
  }

  if (activeView === 'manage-checklist') {
    return <ManageChecklistPage onBack={handleBackToSummary} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="hover:bg-secondary/80 group"
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
                  <h1 className="text-2xl font-bold text-foreground">Safe Start-Up Summary</h1>
                  <p className="text-sm text-muted-foreground font-medium">Pre-Start-Up Safety Review System</p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
              <Button 
                variant="outline"
                className="border-border/50 hover:bg-secondary/50"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              {userRole === 'admin' && (
                <Button 
                  variant="outline"
                  onClick={() => setActiveView('manage-checklist')}
                  className="border-border/50 hover:bg-secondary/50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Checklists
                </Button>
              )}
              <Button 
                onClick={handleCreatePSSR}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg group"
              >
                <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                Create New PSSR
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total PSSRs</CardTitle>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                Active reviews
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              <div className="text-2xl font-bold text-success">{stats.approved}</div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed reviews
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
              <div className="text-2xl font-bold text-warning">{stats.underReview}</div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                In progress
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
              <div className="text-2xl font-bold text-muted-foreground">{stats.draft}</div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center text-xs text-muted-foreground">
                <FileText className="h-3 w-3 mr-1" />
                Not submitted
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Progress</CardTitle>
              <div className="text-2xl font-bold text-primary">{stats.avgProgress}%</div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center text-xs text-muted-foreground">
                <BarChart3 className="h-3 w-3 mr-1" />
                Overall completion
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search PSSR by ID, Project, Asset, Lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                uniquePriorities={uniquePriorities}
                uniqueReasons={uniqueReasons}
              />
            </div>
          </div>
        </Card>

        {/* PSSR List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              PSSR Reviews ({filteredPSSRs.length})
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Showing {filteredPSSRs.length} of {stats.total} reviews</span>
              {filteredPSSRs.length > 0 && (
                <span className="text-xs bg-muted/50 px-2 py-1 rounded-lg">
                  💡 Drag cards to reorder
                </span>
              )}
            </div>
          </div>

          {filteredPSSRs.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <ClipboardList className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No PSSR Reviews Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  {searchTerm || Object.values(filters).some(f => f.length > 0)
                    ? 'Try adjusting your search criteria or filters to find more reviews.'
                    : 'Get started by creating your first Pre-Start-Up Safety Review to manage safe facility operations.'
                  }
                </p>
                <Button onClick={handleCreatePSSR} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First PSSR
                </Button>
              </div>
            </Card>
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
                  <Card className="p-5 shadow-2xl bg-background/95 backdrop-blur-md border-2 border-primary/50">
                    <div className="text-center">
                      <ClipboardList className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="font-semibold text-foreground">Moving PSSR...</p>
                      <p className="text-sm text-muted-foreground">
                        {filteredPSSRs.find(p => p.id === activeDragId)?.id}
                      </p>
                    </div>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>
    </div>
  );
};

export default SafeStartupSummaryPage;