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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by ID or title..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>

        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <Filter className="h-4 w-4 inline mr-2" />
          {hasActiveFilters ? 'Filters applied' : 'No filters applied'}
        </div>

        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="h-8"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('cards')}
            className="h-8"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
