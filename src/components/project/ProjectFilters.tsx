import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedPlant: string;
  onPlantChange: (value: string) => void;
  selectedHub: string;
  onHubChange: (value: string) => void;
  plants: any[];
  hubs: any[];
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedPlant,
  onPlantChange,
  selectedHub,
  onHubChange,
  plants,
  hubs,
  viewMode,
  onViewModeChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center">
      <div className="relative flex-1 min-w-0 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects by ID or title..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background/50"
        />
      </div>

      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <Select value={selectedPlant} onValueChange={onPlantChange}>
          <SelectTrigger className="w-[160px] bg-background/50">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Plants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plants</SelectItem>
            {plants.map((plant) => (
              <SelectItem key={plant.id} value={plant.id}>
                {plant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedHub} onValueChange={onHubChange}>
          <SelectTrigger className="w-[160px] bg-background/50">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Hubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hubs</SelectItem>
            {hubs.map((hub) => (
              <SelectItem key={hub.id} value={hub.id}>
                {hub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="shrink-0"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}

        <div className="flex gap-1 bg-muted/30 p-1 rounded-lg border border-border/30 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('table')}
            className={cn(
              "h-8 px-2.5",
              viewMode === 'table' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('cards')}
            className={cn(
              "h-8 px-2.5",
              viewMode === 'cards' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
