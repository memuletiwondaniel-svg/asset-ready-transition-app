import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, Plus, Search, LayoutGrid, Table, CheckCircle2 } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PSSRReviewsPanel } from '@/components/tasks/PSSRReviewsPanel';
import { ORPActivitiesPanel } from '@/components/tasks/ORPActivitiesPanel';
import { OWLPanel } from '@/components/tasks/OWLPanel';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { AllTasksTable } from '@/components/tasks/AllTasksTable';
import { RecentlyCompletedTasks } from '@/components/tasks/RecentlyCompletedTasks';
import { DirectorSoFView } from '@/components/tasks/DirectorSoFView';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { useUserIsDirector } from '@/hooks/useUserIsDirector';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type ViewMode = 'grid' | 'table';
type ExpandedCard = 'pssr' | 'ora' | 'owl' | null;

const PANEL_ORDER = ['pssr', 'ora', 'owl'] as const;

const MyTasksPage: React.FC = () => {
  const { user } = useAuth();
  const { updateLastLogin } = useUserLastLogin();
  const { data: isDirector, isLoading: isDirectorLoading } = useUserIsDirector();
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null);
  
  const [panelTaskCounts, setPanelTaskCounts] = useState<Record<string, number>>({});
  const [panelsLoaded, setPanelsLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      updateLastLogin();
    }, 5000);
    return () => clearTimeout(timer);
  }, [updateLastLogin]);

  // Fallback: if panels haven't reported in 3s, show content anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPanelsLoaded(prev => ({ pssr: true, ora: true, owl: true, ...prev }));
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Auto-expand logic: if only one panel has tasks, expand it
  useEffect(() => {
    const panelsWithTasks = Object.entries(panelTaskCounts)
      .filter(([_, count]) => count > 0)
      .map(([panelId]) => panelId);
    
    if (panelsWithTasks.length === 1 && expandedCard === null) {
      setExpandedCard(panelsWithTasks[0] as ExpandedCard);
    }
  }, [panelTaskCounts, expandedCard]);

  const handleCardExpand = (cardId: ExpandedCard) => {
    setExpandedCard(prev => prev === cardId ? null : cardId);
  };

  const handlePssrTaskCount = useCallback((count: number) => {
    setPanelTaskCounts(prev => prev.pssr === count ? prev : { ...prev, pssr: count });
    setPanelsLoaded(prev => prev.pssr ? prev : { ...prev, pssr: true });
  }, []);

  const handleOraTaskCount = useCallback((count: number) => {
    setPanelTaskCounts(prev => prev.ora === count ? prev : { ...prev, ora: count });
    setPanelsLoaded(prev => prev.ora ? prev : { ...prev, ora: true });
  }, []);

  const handleOwlTaskCount = useCallback((count: number) => {
    setPanelTaskCounts(prev => prev.owl === count ? prev : { ...prev, owl: count });
    setPanelsLoaded(prev => prev.owl ? prev : { ...prev, owl: true });
  }, []);

  const allPanelsLoaded = panelsLoaded.pssr && panelsLoaded.ora && panelsLoaded.owl;
  const totalTasks = (panelTaskCounts.pssr || 0) + (panelTaskCounts.ora || 0) + (panelTaskCounts.owl || 0);
  const isAllCaughtUp = allPanelsLoaded && totalTasks === 0;

  if (!user) {
    return null;
  }

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

  if (isDirector) {
    const userName = user.user_metadata?.full_name || user.user_metadata?.first_name || user.email;
    return (
      <div className="min-h-screen">
        <div className="border-b border-border/40 bg-card/30 backdrop-blur-xl p-4 md:p-6">
          <BreadcrumbNavigation currentPageLabel="My Tasks" />
          <div className="flex items-center gap-3 mt-4">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
              <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
              <p className="text-sm text-muted-foreground mt-1">Your pending work across all modules</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <DirectorSoFView userName={userName} />
        </div>
      </div>
    );
  }

  // 3 panels layout
  const getColumnLayout = () => {
    if (!expandedCard) {
      return {
        leftColumn: ['pssr'] as const,
        rightColumn: ['ora', 'owl'] as const,
        expandedSide: null as 'left' | 'right' | null
      };
    }

    const otherCards = PANEL_ORDER.filter(card => card !== expandedCard);
    return {
      leftColumn: [expandedCard] as const,
      rightColumn: otherCards as readonly ('pssr' | 'ora' | 'owl')[],
      expandedSide: 'left' as const
    };
  };

  const layout = getColumnLayout();

  const renderCard = (cardId: string, isInExpandedColumn: boolean) => {
    const isThisCardExpanded = expandedCard === cardId;
    const isFullHeight = isInExpandedColumn && isThisCardExpanded;
    const isDimmed = expandedCard !== null && !isThisCardExpanded;

    const commonProps = {
      isExpanded: isThisCardExpanded,
      onToggleExpand: () => handleCardExpand(cardId as ExpandedCard),
      isFullHeight,
      isRelocated: false,
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
            onTaskCountUpdate={handlePssrTaskCount}
          />
        );
      case 'ora':
        return (
          <ORPActivitiesPanel 
            key="ora"
            {...commonProps}
            onTaskCountUpdate={handleOraTaskCount}
          />
        );
      case 'owl':
        return (
          <OWLPanel 
            key="owl"
            {...commonProps}
            onTaskCountUpdate={handleOwlTaskCount}
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
            <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">Your pending work across all modules</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
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
            <div className="flex items-center border rounded-lg p-1 bg-muted/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn("h-8 w-8 p-0", viewMode === 'grid' && "bg-background shadow-sm")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn("h-8 w-8 p-0", viewMode === 'table' && "bg-background shadow-sm")}
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

        {/* Hidden panels always mounted for continuous count reporting & self-healing */}
        <div className="sr-only" aria-hidden="true">
          <PSSRReviewsPanel
            key="pssr-hidden"
            userId={user.id}
            isExpanded={false}
            onToggleExpand={() => {}}
            isFullHeight={false}
            isRelocated={false}
            isDimmed={false}
            searchQuery=""
            onTaskCountUpdate={handlePssrTaskCount}
          />
          <ORPActivitiesPanel
            key="ora-hidden"
            isExpanded={false}
            onToggleExpand={() => {}}
            isFullHeight={false}
            isRelocated={false}
            isDimmed={false}
            searchQuery=""
            onTaskCountUpdate={handleOraTaskCount}
          />
          <OWLPanel
            key="owl-hidden"
            isExpanded={false}
            onToggleExpand={() => {}}
            isFullHeight={false}
            isRelocated={false}
            isDimmed={false}
            searchQuery=""
            onTaskCountUpdate={handleOwlTaskCount}
          />
        </div>

        {!allPanelsLoaded ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md space-y-4">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>
        ) : isAllCaughtUp ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/10 mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">You're all caught up!</h2>
              <p className="text-muted-foreground">You have no pending activities or reviews at the moment.</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={cn(
            "grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500",
            expandedCard && "min-h-[calc(100vh-300px)]"
          )}>
            <div className={cn(
              "flex flex-col gap-6 transition-all duration-500",
              layout.expandedSide === 'left' && "h-full"
            )}>
              {layout.leftColumn.map((cardId) => {
                const isExpanded = expandedCard === cardId;
                return (
                  <div 
                    key={cardId}
                    className={cn(
                      "transition-all duration-500",
                      layout.expandedSide === 'left' && isExpanded && "flex-1 min-h-0"
                    )}
                  >
                    {renderCard(cardId, layout.expandedSide === 'left')}
                  </div>
                );
              })}
            </div>

            <div className={cn(
              "flex flex-col gap-6 transition-all duration-500",
              layout.expandedSide === 'right' && "h-full"
            )}>
              {layout.rightColumn.map((cardId) => {
                const isExpanded = expandedCard === cardId;
                return (
                  <div 
                    key={cardId}
                    className={cn(
                      "transition-all duration-500",
                      layout.expandedSide === 'right' && isExpanded && "flex-1 min-h-0"
                    )}
                  >
                    {renderCard(cardId, layout.expandedSide === 'right')}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <AllTasksTable searchQuery={searchQuery} userId={user.id} />
        )}

        <RecentlyCompletedTasks searchQuery={searchQuery} />
      </div>

      <NewTaskModal 
        open={createTaskModalOpen} 
        onOpenChange={setCreateTaskModalOpen}
      />
    </div>
  );
};

export default MyTasksPage;
