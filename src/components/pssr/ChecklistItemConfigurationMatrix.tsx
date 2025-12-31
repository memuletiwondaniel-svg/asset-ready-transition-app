import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Save, 
  X, 
  Loader2, 
  Info, 
  Filter,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useChecklistItems } from '@/hooks/useChecklistItems';
import { useDisciplines } from '@/hooks/useDisciplines';
import { usePositions } from '@/hooks/usePositions';
import { useChecklistItemDisciplines } from '@/hooks/useChecklistItemDisciplines';
import { useChecklistItemDeliveringParties } from '@/hooks/useChecklistItemDeliveringParties';
import { toast } from 'sonner';

interface LocalItemConfig {
  checklistItemId: string;
  description: string;
  category: string;
  disciplineIds: string[];
  positionId: string | null;
  originalDisciplineIds: string[];
  originalPositionId: string | null;
  isDirty: boolean;
}

const ChecklistItemConfigurationMatrix: React.FC = () => {
  const { data: checklistItems = [], isLoading: isLoadingItems } = useChecklistItems();
  const { disciplines = [], isLoading: isLoadingDisciplines } = useDisciplines();
  const { data: positions = [], isLoading: isLoadingPositions } = usePositions();
  const { 
    assignments: disciplineAssignments, 
    isLoading: isLoadingDisciplineAssignments,
    getDisciplinesForItem,
    bulkAssignDisciplines
  } = useChecklistItemDisciplines();
  const {
    assignments: deliveringPartyAssignments,
    isLoading: isLoadingDeliveringParties,
    getDeliveringPartyForItem,
    bulkAssignDeliveringParties
  } = useChecklistItemDeliveringParties();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [localConfigs, setLocalConfigs] = useState<LocalItemConfig[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Initialize local configs from fetched data
  React.useEffect(() => {
    if (checklistItems.length > 0 && !isLoadingDisciplineAssignments && !isLoadingDeliveringParties) {
      setLocalConfigs(checklistItems.map(item => {
        const disciplines = getDisciplinesForItem(item.unique_id);
        const deliveringParty = getDeliveringPartyForItem(item.unique_id);
        return {
          checklistItemId: item.unique_id,
          description: item.description,
          category: item.category,
          disciplineIds: disciplines.map(d => d.id),
          positionId: deliveringParty?.id || null,
          originalDisciplineIds: disciplines.map(d => d.id),
          originalPositionId: deliveringParty?.id || null,
          isDirty: false,
        };
      }));
      
      // Expand all categories by default
      const categories = [...new Set(checklistItems.map(i => i.category))];
      setExpandedCategories(new Set(categories));
    }
  }, [checklistItems, disciplineAssignments, deliveringPartyAssignments, isLoadingDisciplineAssignments, isLoadingDeliveringParties]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(checklistItems.map(item => item.category))].sort();
  }, [checklistItems]);

  // Filter configs based on search and category
  const filteredConfigs = useMemo(() => {
    return localConfigs.filter(config => {
      const matchesSearch = !searchQuery || 
        config.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.checklistItemId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || config.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [localConfigs, searchQuery, categoryFilter]);

  // Group by category
  const groupedConfigs = useMemo(() => {
    const grouped: Record<string, LocalItemConfig[]> = {};
    filteredConfigs.forEach(config => {
      if (!grouped[config.category]) {
        grouped[config.category] = [];
      }
      grouped[config.category].push(config);
    });
    return grouped;
  }, [filteredConfigs]);

  const hasUnsavedChanges = localConfigs.some(c => c.isDirty);

  const handleDisciplineToggle = (checklistItemId: string, disciplineId: string) => {
    setLocalConfigs(prev => prev.map(config => {
      if (config.checklistItemId !== checklistItemId) return config;
      
      const newDisciplineIds = config.disciplineIds.includes(disciplineId)
        ? config.disciplineIds.filter(id => id !== disciplineId)
        : [...config.disciplineIds, disciplineId];
      
      const isDirty = 
        JSON.stringify([...newDisciplineIds].sort()) !== JSON.stringify([...config.originalDisciplineIds].sort()) ||
        config.positionId !== config.originalPositionId;
      
      return { ...config, disciplineIds: newDisciplineIds, isDirty };
    }));
  };

  const handlePositionChange = (checklistItemId: string, positionId: string | null) => {
    setLocalConfigs(prev => prev.map(config => {
      if (config.checklistItemId !== checklistItemId) return config;
      
      const isDirty = 
        JSON.stringify([...config.disciplineIds].sort()) !== JSON.stringify([...config.originalDisciplineIds].sort()) ||
        positionId !== config.originalPositionId;
      
      return { ...config, positionId, isDirty };
    }));
  };

  const handleBulkDisciplineAssign = (disciplineId: string, assign: boolean) => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    setLocalConfigs(prev => prev.map(config => {
      if (!selectedItems.has(config.checklistItemId)) return config;
      
      const newDisciplineIds = assign
        ? [...new Set([...config.disciplineIds, disciplineId])]
        : config.disciplineIds.filter(id => id !== disciplineId);
      
      const isDirty = 
        JSON.stringify([...newDisciplineIds].sort()) !== JSON.stringify([...config.originalDisciplineIds].sort()) ||
        config.positionId !== config.originalPositionId;
      
      return { ...config, disciplineIds: newDisciplineIds, isDirty };
    }));
  };

  const handleBulkPositionAssign = (positionId: string | null) => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    setLocalConfigs(prev => prev.map(config => {
      if (!selectedItems.has(config.checklistItemId)) return config;
      
      const isDirty = 
        JSON.stringify([...config.disciplineIds].sort()) !== JSON.stringify([...config.originalDisciplineIds].sort()) ||
        positionId !== config.originalPositionId;
      
      return { ...config, positionId, isDirty };
    }));
  };

  const handleSave = async () => {
    const dirtyConfigs = localConfigs.filter(c => c.isDirty);
    
    if (dirtyConfigs.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Save discipline assignments
      await bulkAssignDisciplines.mutateAsync(
        dirtyConfigs.map(c => ({
          checklistItemId: c.checklistItemId,
          disciplineIds: c.disciplineIds,
        }))
      );

      // Save delivering party assignments
      await bulkAssignDeliveringParties.mutateAsync(
        dirtyConfigs.map(c => ({
          checklistItemId: c.checklistItemId,
          positionId: c.positionId,
        }))
      );

      // Update local state to reflect saved changes
      setLocalConfigs(prev => prev.map(config => ({
        ...config,
        originalDisciplineIds: config.disciplineIds,
        originalPositionId: config.positionId,
        isDirty: false,
      })));

      setSelectedItems(new Set());
      toast.success(`${dirtyConfigs.length} item(s) updated successfully`);
    } catch (error) {
      console.error('Failed to save configurations:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalConfigs(prev => prev.map(config => ({
      ...config,
      disciplineIds: config.originalDisciplineIds,
      positionId: config.originalPositionId,
      isDirty: false,
    })));
    setSelectedItems(new Set());
    toast.info('Changes discarded');
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
      setSelectedItems(new Set(filteredConfigs.map(c => c.checklistItemId)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const isLoading = isLoadingItems || isLoadingDisciplines || isLoadingPositions || 
                    isLoadingDisciplineAssignments || isLoadingDeliveringParties;

  if (isLoading) {
    return (
      <Card className="fluent-card border-border/40">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="fluent-card border-border/40">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/5 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Checklist Item Configuration Matrix
              </CardTitle>
              <CardDescription className="text-base">
                Assign approving disciplines and delivering parties to checklist items
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Button 
                  variant="outline"
                  onClick={handleCancel}
                  className="fluent-button"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>

          {/* Info Banner */}
          <Alert className="mt-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Approving Disciplines:</strong> Select one or more disciplines responsible for approving each checklist item. 
              <strong className="ml-2">Delivering Party:</strong> Select the role responsible for completing and submitting the item.
            </AlertDescription>
          </Alert>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
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
            <div className="flex flex-wrap items-center gap-3 mt-4 p-4 bg-accent/10 border border-accent/20 rounded-xl animate-scale-in">
              <span className="text-sm font-medium text-foreground">
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
                      <p className="text-sm font-medium">Add discipline to selected items:</p>
                      {disciplines.map(d => (
                        <Button 
                          key={d.id}
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => handleBulkDisciplineAssign(d.id, true)}
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
                      <p className="text-sm font-medium">Set delivering party for selected:</p>
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
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === filteredConfigs.length && filteredConfigs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="min-w-[300px]">Description</TableHead>
                  <TableHead className="w-[200px]">Approving Disciplines</TableHead>
                  <TableHead className="w-[180px]">Delivering Party</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedConfigs).map(([category, configs]) => (
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
                            {configs.length} items
                          </Badge>
                          {configs.some(c => c.isDirty) && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Unsaved changes
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Items under category */}
                    {expandedCategories.has(category) && configs.map(config => (
                      <TableRow 
                        key={config.checklistItemId}
                        className={config.isDirty ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(config.checklistItemId)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedItems);
                              if (checked) {
                                newSelected.add(config.checklistItemId);
                              } else {
                                newSelected.delete(config.checklistItemId);
                              }
                              setSelectedItems(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {config.checklistItemId}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[400px]">
                            <p className="text-sm line-clamp-2">{config.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-between">
                                <span className="truncate">
                                  {config.disciplineIds.length === 0 
                                    ? 'Select...' 
                                    : `${config.disciplineIds.length} selected`}
                                </span>
                                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-2">
                              <div className="space-y-1">
                                {disciplines.map(d => (
                                  <div 
                                    key={d.id} 
                                    className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                                    onClick={() => handleDisciplineToggle(config.checklistItemId, d.id)}
                                  >
                                    <Checkbox checked={config.disciplineIds.includes(d.id)} />
                                    <span className="text-sm">{d.name}</span>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          {/* Show selected disciplines as badges */}
                          {config.disciplineIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {config.disciplineIds.slice(0, 3).map(id => {
                                const disc = disciplines.find(d => d.id === id);
                                return disc ? (
                                  <Badge key={id} variant="secondary" className="text-xs">
                                    {disc.name}
                                  </Badge>
                                ) : null;
                              })}
                              {config.disciplineIds.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{config.disciplineIds.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={config.positionId || 'none'}
                            onValueChange={(value) => handlePositionChange(
                              config.checklistItemId, 
                              value === 'none' ? null : value
                            )}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {positions.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                
                {filteredConfigs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No checklist items found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ChecklistItemConfigurationMatrix;
