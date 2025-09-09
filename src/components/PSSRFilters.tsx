
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem 
} from '@/components/ui/dropdown-menu';
import { Search, Filter } from 'lucide-react';

interface Filters {
  plant: string[];
  status: string[];
  lead: string[];
}

interface PSSRFiltersProps {
  filters: Filters;
  onToggleFilter: (category: 'plant' | 'status' | 'lead', value: string) => void;
  onClearFilters: () => void;
  uniquePlants: string[];
  uniqueStatuses: string[];
  uniqueLeads: string[];
  uniquePriorities?: string[];
  uniqueReasons?: string[];
}

const PSSRFilters: React.FC<PSSRFiltersProps> = ({
  filters,
  onToggleFilter,
  onClearFilters,
  uniquePlants,
  uniqueStatuses,
  uniqueLeads,
  uniquePriorities = [],
  uniqueReasons = []
}) => {
  const hasActiveFilters = filters.plant.length > 0 || filters.status.length > 0 || filters.lead.length > 0;

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {filters.plant.length + filters.status.length + filters.lead.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Filter by Plant</DropdownMenuLabel>
          {uniquePlants.map(plant => (
            <DropdownMenuCheckboxItem
              key={plant}
              checked={filters.plant.includes(plant)}
              onCheckedChange={() => onToggleFilter('plant', plant)}
            >
              {plant}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          {uniqueStatuses.map(status => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.status.includes(status)}
              onCheckedChange={() => onToggleFilter('status', status)}
            >
              {status}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Filter by PSSR Lead</DropdownMenuLabel>
          {uniqueLeads.map(lead => (
            <DropdownMenuCheckboxItem
              key={lead}
              checked={filters.lead.includes(lead)}
              onCheckedChange={() => onToggleFilter('lead', lead)}
            >
              {lead}
            </DropdownMenuCheckboxItem>
          ))}
          
          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearFilters}>
                Clear All Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default PSSRFilters;
