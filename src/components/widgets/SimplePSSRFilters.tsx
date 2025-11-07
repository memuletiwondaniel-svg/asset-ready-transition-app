import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimplePSSRFiltersProps {
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (priority: string) => void;
  filterTier: string;
  onFilterTierChange: (tier: string) => void;
}

const SimplePSSRFilters: React.FC<SimplePSSRFiltersProps> = ({
  filterStatus,
  onFilterStatusChange,
  filterPriority,
  onFilterPriorityChange,
  filterTier,
  onFilterTierChange,
}) => {
  const hasFilters = filterStatus !== 'all' || filterPriority !== 'all' || filterTier !== 'all';

  const handleClearAll = () => {
    onFilterStatusChange('all');
    onFilterPriorityChange('all');
    onFilterTierChange('all');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">Quick Filters</span>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</label>
          <Select value={filterStatus} onValueChange={onFilterStatusChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Under Review">Under Review</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Priority</label>
          <Select value={filterPriority} onValueChange={onFilterPriorityChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Tier</label>
          <Select value={filterTier} onValueChange={onFilterTierChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">Tier 1</SelectItem>
              <SelectItem value="2">Tier 2</SelectItem>
              <SelectItem value="3">Tier 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SimplePSSRFilters;
