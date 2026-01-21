import React, { useState, useRef, useEffect } from 'react';
import { WidgetCard } from './WidgetCard';
import { LayoutGrid, Table as TableIcon, Columns3, Plus } from 'lucide-react';
import PSSRAdvancedSearch from '../PSSRAdvancedSearch';
import PSSRFilters from '../PSSRFilters';
import PSSRTableView from '../PSSRTableView';
import PSSRKanbanBoard from '../PSSRKanbanBoard';
import DraggablePSSRCard from '../DraggablePSSRCard';
import { PSSRQuickStatsBar } from './PSSRQuickStatsBar';
import { Button } from '@/components/ui/button';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface PSSRReviewsWidgetProps {
  pssrs: any[];
  filteredPSSRs: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectPSSR: (pssrId: string) => void;
  viewMode: 'card' | 'table' | 'kanban';
  onViewModeChange: (mode: 'card' | 'table' | 'kanban') => void;
  filters: any;
  onToggleFilter: (category: string, value: string) => void;
  onDateChange: (field: string, value: string) => void;
  onClearFilters: () => void;
  uniquePlants: string[];
  uniqueStatuses: string[];
  uniqueLeads: string[];
  onViewDetails: (pssrId: string) => void;
  getPriorityColor: (priority: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getTeamStatusColor: (teamStatus: string) => string;
  getRiskLevelColor: (riskLevel: string) => string;
  pinnedPSSRs: string[];
  onTogglePin: (pssrId: string) => void;
  onStatusChange?: (pssrId: string, newStatus: string) => void;
  onPSSROrderChange?: (newOrder: string[]) => void;
  pssrOrder?: string[];
  isExpanded?: boolean;
  isVisible?: boolean;
  onToggleExpand?: () => void;
  onToggleVisibility?: () => void;
  dragAttributes?: any;
  dragListeners?: any;
  // Stats bar props
  stats?: {
    total: number;
    underReview: number;
    draft: number;
    completed: number;
  };
  activeStatFilter?: 'all' | 'under-review' | 'draft' | 'completed';
  onStatFilterClick?: (filter: 'all' | 'under-review' | 'draft' | 'completed') => void;
  onCreateNew?: () => void;
}

export const PSSRReviewsWidget: React.FC<PSSRReviewsWidgetProps> = ({
  pssrs,
  filteredPSSRs,
  searchTerm,
  onSearchChange,
  onSelectPSSR,
  viewMode,
  onViewModeChange,
  filters,
  onToggleFilter,
  onDateChange,
  onClearFilters,
  uniquePlants,
  uniqueStatuses,
  uniqueLeads,
  onViewDetails,
  getPriorityColor,
  getStatusIcon,
  getTeamStatusColor,
  getRiskLevelColor,
  pinnedPSSRs,
  onTogglePin,
  onStatusChange,
  onPSSROrderChange,
  pssrOrder,
  isExpanded,
  isVisible,
  onToggleExpand,
  onToggleVisibility,
  dragAttributes,
  dragListeners,
  stats,
  activeStatFilter,
  onStatFilterClick,
  onCreateNew,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 10);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onPSSROrderChange) {
      const oldIndex = filteredPSSRs.findIndex(p => p.id === active.id);
      const newIndex = filteredPSSRs.findIndex(p => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedPSSRs = arrayMove(filteredPSSRs, oldIndex, newIndex);
        onPSSROrderChange(reorderedPSSRs.map(p => p.id));
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activePSSR = filteredPSSRs.find(p => p.id === activeId);

  return (
    <WidgetCard
      title="Reviews"
      isExpanded={isExpanded}
      isVisible={isVisible}
      onToggleExpand={onToggleExpand}
      onToggleVisibility={onToggleVisibility}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
      className="flex flex-col h-[600px] w-full"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Combined Controls Bar - Stats inline with Search */}
        <div className={`sticky top-0 z-10 bg-card pb-3 border-b border-border/40 transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : ''
        }`}>
          <div className="flex flex-nowrap items-center gap-3 mb-3 overflow-x-auto">
            {/* Stats Filter Chips - Left */}
            {stats && onStatFilterClick && (
              <div className="shrink-0">
                <PSSRQuickStatsBar
                  stats={stats}
                  activeFilter={activeStatFilter || 'all'}
                  onFilterClick={onStatFilterClick}
                />
              </div>
            )}
            
            {/* Flexible Spacer */}
            <div className="flex-1 min-w-0" />
            
            {/* Search */}
            <div className="shrink-0 min-w-[280px]">
              <PSSRAdvancedSearch
                pssrs={pssrs}
                value={searchTerm}
                onChange={onSearchChange}
                onSelectPSSR={onSelectPSSR}
                placeholder="Search by ID, project, asset, lead..."
                className="w-full"
              />
            </div>

            {/* View Mode Selector */}
            <div className="shrink-0 inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted border border-border/50">
              <button
                onClick={() => onViewModeChange('card')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onViewModeChange('kanban')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onViewModeChange('table')}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <PSSRFilters
              filters={filters}
              onToggleFilter={onToggleFilter}
              onDateChange={onDateChange}
              onClearFilters={onClearFilters}
              uniquePlants={uniquePlants}
              uniqueStatuses={uniqueStatuses}
              uniqueLeads={uniqueLeads}
            />

            {onCreateNew && (
              <div className="shrink-0">
                <Button 
                  onClick={onCreateNew} 
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  New PSSR
                </Button>
              </div>
            )}
          </div>

          {/* Results Count */}
          <p className="text-xs text-muted-foreground">
            Showing {filteredPSSRs.length} of {pssrs.length} reviews
          </p>
        </div>

        {/* Content Views - Scrollable Area with fixed height to prevent resizing */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1 pt-4"
        >
          {viewMode === 'table' ? (
            <PSSRTableView pssrs={filteredPSSRs} onViewDetails={onViewDetails} />
          ) : viewMode === 'kanban' ? (
            <PSSRKanbanBoard
              pssrs={filteredPSSRs}
              onViewDetails={onViewDetails}
              getPriorityColor={getPriorityColor}
              getStatusIcon={getStatusIcon}
              getTeamStatusColor={getTeamStatusColor}
              getRiskLevelColor={getRiskLevelColor}
              pinnedPSSRs={new Set(pinnedPSSRs)}
              onTogglePin={onTogglePin}
              onStatusChange={onStatusChange}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={filteredPSSRs.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {filteredPSSRs.map((pssr, idx) => (
                    <DraggablePSSRCard
                      key={pssr.id}
                      pssr={pssr}
                      index={idx}
                      onViewDetails={onViewDetails}
                      getPriorityColor={getPriorityColor}
                      getStatusIcon={getStatusIcon}
                      getTeamStatusColor={getTeamStatusColor}
                      getRiskLevelColor={getRiskLevelColor}
                      isPinned={pinnedPSSRs.includes(pssr.id)}
                      onTogglePin={onTogglePin}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId && activePSSR ? (
                  <div className="opacity-80 rotate-2 scale-105">
                    <DraggablePSSRCard
                      pssr={activePSSR}
                      index={0}
                      onViewDetails={onViewDetails}
                      getPriorityColor={getPriorityColor}
                      getStatusIcon={getStatusIcon}
                      getTeamStatusColor={getTeamStatusColor}
                      getRiskLevelColor={getRiskLevelColor}
                      isPinned={pinnedPSSRs.includes(activePSSR.id)}
                      onTogglePin={onTogglePin}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </WidgetCard>
  );
};
