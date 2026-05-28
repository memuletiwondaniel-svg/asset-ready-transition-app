import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, Building2, MapPin, Factory, ChevronRight, ChevronDown, LayoutGrid, GitBranch, Search, X, Maximize2, Minimize2, Layers } from 'lucide-react';
import { useLocations, Plant, Field, Station } from '@/hooks/useLocations';
import BGCIcon from './BGCIcon';

type LocationType = 'plant' | 'field' | 'station';

interface AddEditDialogState {
  open: boolean;
  type: LocationType;
  mode: 'add' | 'edit';
  item?: Plant | Field | Station;
  allowTypeChange?: boolean;
}

interface DeleteDialogState {
  open: boolean;
  type: LocationType;
  item?: Plant | Field | Station;
}

// Friendly full-name mapping for known plant codes (shown as subtext)
const PLANT_FULL_NAMES: Record<string, string> = {
  BNGL: 'Basrah NGL Plant',
  CS: 'Compression Stations',
  KAZ: 'Khor Al Zubair NGL Plant',
  UQ: 'Umm Qasr Storage & Export Terminal',
  NRNGL: 'North Rumaila NGL Plant',
  Pipelines: 'Pipelines Network',
};

const getPlantFullName = (plant: Plant): string | null => {
  if (plant.description) return plant.description;
  return PLANT_FULL_NAMES[plant.name] ?? null;
};

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
  const [formType, setFormType] = useState<LocationType>('plant');
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

  // Tree view visibility helpers (unchanged)
  const getVisiblePlantsForTree = () => {
    if (!searchLower) return plants;
    const matchingPlantIds = new Set<string>();
    searchFilteredPlants.forEach(p => matchingPlantIds.add(p.id));
    searchFilteredFields.forEach(f => { if (f.plant_id) matchingPlantIds.add(f.plant_id); });
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
    plantFields.filter(f =>
      f.name.toLowerCase().includes(searchLower) ||
      f.description?.toLowerCase().includes(searchLower)
    ).forEach(f => matchingFieldIds.add(f.id));
    searchFilteredStations.forEach(s => {
      if (plantFields.some(f => f.id === s.field_id)) matchingFieldIds.add(s.field_id!);
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

  // ===== Column view filtering (fixed bi-directional) =====
  const columnPlants = useMemo(() => {
    let base = searchLower ? searchFilteredPlants : plants;
    if (selectedField) {
      const f = fields.find(x => x.id === selectedField);
      if (f?.plant_id) base = base.filter(p => p.id === f.plant_id);
    }
    return base;
  }, [plants, searchFilteredPlants, searchLower, selectedField, fields]);

  const columnFields = useMemo(() => {
    let base = searchLower ? searchFilteredFields : fields;
    if (selectedPlant) base = base.filter(f => f.plant_id === selectedPlant);
    return base;
  }, [fields, searchFilteredFields, searchLower, selectedPlant]);

  const columnStations = useMemo(() => {
    let base = searchLower ? searchFilteredStations : stations;
    if (selectedField) {
      base = base.filter(s => s.field_id === selectedField);
    } else if (selectedPlant) {
      const plantFieldIds = new Set(fields.filter(f => f.plant_id === selectedPlant).map(f => f.id));
      base = base.filter(s => s.field_id && plantFieldIds.has(s.field_id));
    }
    return base;
  }, [stations, searchFilteredStations, searchLower, selectedPlant, selectedField, fields]);

  const togglePlantExpanded = (plantId: string) => {
    setExpandedPlants(prev => {
      const next = new Set(prev);
      next.has(plantId) ? next.delete(plantId) : next.add(plantId);
      return next;
    });
  };
  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      next.has(fieldId) ? next.delete(fieldId) : next.add(fieldId);
      return next;
    });
  };

  const allExpanded = plants.length > 0 && expandedPlants.size === plants.length;

  const expandAll = () => {
    setExpandedPlants(new Set(plants.map(p => p.id)));
    setExpandedFields(new Set(fields.map(f => f.id)));
  };
  const collapseAll = () => {
    setExpandedPlants(new Set());
    setExpandedFields(new Set());
  };
  const toggleExpandCollapseAll = () => (allExpanded ? collapseAll() : expandAll());

  // ===== Dialog helpers =====
  const openAddDialog = (type: LocationType, parentId?: string, allowTypeChange = false) => {
    setFormType(type);
    setFormName('');
    setFormDescription('');
    if (type === 'field') setFormParentId(parentId || selectedPlant || '');
    else if (type === 'station') setFormParentId(parentId || selectedField || '');
    else setFormParentId('');
    setAddEditDialog({ open: true, type, mode: 'add', allowTypeChange });
  };

  const openUnifiedAddDialog = () => {
    // Default type based on current selection: if a plant is selected, default to adding a Field under it
    const defaultType: LocationType = selectedField ? 'station' : selectedPlant ? 'field' : 'plant';
    setFormType(defaultType);
    setFormName('');
    setFormDescription('');
    setFormParentId(
      defaultType === 'field' ? (selectedPlant || '') :
      defaultType === 'station' ? (selectedField || '') : ''
    );
    setAddEditDialog({ open: true, type: defaultType, mode: 'add', allowTypeChange: true });
  };

  const openEditDialog = (type: LocationType, item: Plant | Field | Station) => {
    setFormType(type);
    setFormName(item.name);
    setFormDescription(item.description || '');
    if (type === 'field') setFormParentId((item as Field).plant_id || '');
    else if (type === 'station') setFormParentId((item as Station).field_id || '');
    setAddEditDialog({ open: true, type, mode: 'edit', item });
  };

  const openDeleteDialog = (type: LocationType, item: Plant | Field | Station) => {
    setDeleteDialog({ open: true, type, item });
  };

  const handleTypeChange = (newType: LocationType) => {
    setFormType(newType);
    if (newType === 'field') setFormParentId(selectedPlant || '');
    else if (newType === 'station') setFormParentId(selectedField || '');
    else setFormParentId('');
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const { mode, item } = addEditDialog;
    const type = formType;

    if (mode === 'add') {
      if (type === 'plant') await addPlant(formName, formDescription || undefined);
      else if (type === 'field') await addField(formName, formParentId || undefined, formDescription || undefined);
      else await addStation(formName, formParentId || undefined, formDescription || undefined);
    } else if (item) {
      if (type === 'plant') await updatePlant(item.id, { name: formName, description: formDescription || null });
      else if (type === 'field') await updateField(item.id, { name: formName, description: formDescription || null, plant_id: formParentId || null });
      else await updateStation(item.id, { name: formName, description: formDescription || null, field_id: formParentId || null });
    }
    setAddEditDialog({ open: false, type: 'plant', mode: 'add' });
  };

  const handleDelete = async () => {
    const { type, item } = deleteDialog;
    if (!item) return;
    if (type === 'plant') await deletePlant(item.id);
    else if (type === 'field') {
      await deleteField(item.id);
      if (selectedField === item.id) setSelectedField(null);
    } else await deleteStation(item.id);
    setDeleteDialog({ open: false, type: 'plant' });
  };

  const getTypeLabel = (type: LocationType) => type.charAt(0).toUpperCase() + type.slice(1);

  // ===== Tree View (unchanged structure, just title via parent) =====
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
            const fullName = getPlantFullName(plant);

            return (
              <div key={plant.id} className="select-none">
                <Collapsible open={isPlantExpanded} onOpenChange={() => togglePlantExpanded(plant.id)}>
                  <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        {hasChildren ? (isPlantExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <div className="w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2 flex-1 py-1.5 px-2 cursor-pointer min-w-0" onClick={() => togglePlantExpanded(plant.id)}>
                      <Building2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium">{plant.name}</span>
                      {fullName && <span className="text-xs text-muted-foreground truncate">— {fullName}</span>}
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
                                    {hasStations ? (isFieldExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <div className="w-3.5" />}
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
        </div>
      </ScrollArea>
    );
  };

  // ===== Column card =====
  const renderLocationCard = (
    title: string,
    icon: React.ReactNode,
    items: (Plant | Field | Station)[],
    type: LocationType,
    selectedId: string | null,
    onSelect?: (id: string | null, item?: Plant | Field | Station) => void,
    getParentName?: (item: Field | Station) => string | null,
    getSubtitle?: (item: Plant | Field | Station) => string | null
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
                const subtitle = getSubtitle ? getSubtitle(item) : null;

                return (
                  <div
                    key={item.id}
                    className={`group p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-border'
                    }`}
                    onClick={() => onSelect?.(isSelected ? null : item.id, item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.name}</span>
                          {isSelected && onSelect && (
                            <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        {subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
                        )}
                        {parentName && (
                          <span className="text-xs text-muted-foreground block">Parent: {parentName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(type, item); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(type, item); }}>
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
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <Tabs defaultValue="tree" className="w-full">
          {/* Toolbar: Search (left) + View toggles + Expand/Collapse + Add */}
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            {/* Search left */}
            <div className="relative w-72 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Right cluster: view toggle + expand/collapse + add */}
            <div className="flex items-center gap-2">
              <TabsList className="h-9">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="tree" className="px-2.5" aria-label="Tree View">
                      <GitBranch className="h-4 w-4" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Tree View</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="columns" className="px-2.5" aria-label="Columns View">
                      <LayoutGrid className="h-4 w-4" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Columns View</TooltipContent>
                </Tooltip>
              </TabsList>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={toggleExpandCollapseAll} aria-label={allExpanded ? 'Collapse All' : 'Expand All'}>
                    {allExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{allExpanded ? 'Collapse All' : 'Expand All'}</TooltipContent>
              </Tooltip>

              <Button size="sm" onClick={openUnifiedAddDialog} className="h-9">
                <Plus className="h-4 w-4 mr-1" />
                Add Location
              </Button>
            </div>
          </div>

          <TabsContent value="tree" className="mt-0">
            <Card className="border-border/60 shadow-md ring-1 ring-primary/5 bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-primary/5 via-background to-background">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/60">
                    <BGCIcon size={26} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold tracking-tight">Basrah Gas Company</span>
                    <span className="text-[11px] font-normal uppercase tracking-wider text-muted-foreground">BGC · Asset Hierarchy</span>
                  </div>
                  {searchQuery && (
                    <Badge variant="secondary" className="ml-2">Filtered</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
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
                (id) => { setSelectedPlant(id); setSelectedField(null); },
                undefined,
                (item) => getPlantFullName(item as Plant)
              )}

              {renderLocationCard(
                'Fields',
                <MapPin className="h-4 w-4" />,
                columnFields,
                'field',
                selectedField,
                (id, item) => {
                  setSelectedField(id);
                  if (id && item) {
                    const f = item as Field;
                    if (f.plant_id) setSelectedPlant(f.plant_id);
                  }
                },
                (item) => {
                  const field = item as Field;
                  return plants.find(p => p.id === field.plant_id)?.name || null;
                }
                // No subtitle for fields — only the Parent line should show
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

        {/* Add/Edit Dialog (unified) */}
        <Dialog open={addEditDialog.open} onOpenChange={(open) => !open && setAddEditDialog({ ...addEditDialog, open: false })}>
          <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
            {/* Accent header */}
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/8 via-background to-background border-b border-border/40">
              <DialogHeader className="space-y-1.5 text-left">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {addEditDialog.mode === 'add' ? 'Add Location' : `Edit ${getTypeLabel(formType)}`}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {addEditDialog.mode === 'add'
                    ? 'Add a plant, field, or station to the asset hierarchy.'
                    : `Update the ${formType} details below.`}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Fixed-height body so the modal does not resize as fields change */}
            <div className="px-6 py-5 space-y-5 min-h-[360px]">
              {addEditDialog.mode === 'add' && addEditDialog.allowTypeChange && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Location Type
                  </Label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-lg">
                    {([
                      { value: 'plant', label: 'Plant', icon: Building2, disabled: false },
                      { value: 'field', label: 'Field', icon: Layers, disabled: plants.length === 0 },
                      { value: 'station', label: 'Station', icon: Radio, disabled: fields.length === 0 },
                    ] as const).map(({ value, label, icon: Icon, disabled }) => {
                      const active = formType === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleTypeChange(value as LocationType)}
                          className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-md text-xs font-medium transition-all ${
                            active
                              ? 'bg-background shadow-sm text-foreground ring-1 ring-border'
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                          } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parent selector — always rendered to keep dialog height constant */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Parent
                </Label>
                {formType === 'plant' ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-dashed border-border/60 bg-muted/30 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 opacity-60" />
                    Top-level — no parent required
                  </div>
                ) : formType === 'field' ? (
                  <Select value={formParentId || '__none__'} onValueChange={(v) => setFormParentId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select a plant" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {plants.map(plant => (
                        <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={formParentId || '__none__'} onValueChange={(v) => setFormParentId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select a field" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {fields.map(field => {
                        const parent = field.plant_id ? plants.find(p => p.id === field.plant_id) : null;
                        return (
                          <SelectItem key={field.id} value={field.id}>
                            {field.name}{parent ? ` · ${parent.name}` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={`e.g. ${formType === 'plant' ? 'BNGL' : formType === 'field' ? 'Rumaila' : 'CS-01'}`}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description <span className="normal-case text-muted-foreground/70">— optional</span>
                </Label>
                <Input
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short label or full name"
                  className="h-10"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20">
              <Button variant="outline" onClick={() => setAddEditDialog({ ...addEditDialog, open: false })}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formName.trim()}>
                {addEditDialog.mode === 'add' ? 'Add Location' : 'Save Changes'}
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
    </TooltipProvider>
  );
};

export default LocationManagement;
