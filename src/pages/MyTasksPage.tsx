import React, { useEffect, useState } from 'react';
import { ListChecks, Plus, Search, LayoutGrid, Table } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PSSRReviewsPanel } from '@/components/tasks/PSSRReviewsPanel';
import { ORPActivitiesPanel } from '@/components/tasks/ORPActivitiesPanel';
import { OWLPanel } from '@/components/tasks/OWLPanel';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { AllTasksTable } from '@/components/tasks/AllTasksTable';
import { DirectorSoFView } from '@/components/tasks/DirectorSoFView';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { useUserIsDirector } from '@/hooks/useUserIsDirector';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type ViewMode = 'grid' | 'table';
type ExpandedCard = 'pssr' | 'ora' | 'owl' | null;

// For regular users: 3 panels (removed handover)
const PANEL_ORDER = ['pssr', 'ora', 'owl'] as const;

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { updateLastLogin } = useUserLastLogin();
  const { data: isDirector, isLoading: isDirectorLoading } = useUserIsDirector();
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null);
  
  // Track which panels have tasks (for auto-expand)
  const [panelTaskCounts, setPanelTaskCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      updateLastLogin();
    }, 5000);
    return () => clearTimeout(timer);
  }, [updateLastLogin]);

  // Auto-expand logic: if only one panel has tasks, expand it
  useEffect(() => {
    const panelsWithTasks = Object.entries(panelTaskCounts)
      .filter(([_, count]) => count > 0)
      .map(([panelId]) => panelId);
    
    // Only auto-expand if exactly one panel has tasks and nothing is currently expanded
    if (panelsWithTasks.length === 1 && expandedCard === null) {
      setExpandedCard(panelsWithTasks[0] as ExpandedCard);
    }
  }, [panelTaskCounts, expandedCard]);

  const handleCardExpand = (cardId: ExpandedCard) => {
    setExpandedCard(prev => prev === cardId ? null : cardId);
  };

  // Callback for panels to report their task count
  const handleTaskCountUpdate = (panelId: string, count: number) => {
    setPanelTaskCounts(prev => {
      if (prev[panelId] === count) return prev;
      return { ...prev, [panelId]: count };
    });
  };

  if (!user) {
    return null;
  }

  // Show loading state while checking director status
  if (isDirectorLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Directors get the simplified SoF-only view
  if (isDirector) {
    const userName = user.user_metadata?.full_name || user.user_metadata?.first_name || user.email;
    return <DirectorSoFView userName={userName} />;
  }


  // Determine column layout for 3 panels
  const getColumnLayout = () => {
    if (!expandedCard) {
      // Default: PSSR left top, ORA left bottom, OWL right
      return {
        leftColumn: ['pssr', 'ora'] as const,
        rightColumn: ['owl'] as const,
        expandedSide: null as 'left' | 'right' | null
      };
    }

    // Expanded card goes to left, others to right
    const otherCards = PANEL_ORDER.filter(card => card !== expandedCard);
    
    return {
      leftColumn: [expandedCard] as const,
      rightColumn: otherCards as readonly ('pssr' | 'ora' | 'owl')[],
      expandedSide: 'left' as const
    };
  };

  const layout = getColumnLayout();

  // Determine which cards are relocated
  const getRelocatedCards = () => {
    switch (expandedCard) {
      case 'pssr': return ['ora'];
      case 'ora': return ['pssr'];
      case 'owl': return ['pssr', 'ora'];
      default: return [];
    }
  };
  const relocatedCards = getRelocatedCards();

  const renderCard = (cardId: string, isInExpandedColumn: boolean, isRelocated: boolean) => {
    const isThisCardExpanded = expandedCard === cardId;
    const isFullHeight = isInExpandedColumn && isThisCardExpanded;
    const isDimmed = expandedCard !== null && !isThisCardExpanded;

    const commonProps = {
      isExpanded: isThisCardExpanded,
      onToggleExpand: () => handleCardExpand(cardId as ExpandedCard),
      isFullHeight,
      isRelocated,
      isDimmed,
      searchQuery,
    };

    switch (cardId) {
      case 'pssr':
        return (
          <PSSRReviewsPanel 
            key="pssr"
            userId={user.id} 
            {...commonProps}
          />
        );
      case 'ora':
        return (
          <ORPActivitiesPanel 
            key="ora"
            {...commonProps}
          />
        );
      case 'owl':
        return (
          <OWLPanel 
            key="owl"
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
        <BreadcrumbNavigation currentPageLabel="My Tasks" />
        
        <div className="flex items-center gap-3 mt-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
            <ListChecks className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your pending work across all modules
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Search and Actions Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1 bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-8 w-8 p-0",
                  viewMode === 'grid' && "bg-background shadow-sm"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-8 w-8 p-0",
                  viewMode === 'table' && "bg-background shadow-sm"
                )}
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              size="sm"
              onClick={() => setCreateTaskModalOpen(true)}
              className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'grid' ? (
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500",
            expandedCard && "min-h-[calc(100vh-300px)]"
          )}>
            {/* Left Column */}
            <div className={cn(
              "flex flex-col gap-6 transition-all duration-500",
              layout.expandedSide === 'left' && "h-full"
            )}>
              {layout.leftColumn.map((cardId) => {
                const isRelocated = relocatedCards.includes(cardId);
                const isExpanded = expandedCard === cardId;
                
                return (
                  <div 
                    key={cardId}
                    className={cn(
                      "transition-all duration-500",
                      layout.expandedSide === 'left' && isExpanded && "flex-1 min-h-0"
                    )}
                  >
                    {renderCard(cardId, layout.expandedSide === 'left', isRelocated)}
                  </div>
                );
              })}
            </div>

            {/* Right Column */}
            <div className={cn(
              "flex flex-col gap-6 transition-all duration-500",
              layout.expandedSide === 'right' && "h-full"
            )}>
              {layout.rightColumn.map((cardId) => {
                const isRelocated = relocatedCards.includes(cardId);
                const isExpanded = expandedCard === cardId;
                
                return (
                  <div 
                    key={cardId}
                    className={cn(
                      "transition-all duration-500",
                      layout.expandedSide === 'right' && isExpanded && "flex-1 min-h-0"
                    )}
                  >
                    {renderCard(cardId, layout.expandedSide === 'right', isRelocated)}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <AllTasksTable searchQuery={searchQuery} userId={user.id} />
        )}
      </div>

      <NewTaskModal 
        open={createTaskModalOpen} 
        onOpenChange={setCreateTaskModalOpen}
      />
    </div>
  );
};

export default MyTasksPage;
