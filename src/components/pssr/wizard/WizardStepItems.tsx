import React, { useState, useMemo, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, ChevronDown, ChevronUp, UserCheck, Users, Filter } from 'lucide-react';
import { useChecklistItems } from '@/hooks/useChecklistItems';
import { useDisciplines } from '@/hooks/useDisciplines';
import { usePositions } from '@/hooks/usePositions';

export interface ItemConfiguration {
  checklistItemId: string;
  disciplineIds: string[];
  positionId: string | null;
}

interface WizardStepItemsProps {
  itemConfigurations: ItemConfiguration[];
  onItemConfigurationsChange: (configs: ItemConfiguration[]) => void;
}

const WizardStepItems: React.FC<WizardStepItemsProps> = ({
  itemConfigurations,
  onItemConfigurationsChange,
}) => {
  const { data: checklistItems = [], isLoading: isLoadingItems } = useChecklistItems();
  const { disciplines = [], isLoading: isLoadingDisciplines } = useDisciplines();
  const { data: positions = [], isLoading: isLoadingPositions } = usePositions();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Initialize expanded categories on mount
  useEffect(() => {
    if (checklistItems.length > 0) {
      const categories = [...new Set(checklistItems.map(i => i.category))];
      setExpandedCategories(new Set(categories));
    }
  }, [checklistItems]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(checklistItems.map(item => item.category))].sort();
  }, [checklistItems]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return checklistItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.unique_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [checklistItems, searchQuery, categoryFilter]);

  // Group by category
  const groupedItems = useMemo(() => {
    const grouped: Record<string, typeof checklistItems> = {};
    filteredItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const getItemConfig = (itemId: string): ItemConfiguration | undefined => {
    return itemConfigurations.find(c => c.checklistItemId === itemId);
  };

  const handleDisciplineToggle = (itemId: string, disciplineId: string) => {
    const existingConfig = getItemConfig(itemId);
    const currentDisciplines = existingConfig?.disciplineIds || [];
    
    const newDisciplines = currentDisciplines.includes(disciplineId)
      ? currentDisciplines.filter(id => id !== disciplineId)
      : [...currentDisciplines, disciplineId];

    if (existingConfig) {
      onItemConfigurationsChange(
        itemConfigurations.map(c => 
          c.checklistItemId === itemId 
            ? { ...c, disciplineIds: newDisciplines }
            : c
        )
      );
    } else {
      onItemConfigurationsChange([
        ...itemConfigurations,
        { checklistItemId: itemId, disciplineIds: newDisciplines, positionId: null }
      ]);
    }
  };

  const handlePositionChange = (itemId: string, positionId: string | null) => {
    const existingConfig = getItemConfig(itemId);

    if (existingConfig) {
      onItemConfigurationsChange(
        itemConfigurations.map(c => 
          c.checklistItemId === itemId 
            ? { ...c, positionId }
            : c
        )
      );
    } else {
      onItemConfigurationsChange([
        ...itemConfigurations,
        { checklistItemId: itemId, disciplineIds: [], positionId }
      ]);
    }
  };

  const handleBulkDisciplineAssign = (disciplineId: string) => {
    if (selectedItems.size === 0) return;

    const updatedConfigs = [...itemConfigurations];
    
    selectedItems.forEach(itemId => {
      const existingIndex = updatedConfigs.findIndex(c => c.checklistItemId === itemId);
      if (existingIndex >= 0) {
        const current = updatedConfigs[existingIndex];
        if (!current.disciplineIds.includes(disciplineId)) {
          updatedConfigs[existingIndex] = {
            ...current,
            disciplineIds: [...current.disciplineIds, disciplineId]
          };
        }
      } else {
        updatedConfigs.push({
          checklistItemId: itemId,
          disciplineIds: [disciplineId],
          positionId: null
        });
      }
    });

    onItemConfigurationsChange(updatedConfigs);
  };

  const handleBulkPositionAssign = (positionId: string) => {
    if (selectedItems.size === 0) return;

    const updatedConfigs = [...itemConfigurations];
    
    selectedItems.forEach(itemId => {
      const existingIndex = updatedConfigs.findIndex(c => c.checklistItemId === itemId);
      if (existingIndex >= 0) {
        updatedConfigs[existingIndex] = {
          ...updatedConfigs[existingIndex],
          positionId
        };
      } else {
        updatedConfigs.push({
          checklistItemId: itemId,
          disciplineIds: [],
          positionId
        });
      }
    });

    onItemConfigurationsChange(updatedConfigs);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map(i => i.unique_id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const isLoading = isLoadingItems || isLoadingDisciplines || isLoadingPositions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-muted-foreground">Loading items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Configure applicable checklist items.</strong> Assign approving disciplines and delivering parties for each item that applies to this PSSR reason.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserCheck className="h-4 w-4 mr-1.5" />
                  Assign Discipline
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Add discipline:</p>
                  {disciplines.map(d => (
                    <Button 
                      key={d.id}
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => handleBulkDisciplineAssign(d.id)}
                    >
                      {d.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-1.5" />
                  Assign Delivering Party
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Set delivering party:</p>
                  {positions.map(p => (
                    <Button 
                      key={p.id}
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => handleBulkPositionAssign(p.id)}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Items Table */}
      <ScrollArea className="h-[400px] border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-24">ID</TableHead>
              <TableHead className="min-w-[250px]">Description</TableHead>
              <TableHead className="w-[180px]">Approving Disciplines</TableHead>
              <TableHead className="w-[150px]">Delivering Party</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedItems).map(([category, items]) => (
              <React.Fragment key={category}>
                {/* Category Header Row */}
                <TableRow 
                  className="bg-muted/30 hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  <TableCell colSpan={5}>
                    <div className="flex items-center gap-2 py-1">
                      {expandedCategories.has(category) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-semibold">{category}</span>
                      <Badge variant="secondary" className="ml-2">
                        {items.length} items
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Item Rows */}
                {expandedCategories.has(category) && items.map((item) => {
                  const config = getItemConfig(item.unique_id);
                  const hasConfig = config && (config.disciplineIds.length > 0 || config.positionId);

                  return (
                    <TableRow 
                      key={item.unique_id}
                      className={hasConfig ? 'bg-green-50/50 dark:bg-green-950/10' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.unique_id)}
                          onCheckedChange={(checked) => {
                            setSelectedItems(prev => {
                              const next = new Set(prev);
                              if (checked) {
                                next.add(item.unique_id);
                              } else {
                                next.delete(item.unique_id);
                              }
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.unique_id}</TableCell>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell>
                        <DisciplineMultiSelect
                          disciplines={disciplines}
                          selectedIds={config?.disciplineIds || []}
                          onToggle={(id) => handleDisciplineToggle(item.unique_id, id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={config?.positionId || 'none'}
                          onValueChange={(value) => handlePositionChange(item.unique_id, value === 'none' ? null : value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">None</span>
                            </SelectItem>
                            {positions.map((pos) => (
                              <SelectItem key={pos.id} value={pos.id}>
                                {pos.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}

            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No items found matching your criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        {itemConfigurations.filter(c => c.disciplineIds.length > 0).length} items configured with disciplines
      </div>
    </div>
  );
};

// Discipline Multi-Select Component
interface DisciplineMultiSelectProps {
  disciplines: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const DisciplineMultiSelect: React.FC<DisciplineMultiSelectProps> = ({
  disciplines,
  selectedIds,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-full justify-start text-xs">
          {selectedIds.length === 0 ? (
            <span className="text-muted-foreground">Select...</span>
          ) : (
            <span>{selectedIds.length} selected</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {disciplines.map((disc) => (
            <div
              key={disc.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent"
              onClick={() => onToggle(disc.id)}
            >
              <Checkbox
                checked={selectedIds.includes(disc.id)}
                className="pointer-events-none"
              />
              <span className="text-sm">{disc.name}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WizardStepItems;
