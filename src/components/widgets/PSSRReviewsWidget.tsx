import React, { useState, useRef, useEffect } from 'react';
import { WidgetCard } from './WidgetCard';
import { Plus, Columns } from 'lucide-react';
import PSSRAdvancedSearch from '../PSSRAdvancedSearch';
import PSSRFilters from '../PSSRFilters';
import PSSRTableView from '../PSSRTableView';
import { PSSRQuickStatsBar } from './PSSRQuickStatsBar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { usePSSRColumnVisibility } from '@/hooks/usePSSRColumnVisibility';

interface PSSRReviewsWidgetProps {
  pssrs: any[];
  filteredPSSRs: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectPSSR: (pssrId: string) => void;
  viewMode?: 'table' | 'kanban';
  onViewModeChange?: (mode: 'table' | 'kanban') => void;
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
  filters,
  onToggleFilter,
  onDateChange,
  onClearFilters,
  uniquePlants,
  uniqueStatuses,
  uniqueLeads,
  onViewDetails,
  pinnedPSSRs,
  onTogglePin,
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { columns, setColumns, toggleColumnVisibility, toggleableColumns } = usePSSRColumnVisibility();

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setIsScrolled(scrollContainer.scrollTop > 10);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

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
        {/* Combined Controls Bar */}
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

            <PSSRFilters
              filters={filters}
              onToggleFilter={onToggleFilter}
              onDateChange={onDateChange}
              onClearFilters={onClearFilters}
              uniquePlants={uniquePlants}
              uniqueStatuses={uniqueStatuses}
              uniqueLeads={uniqueLeads}
            />

            {/* Column Visibility Toggle */}
            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="bg-background hover:bg-muted/50 border-border/50">
                    <Columns className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-md border-border/50 shadow-lg z-50">
                  {toggleableColumns.map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.visible}
                      onCheckedChange={() => toggleColumnVisibility(column.id)}
                      className="cursor-pointer"
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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

        {/* Content - Table Only */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1 pt-4 w-full min-w-full"
        >
          <PSSRTableView 
            pssrs={filteredPSSRs} 
            onViewDetails={onViewDetails} 
            pinnedPSSRs={pinnedPSSRs}
            onTogglePin={onTogglePin}
            columns={columns}
            onColumnsChange={setColumns}
          />
        </div>
      </div>
    </WidgetCard>
  );
};
