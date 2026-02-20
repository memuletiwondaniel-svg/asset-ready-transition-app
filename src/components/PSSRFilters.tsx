
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem 
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';

interface Filters {
  plant: string[];
  status: string[];
  lead: string[];
  dateFrom: string;
  dateTo: string;
}

interface PSSRFiltersProps {
  filters: Filters;
  onToggleFilter: (category: 'plant' | 'status' | 'lead', value: string) => void;
  onDateChange: (dateType: 'dateFrom' | 'dateTo', value: string) => void;
  onClearFilters: () => void;
  uniquePlants: string[];
  uniqueStatuses: string[];
  uniqueLeads: string[];
}

const PSSRFilters: React.FC<PSSRFiltersProps> = ({
  filters,
  onToggleFilter,
  onDateChange,
  onClearFilters,
  uniquePlants,
  uniqueStatuses,
  uniqueLeads
}) => {
  const hasActiveFilters = filters.plant.length > 0 || filters.status.length > 0 || filters.lead.length > 0 || filters.dateFrom || filters.dateTo;

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {filters.plant.length + filters.status.length + filters.lead.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Date Range</DropdownMenuLabel>
          <div className="px-2 py-2 space-y-2">
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-xs">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onDateChange('dateFrom', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-xs">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => onDateChange('dateTo', e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          
          <DropdownMenuSeparator />
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
