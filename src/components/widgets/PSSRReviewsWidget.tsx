import React, { useState } from 'react';
import { WidgetCard } from './WidgetCard';
import { LayoutGrid, Table as TableIcon, Columns3 } from 'lucide-react';
import PSSRAdvancedSearch from '../PSSRAdvancedSearch';
import PSSRFilters from '../PSSRFilters';
import PSSRTableView from '../PSSRTableView';
import PSSRKanbanBoard from '../PSSRKanbanBoard';
import DraggablePSSRCard from '../DraggablePSSRCard';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
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
}) => {
  return (
    <WidgetCard
      title="Reviews"
      isExpanded={isExpanded}
      isVisible={isVisible}
      onToggleExpand={onToggleExpand}
      onToggleVisibility={onToggleVisibility}
      className="flex flex-col"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Search and View Controls - Sticky */}
        <div className="sticky top-0 z-10 bg-card pb-3 border-b border-border/40">
          <div className="flex flex-col lg:flex-row gap-3 items-center mb-3">
            <PSSRAdvancedSearch
              pssrs={pssrs}
              value={searchTerm}
              onChange={onSearchChange}
              onSelectPSSR={onSelectPSSR}
              placeholder="Search by Project ID, Name, Asset..."
              className="flex-1 max-w-md"
            />

            <div className="flex items-center gap-2 w-full lg:w-auto">
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
        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1 pt-4" style={{ maxHeight: '500px' }}>
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
          )}
        </div>
      </div>
    </WidgetCard>
  );
};
