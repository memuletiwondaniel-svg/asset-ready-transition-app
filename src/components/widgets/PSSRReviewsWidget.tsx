import React, { useState, useRef, useEffect } from 'react';
import { WidgetCard } from './WidgetCard';
import { LayoutGrid, Table as TableIcon, Columns3 } from 'lucide-react';
import PSSRAdvancedSearch from '../PSSRAdvancedSearch';
import PSSRFilters from '../PSSRFilters';
import PSSRTableView from '../PSSRTableView';
import PSSRKanbanBoard from '../PSSRKanbanBoard';
import DraggablePSSRCard from '../DraggablePSSRCard';
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
  dragListeners
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
      className="flex flex-col h-[600px]"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Search and View Controls - Sticky with scroll shadow */}
        <div className={`sticky top-0 z-10 bg-card pb-3 border-b border-border/40 transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : ''
        }`}>
          <div className="flex flex-col lg:flex-row gap-4 items-center mb-3">
            <PSSRAdvancedSearch
              pssrs={pssrs}
              value={searchTerm}
              onChange={onSearchChange}
              onSelectPSSR={onSelectPSSR}
              placeholder="Search by Project ID, Name, Asset..."
              className="flex-1 max-w-md"
            />

            <div className="flex items-center gap-3 w-full lg:w-auto">
              {/* View Mode Selector */}
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted border border-border/50">
                <button
                  onClick={() => onViewModeChange('card')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5 inline mr-1" />
                  Cards
                </button>
                <button
                  onClick={() => onViewModeChange('kanban')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Columns3 className="h-3.5 w-3.5 inline mr-1" />
                  Kanban
                </button>
                <button
                  onClick={() => onViewModeChange('table')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5 inline mr-1" />
                  Table
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
            </div>
          </div>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            Showing {filteredPSSRs.length} of {pssrs.length} reviews
          </p>
        </div>

        {/* Content Views - Scrollable Area with fixed height */}
        <div 
          ref={scrollContainerRef}
          className="overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1 pt-4" 
          style={{ maxHeight: '500px' }}
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
