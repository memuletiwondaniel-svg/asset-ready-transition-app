import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, Building2, MapPin, Radio, ChevronRight, ChevronDown, LayoutGrid, GitBranch, Search, X } from 'lucide-react';
import { useLocations, Plant, Field, Station } from '@/hooks/useLocations';

type LocationType = 'plant' | 'field' | 'station';

interface AddEditDialogState {
  open: boolean;
  type: LocationType;
  mode: 'add' | 'edit';
  item?: Plant | Field | Station;
}

interface DeleteDialogState {
  open: boolean;
  type: LocationType;
  item?: Plant | Field | Station;
}

const LocationManagement: React.FC = () => {
  const {
    plants,
    fields,
    stations,
    isLoading,
    addPlant,
    updatePlant,
    deletePlant,
    addField,
    updateField,
    deleteField,
    addStation,
    updateStation,
    deleteStation,
    getFieldsByPlant,
    getStationsByField,
  } = useLocations();

  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [addEditDialog, setAddEditDialog] = useState<AddEditDialogState>({ open: false, type: 'plant', mode: 'add' });
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, type: 'plant' });
  const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');

  // Search filtering
  const searchLower = searchQuery.toLowerCase().trim();
  
  const searchFilteredPlants = searchLower 
    ? plants.filter(p => p.name.toLowerCase().includes(searchLower) || p.description?.toLowerCase().includes(searchLower))
    : plants;
  
  const searchFilteredFields = searchLower
    ? fields.filter(f => f.name.toLowerCase().includes(searchLower) || f.description?.toLowerCase().includes(searchLower))
    : fields;
  
  const searchFilteredStations = searchLower
    ? stations.filter(s => s.name.toLowerCase().includes(searchLower) || s.description?.toLowerCase().includes(searchLower))
    : stations;

  // For tree view: show plants that match OR have matching children
  const getVisiblePlantsForTree = () => {
    if (!searchLower) return plants;
    
    const matchingPlantIds = new Set<string>();
    
    // Plants that directly match
    searchFilteredPlants.forEach(p => matchingPlantIds.add(p.id));
    
    // Plants that have matching fields
    searchFilteredFields.forEach(f => {
      if (f.plant_id) matchingPlantIds.add(f.plant_id);
    });
    
    // Plants that have fields with matching stations
    searchFilteredStations.forEach(s => {
      const field = fields.find(f => f.id === s.field_id);
      if (field?.plant_id) matchingPlantIds.add(field.plant_id);
    });
    
    return plants.filter(p => matchingPlantIds.has(p.id));
  };

  const getVisibleFieldsForPlant = (plantId: string) => {
    const plantFields = getFieldsByPlant(plantId);
    if (!searchLower) return plantFields;
    
    const matchingFieldIds = new Set<string>();
    
    // Fields that directly match
    plantFields.filter(f => 
      f.name.toLowerCase().includes(searchLower) || 
      f.description?.toLowerCase().includes(searchLower)
    ).forEach(f => matchingFieldIds.add(f.id));
    
    // Fields that have matching stations
    searchFilteredStations.forEach(s => {
      if (plantFields.some(f => f.id === s.field_id)) {
        matchingFieldIds.add(s.field_id!);
      }
    });
    
    return plantFields.filter(f => matchingFieldIds.has(f.id));
  };

  const getVisibleStationsForField = (fieldId: string) => {
    const fieldStations = getStationsByField(fieldId);
    if (!searchLower) return fieldStations;
    
    return fieldStations.filter(s => 
      s.name.toLowerCase().includes(searchLower) || 
      s.description?.toLowerCase().includes(searchLower)
    );
  };

  const filteredFields = selectedPlant ? getFieldsByPlant(selectedPlant) : fields;
  const filteredStations = selectedField ? getStationsByField(selectedField) : stations;
  
  // Column view filtered lists
  const columnPlants = searchLower ? searchFilteredPlants : plants;
  const columnFields = searchLower ? searchFilteredFields : filteredFields;
  const columnStations = searchLower ? searchFilteredStations : filteredStations;

  const togglePlantExpanded = (plantId: string) => {
    setExpandedPlants(prev => {
      const next = new Set(prev);
      if (next.has(plantId)) {
        next.delete(plantId);
      } else {
        next.add(plantId);
      }
      return next;
    });
  };

  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPlants(new Set(plants.map(p => p.id)));
    setExpandedFields(new Set(fields.map(f => f.id)));
  };

  const collapseAll = () => {
    setExpandedPlants(new Set());
    setExpandedFields(new Set());
  };

  const openAddDialog = (type: LocationType, parentId?: string) => {
    setFormName('');
    setFormDescription('');
    if (type === 'field') {
      setFormParentId(parentId || selectedPlant || '');
    } else if (type === 'station') {
      setFormParentId(parentId || selectedField || '');
    } else {
      setFormParentId('');
    }
    setAddEditDialog({ open: true, type, mode: 'add' });
  };

  const openEditDialog = (type: LocationType, item: Plant | Field | Station) => {
    setFormName(item.name);
    setFormDescription(item.description || '');
    if (type === 'field') {
      setFormParentId((item as Field).plant_id || '');
    } else if (type === 'station') {
      setFormParentId((item as Station).field_id || '');
    }
    setAddEditDialog({ open: true, type, mode: 'edit', item });
  };

  const openDeleteDialog = (type: LocationType, item: Plant | Field | Station) => {
    setDeleteDialog({ open: true, type, item });
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    const { type, mode, item } = addEditDialog;

    if (mode === 'add') {
      if (type === 'plant') {
        await addPlant(formName, formDescription || undefined);
      } else if (type === 'field') {
        await addField(formName, formParentId || undefined, formDescription || undefined);
      } else {
        await addStation(formName, formParentId || undefined, formDescription || undefined);
      }
    } else if (item) {
      if (type === 'plant') {
        await updatePlant(item.id, { name: formName, description: formDescription || null });
      } else if (type === 'field') {
        await updateField(item.id, { name: formName, description: formDescription || null, plant_id: formParentId || null });
      } else {
        await updateStation(item.id, { name: formName, description: formDescription || null, field_id: formParentId || null });
      }
    }

    setAddEditDialog({ open: false, type: 'plant', mode: 'add' });
  };

  const handleDelete = async () => {
    const { type, item } = deleteDialog;
    if (!item) return;

    if (type === 'plant') {
      await deletePlant(item.id);
    } else if (type === 'field') {
      await deleteField(item.id);
      if (selectedField === item.id) setSelectedField(null);
    } else {
      await deleteStation(item.id);
    }

    setDeleteDialog({ open: false, type: 'plant' });
  };

  const getTypeLabel = (type: LocationType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Tree View Component
  const TreeView = () => {
    if (isLoading) {
      return (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      );
    }

    const visiblePlants = getVisiblePlantsForTree();

    if (plants.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No locations configured yet</p>
          <Button className="mt-4" onClick={() => openAddDialog('plant')}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Plant
          </Button>
        </div>
      );
    }

    if (searchLower && visiblePlants.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No locations match "{searchQuery}"</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <div className="space-y-1 p-2">
          {visiblePlants.map(plant => {
            const plantFields = getVisibleFieldsForPlant(plant.id);
            const isPlantExpanded = expandedPlants.has(plant.id) || !!searchLower;
            const hasChildren = plantFields.length > 0;

            return (
              <div key={plant.id} className="select-none">
                <Collapsible open={isPlantExpanded} onOpenChange={() => togglePlantExpanded(plant.id)}>
                  <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        {hasChildren ? (
                          isPlantExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        ) : (
                          <div className="w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2 flex-1 py-1.5 px-2 cursor-pointer" onClick={() => togglePlantExpanded(plant.id)}>
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{plant.name}</span>
                      {plantFields.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">{plantFields.length}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openAddDialog('field', plant.id)} title="Add Field">
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog('plant', plant)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => openDeleteDialog('plant', plant)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-4 border-l border-border pl-2 space-y-1">
                      {plantFields.map(field => {
                        const fieldStations = getVisibleStationsForField(field.id);
                        const isFieldExpanded = expandedFields.has(field.id) || !!searchLower;
                        const hasStations = fieldStations.length > 0;

                        return (
                          <div key={field.id}>
                            <Collapsible open={isFieldExpanded} onOpenChange={() => toggleFieldExpanded(field.id)}>
                              <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                                    {hasStations ? (
                                      isFieldExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )
                                    ) : (
                                      <div className="w-3.5" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <div className="flex items-center gap-2 flex-1 py-1 px-2 cursor-pointer" onClick={() => toggleFieldExpanded(field.id)}>
                                  <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  <span className="text-sm">{field.name}</span>
                                  {fieldStations.length > 0 && (
                                    <Badge variant="outline" className="ml-1 text-xs py-0">{fieldStations.length}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openAddDialog('station', field.id)} title="Add Station">
                                    <Plus className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditDialog('field', field)}>
                                    <Pencil className="h-2.5 w-2.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => openDeleteDialog('field', field)}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                              <CollapsibleContent>
                                <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5">
                                  {fieldStations.map(station => (
                                    <div key={station.id} className="flex items-center group rounded-md hover:bg-accent/50 transition-colors py-1 px-2">
                                      <Radio className="h-3 w-3 text-amber-500 shrink-0 mr-2" />
                                      <span className="text-sm text-muted-foreground flex-1">{station.name}</span>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditDialog('station', station)}>
                                          <Pencil className="h-2.5 w-2.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => openDeleteDialog('station', station)}>
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
          
          {/* Orphaned fields (no plant) */}
          {fields.filter(f => !f.plant_id).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 px-2">Unassigned Fields</p>
              {fields.filter(f => !f.plant_id).map(field => {
                const fieldStations = getStationsByField(field.id);
                const isFieldExpanded = expandedFields.has(field.id);
                
                return (
                  <div key={field.id} className="ml-2">
                    <Collapsible open={isFieldExpanded} onOpenChange={() => toggleFieldExpanded(field.id)}>
                      <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                            {fieldStations.length > 0 ? (
                              isFieldExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                            ) : (
                              <div className="w-3.5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2 flex-1 py-1 px-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{field.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditDialog('field', field)}>
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => openDeleteDialog('field', field)}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5">
                          {fieldStations.map(station => (
                            <div key={station.id} className="flex items-center group rounded-md hover:bg-accent/50 transition-colors py-1 px-2">
                              <Radio className="h-3 w-3 text-muted-foreground shrink-0 mr-2" />
                              <span className="text-sm text-muted-foreground flex-1">{station.name}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  const renderLocationCard = (
    title: string,
    icon: React.ReactNode,
    items: (Plant | Field | Station)[],
    type: LocationType,
    selectedId: string | null,
    onSelect?: (id: string | null) => void,
    getParentName?: (item: Field | Station) => string | null
  ) => (
    <Card className="flex-1 min-w-[280px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {icon}
            {title}
            <Badge variant="secondary" className="ml-1">{items.length}</Badge>
          </CardTitle>
          <Button size="sm" onClick={() => openAddDialog(type)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No {type}s found
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-2">
              {items.map(item => {
                const isSelected = selectedId === item.id;
                const parentName = getParentName ? getParentName(item as Field | Station) : null;
                
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-accent border-border'
                    }`}
                    onClick={() => onSelect?.(isSelected ? null : item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {isSelected && onSelect && (
                            <ChevronRight className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {parentName && (
                          <span className="text-xs text-muted-foreground">
                            Parent: {parentName}
                          </span>
                        )}
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(type, item); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(type, item); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Manage your asset hierarchy: Plants → Fields → Stations</span>
        </div>
        
        {/* Search Input */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="tree" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="tree" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Tree View
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Columns View
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <Button size="sm" onClick={() => openAddDialog('plant')}>
              <Plus className="h-4 w-4 mr-1" />
              Add Plant
            </Button>
          </div>
        </div>

        <TabsContent value="tree" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Asset Hierarchy
                {searchQuery && (
                  <Badge variant="secondary" className="ml-2">
                    Filtered
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TreeView />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="mt-0">
          <div className="flex flex-col lg:flex-row gap-4">
            {renderLocationCard(
              'Plants',
              <Building2 className="h-4 w-4" />,
              columnPlants,
              'plant',
              selectedPlant,
              (id) => { setSelectedPlant(id); setSelectedField(null); }
            )}

            {renderLocationCard(
              'Fields',
              <MapPin className="h-4 w-4" />,
              columnFields,
              'field',
              selectedField,
              setSelectedField,
              (item) => {
                const field = item as Field;
                return plants.find(p => p.id === field.plant_id)?.name || null;
              }
            )}

            {renderLocationCard(
              'Stations',
              <Radio className="h-4 w-4" />,
              columnStations,
              'station',
              null,
              undefined,
              (item) => {
                const station = item as Station;
                return fields.find(f => f.id === station.field_id)?.name || null;
              }
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={addEditDialog.open} onOpenChange={(open) => !open && setAddEditDialog({ ...addEditDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addEditDialog.mode === 'add' ? 'Add' : 'Edit'} {getTypeLabel(addEditDialog.type)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={`Enter ${addEditDialog.type} name`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            {addEditDialog.type === 'field' && (
              <div className="space-y-2">
                <Label>Parent Plant (Optional)</Label>
                <Select value={formParentId} onValueChange={setFormParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent</SelectItem>
                    {plants.map(plant => (
                      <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {addEditDialog.type === 'station' && (
              <div className="space-y-2">
                <Label>Parent Field (Optional)</Label>
                <Select value={formParentId} onValueChange={setFormParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent</SelectItem>
                    {fields.map(field => (
                      <SelectItem key={field.id} value={field.id}>{field.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEditDialog({ ...addEditDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {addEditDialog.mode === 'add' ? 'Add' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {getTypeLabel(deleteDialog.type)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.item?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LocationManagement;
