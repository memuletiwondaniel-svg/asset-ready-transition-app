
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
import { Plus, ClipboardList, AlertTriangle, CheckCircle, Clock, Search, Filter, MoreVertical, Users, Calendar, Pin, PinOff, ShieldCheck, Settings, LayoutGrid, LayoutList, Kanban } from 'lucide-react';
import { Input } from '@/components/ui/input';

import PSSRDetails from '@/components/PSSRDetails';
import PSSRFilters from './PSSRFilters';
import PSSRList from './PSSRList';
import DraggablePSSRCard from './DraggablePSSRCard';

import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';

const PSSRModule: React.FC = () => {
  // Mock user role - in a real app, this would come from authentication context
  const userRole = 'admin'; // Change to 'user' to test role-based access
  
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details'>('list');
  const [selectedPSSR, setSelectedPSSR] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [pssrOrder, setPssrOrder] = useState<string[]>([]);
  const [pinnedPSSRs, setPinnedPSSRs] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'kanban' | 'table'>('table');
  const [filters, setFilters] = useState({
    plant: [] as string[],
    status: [] as string[],
    lead: [] as string[],
    dateFrom: '',
    dateTo: ''
  });

  // Mock PSSR data with enhanced structure
  const pssrList = [
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
      teamStatus: 'green', // Team availability status
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
      teamStatus: 'red', // Team has issues
      pendingApprovals: 0,
      completedDate: null,
      riskLevel: 'Low',
      nextReview: '2024-02-20',
      teamMembers: 5,
      lastActivity: '1 day ago',
      location: 'Kazachstan',
      tier: 3 as 1 | 2 | 3
    },
    {
      id: 'PSSR-2024-003',
      projectId: 'DP 083',
      projectName: 'UQ Jetty 2 Export Terminal',
      asset: 'UQ',
      status: 'Completed',
      priority: 'High',
      progress: 100,
      created: '2024-01-10',
      pssrLead: 'Mohammed Hassan',
      pssrLeadAvatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
      teamStatus: 'amber', // Team partially available
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
      teamStatus: 'red', // Team unavailable/issues
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

  // Initialize PSSR order on first render
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
  const stats = {
    total: pssrList.length,
    approved: pssrList.filter(p => p.status === 'Approved').length,
    underReview: pssrList.filter(p => p.status === 'Under Review').length,
    draft: pssrList.filter(p => p.status === 'Draft').length,
    criticalIssues: pssrList.filter(p => p.priority === 'Critical').length
  };

  // Memoized filter logic for better performance with drag and drop ordering
  const filteredPSSRs = useMemo(() => {
    // First apply filters
    const filtered = pssrList.filter(pssr => {
      // Search term filter - case insensitive and trims whitespace
      const searchQuery = searchTerm.toLowerCase().trim();
      const matchesSearch = searchQuery === '' || 
        pssr.id.toLowerCase().includes(searchQuery) ||
        pssr.projectId.toLowerCase().includes(searchQuery) ||
        pssr.projectName.toLowerCase().includes(searchQuery) ||
        pssr.asset.toLowerCase().includes(searchQuery) ||
        pssr.pssrLead.toLowerCase().includes(searchQuery) ||
        pssr.status.toLowerCase().includes(searchQuery);

      // Plant filter
      const matchesPlant = filters.plant.length === 0 || filters.plant.includes(pssr.asset);
      
      // Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(pssr.status);
      
      // Lead filter
      const matchesLead = filters.lead.length === 0 || filters.lead.includes(pssr.pssrLead);

      return matchesSearch && matchesPlant && matchesStatus && matchesLead;
    });

    // Sort with pinned items first, then by custom order
    return filtered.sort((a, b) => {
      const aPinned = pinnedPSSRs.includes(a.id);
      const bPinned = pinnedPSSRs.includes(b.id);
      
      // Pinned items come first
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      // If both pinned or both unpinned, use custom order
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
      lead: [],
      dateFrom: '',
      dateTo: ''
    });
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

  const handleTogglePin = (pssrId: string) => {
    setPinnedPSSRs(prev => 
      prev.includes(pssrId) 
        ? prev.filter(id => id !== pssrId)
        : [...prev, pssrId]
    );
  };

  // Handle search input change with real-time filtering
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
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

  if (activeView === 'details' && selectedPSSR) {
    return (
      <PSSRDetails 
        pssrId={selectedPSSR} 
        onBack={() => setActiveView('list')} 
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Modern Microsoft Fluent Dynamic Background */}
      <div className="absolute inset-0 bg-background">
        {/* Multiple animated gradient layers for richer appearance */}
        <div className="absolute inset-0 opacity-70 dark:opacity-50">
          <div 
            className="absolute inset-0 animate-gradient-shift"
            style={{
              background: 'radial-gradient(at 20% 30%, hsl(210, 100%, 65%) 0%, transparent 40%), radial-gradient(at 80% 20%, hsl(280, 95%, 70%) 0%, transparent 40%), radial-gradient(at 40% 80%, hsl(200, 90%, 75%) 0%, transparent 40%), radial-gradient(at 90% 70%, hsl(320, 85%, 73%) 0%, transparent 40%), radial-gradient(at 50% 50%, hsl(250, 80%, 70%) 0%, transparent 35%)',
              filter: 'blur(70px)',
            }}
          />
        </div>
        
        {/* Secondary animated layer with opposite movement */}
        <div className="absolute inset-0 opacity-40 dark:opacity-30">
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(at 70% 40%, hsl(180, 85%, 70%) 0%, transparent 45%), radial-gradient(at 30% 70%, hsl(300, 80%, 75%) 0%, transparent 45%)',
              filter: 'blur(90px)',
              animation: 'gradient-shift 20s ease-in-out infinite reverse',
            }}
          />
        </div>
        
        {/* Overlay gradient for depth and richness */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 70%, 85%) 0%, transparent 30%, hsl(var(--primary) / 0.15) 50%, transparent 70%, hsl(280, 60%, 80%) 100%)'
          }}
        />
        
        {/* Subtle geometric pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--primary)) 1px, transparent 1px),
                             radial-gradient(circle at 80% 80%, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Enhanced noise texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-soft-light" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'4\' numOctaves=\'5\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")'
        }} />
      </div>
      
      <div className="relative z-10">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xl p-4 md:p-6">
        <BreadcrumbNavigation currentPageLabel="PSSR" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
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
          
          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              className="border-border/50 hover:bg-secondary/50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={() => setActiveView('create')}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              New PSSR
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* Search and Filters */}
        <div className="fluent-card p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {/* PSSR Reviews Title */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              PSSR Reviews ({filteredPSSRs.length})
            </h2>
            <p className="text-sm text-muted-foreground mt-1 ml-4">
              Showing {filteredPSSRs.length} of {stats.total} reviews
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search PSSR by Project ID, Asset, Lead..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 h-12 rounded-xl border-border/50 bg-muted/20 focus:bg-background transition-colors duration-200"
              />
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* View Mode Selector */}
              <div className="flex items-center gap-1 bg-muted border border-border/50 rounded-lg p-1 shadow-sm">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="h-4 w-4 mr-1.5" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="h-8 px-3"
                >
                  <Kanban className="h-4 w-4 mr-1.5" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3"
                >
                  <LayoutList className="h-4 w-4 mr-1.5" />
                  Table
                </Button>
              </div>
              
              <PSSRFilters
                filters={filters}
                onToggleFilter={toggleFilter}
                onDateChange={handleDateChange}
                onClearFilters={clearAllFilters}
                uniquePlants={uniquePlants}
                uniqueStatuses={uniqueStatuses}
                uniqueLeads={uniqueLeads}
              />
            </div>
          </div>
        </div>

        {/* Enhanced PSSR List with Drag and Drop */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>

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

          {filteredPSSRs.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-muted-foreground mb-2">No PSSR Reviews Found</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {searchTerm || filters.plant.length || filters.status.length || filters.lead.length
                  ? 'Try adjusting your search criteria or filters to find more reviews.'
                  : 'Get started by creating your first PSSR review.'
                }
              </p>
              {(!searchTerm && !filters.plant.length && !filters.status.length && !filters.lead.length) && (
                <Button 
                  onClick={() => setActiveView('create')}
                  className="mt-4 fluent-button bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First PSSR
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
};

export default PSSRModule;
