import React, { useState } from 'react';
import { useProjectHierarchy, RegionWithPlants, PlantWithHierarchy } from '@/hooks/useProjectHierarchy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Building2, 
  Layers, 
  Radio,
  Plus,
  ArrowLeftRight,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  GitBranch,
  LayoutGrid,
  Pencil,
  Trash2
} from 'lucide-react';

interface ProjectHierarchyManagementProps {
  selectedLanguage?: string;
  translations?: Record<string, string>;
}

const ProjectHierarchyManagement: React.FC<ProjectHierarchyManagementProps> = ({
  selectedLanguage = 'en',
  translations = {}
}) => {
  const {
    regions,
    unassignedPlants,
    isLoading,
    refetch,
    assignPlantToRegion,
    removePlantFromRegion,
    addStationOverride,
    removeStationOverride,
    addRegion,
    deleteRegion
  } = useProjectHierarchy();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(regions.map(r => r.id)));
  const [expandedPlants, setExpandedPlants] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionDescription, setNewRegionDescription] = useState('');
  const [showAddRegionDialog, setShowAddRegionDialog] = useState(false);
  const [movePlantDialog, setMovePlantDialog] = useState<{ plant: PlantWithHierarchy; currentRegion: RegionWithPlants } | null>(null);
  const [stationOverrideDialog, setStationOverrideDialog] = useState<{ stationId: string; stationName: string; currentRegionId?: string } | null>(null);
  const [selectedTargetRegion, setSelectedTargetRegion] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
  const [deleteRegionDialog, setDeleteRegionDialog] = useState<RegionWithPlants | null>(null);

  // Initialize expanded regions when data loads
  React.useEffect(() => {
    if (regions.length > 0 && expandedRegions.size === 0) {
      setExpandedRegions(new Set(regions.map(r => r.id)));
    }
  }, [regions]);

  const toggleRegion = (regionId: string) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(regionId)) {
      newExpanded.delete(regionId);
    } else {
      newExpanded.add(regionId);
    }
    setExpandedRegions(newExpanded);
  };

  const togglePlant = (plantId: string) => {
    const newExpanded = new Set(expandedPlants);
    if (newExpanded.has(plantId)) {
      newExpanded.delete(plantId);
    } else {
      newExpanded.add(plantId);
    }
    setExpandedPlants(newExpanded);
  };

  const toggleField = (fieldId: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId);
    } else {
      newExpanded.add(fieldId);
    }
    setExpandedFields(newExpanded);
  };

  const expandAll = () => {
    setExpandedRegions(new Set(regions.map(r => r.id)));
    const allPlants = regions.flatMap(r => r.plants.map(p => p.id));
    const allFields = regions.flatMap(r => r.plants.flatMap(p => p.fields.map(f => f.id)));
    setExpandedPlants(new Set(allPlants));
    setExpandedFields(new Set(allFields));
  };

  const collapseAll = () => {
    setExpandedRegions(new Set());
    setExpandedPlants(new Set());
    setExpandedFields(new Set());
  };

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) return;
    await addRegion(newRegionName.trim(), newRegionDescription.trim() || undefined);
    setNewRegionName('');
    setNewRegionDescription('');
    setShowAddRegionDialog(false);
  };

  const handleMovePlant = async () => {
    if (!movePlantDialog || !selectedTargetRegion) return;
    await assignPlantToRegion(movePlantDialog.plant.id, selectedTargetRegion);
    setMovePlantDialog(null);
    setSelectedTargetRegion('');
  };

  const handleStationOverride = async () => {
    if (!stationOverrideDialog || !selectedTargetRegion) return;
    await addStationOverride(stationOverrideDialog.stationId, selectedTargetRegion);
    setStationOverrideDialog(null);
    setSelectedTargetRegion('');
  };

  const handleDeleteRegion = async () => {
    if (!deleteRegionDialog) return;
    await deleteRegion(deleteRegionDialog.id);
    setDeleteRegionDialog(null);
  };

  const filterHierarchy = (plant: PlantWithHierarchy): boolean => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (plant.name.toLowerCase().includes(query)) return true;
    
    for (const field of plant.fields) {
      if (field.name.toLowerCase().includes(query)) return true;
      for (const station of field.stations) {
        if (station.name.toLowerCase().includes(query)) return true;
      }
    }
    
    return false;
  };

  const filterRegion = (region: RegionWithPlants): boolean => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (region.name.toLowerCase().includes(query)) return true;
    if (region.description?.toLowerCase().includes(query)) return true;
    
    return region.plants.some(filterHierarchy);
  };

  const getRegionColor = (regionName: string) => {
    switch (regionName.toLowerCase()) {
      case 'north': return 'text-blue-600';
      case 'central': return 'text-amber-600';
      case 'south': return 'text-emerald-600';
      default: return 'text-primary';
    }
  };

  const getRegionIcon = (regionName: string) => {
    switch (regionName.toLowerCase()) {
      case 'north': return '🔵';
      case 'central': return '🟡';
      case 'south': return '🟢';
      default: return '⚪';
    }
  };

  // Get plants for selected region in columns view
  const getRegionPlants = (regionId: string | null) => {
    if (!regionId) return [];
    const region = regions.find(r => r.id === regionId);
    return region?.plants || [];
  };

  // Get fields for selected plant in columns view
  const getPlantFields = (regionId: string | null, plantId: string | null) => {
    if (!regionId || !plantId) return [];
    const region = regions.find(r => r.id === regionId);
    const plant = region?.plants.find(p => p.id === plantId);
    return plant?.fields || [];
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const visibleRegions = regions.filter(filterRegion);

  // Tree View Component
  const TreeView = () => {
    if (regions.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No regions configured yet</p>
          <Button className="mt-4" onClick={() => setShowAddRegionDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Region
          </Button>
        </div>
      );
    }

    if (searchQuery && visibleRegions.length === 0) {
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
          {visibleRegions.map(region => {
            const isRegionExpanded = expandedRegions.has(region.id) || !!searchQuery;
            const filteredPlants = region.plants.filter(filterHierarchy);
            const hasChildren = filteredPlants.length > 0 || region.stationOverrides.length > 0;

            return (
              <div key={region.id} className="select-none">
                <Collapsible open={isRegionExpanded} onOpenChange={() => toggleRegion(region.id)}>
                  <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        {hasChildren ? (
                          isRegionExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        ) : (
                          <div className="w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2 flex-1 py-1.5 px-2 cursor-pointer" onClick={() => toggleRegion(region.id)}>
                      <span className="text-lg">{getRegionIcon(region.name)}</span>
                      <MapPin className={`h-4 w-4 shrink-0 ${getRegionColor(region.name)}`} />
                      <span className="font-medium">{region.name}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">{region.plants.length} plants</Badge>
                      {region.stationOverrides.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                          {region.stationOverrides.length} overrides
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteRegionDialog(region);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-4 border-l border-border pl-2 space-y-1">
                      {/* Plants */}
                      {filteredPlants.map(plant => {
                        const isPlantExpanded = expandedPlants.has(plant.id) || !!searchQuery;
                        const hasFields = plant.fields.length > 0;

                        return (
                          <div key={plant.id}>
                            <Collapsible open={isPlantExpanded} onOpenChange={() => togglePlant(plant.id)}>
                              <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                                    {hasFields ? (
                                      isPlantExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )
                                    ) : (
                                      <div className="w-3.5" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                                <div className="flex items-center gap-2 flex-1 py-1 px-2 cursor-pointer" onClick={() => togglePlant(plant.id)}>
                                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="text-sm font-medium">{plant.name}</span>
                                  {plant.fields.length > 0 && (
                                    <Badge variant="outline" className="ml-1 text-xs py-0">{plant.fields.length}</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMovePlantDialog({ plant, currentRegion: region });
                                    }}
                                    title="Move to another region"
                                  >
                                    <ArrowLeftRight className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                              <CollapsibleContent>
                                <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5">
                                  {plant.fields.map(field => {
                                    const isFieldExpanded = expandedFields.has(field.id) || !!searchQuery;
                                    const hasStations = field.stations.length > 0;

                                    return (
                                      <div key={field.id}>
                                        <Collapsible open={isFieldExpanded} onOpenChange={() => toggleField(field.id)}>
                                          <div className="flex items-center group rounded-md hover:bg-accent/50 transition-colors">
                                            <CollapsibleTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
                                                {hasStations ? (
                                                  isFieldExpanded ? (
                                                    <ChevronDown className="h-3 w-3" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3" />
                                                  )
                                                ) : (
                                                  <div className="w-3" />
                                                )}
                                              </Button>
                                            </CollapsibleTrigger>
                                            <div className="flex items-center gap-2 flex-1 py-1 px-2 cursor-pointer" onClick={() => toggleField(field.id)}>
                                              <Layers className="h-3 w-3 text-blue-500 shrink-0" />
                                              <span className="text-sm">{field.name}</span>
                                              {field.stations.length > 0 && (
                                                <Badge variant="outline" className="text-xs py-0">{field.stations.length}</Badge>
                                              )}
                                            </div>
                                          </div>
                                          <CollapsibleContent>
                                            <div className="ml-4 border-l border-border/30 pl-2 space-y-0.5">
                                              {field.stations.map(station => (
                                                <div
                                                  key={station.id}
                                                  className={`flex items-center group rounded-md transition-colors py-1 px-2 ${
                                                    station.hasOverride 
                                                      ? 'bg-purple-500/10 border border-purple-500/20' 
                                                      : 'hover:bg-accent/50'
                                                  }`}
                                                >
                                                  <Radio className="h-3 w-3 text-amber-500 shrink-0 mr-2" />
                                                  <span className="text-sm text-muted-foreground flex-1">{station.name}</span>
                                                  {station.hasOverride && (
                                                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30 mr-2">
                                                      → {station.overrideRegionName}
                                                    </Badge>
                                                  )}
                                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-5 w-5"
                                                      onClick={() => setStationOverrideDialog({
                                                        stationId: station.id,
                                                        stationName: station.name,
                                                        currentRegionId: station.overrideRegionId
                                                      })}
                                                      title="Override region"
                                                    >
                                                      <ArrowLeftRight className="h-2.5 w-2.5" />
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

                      {/* Station Overrides */}
                      {region.stationOverrides.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-purple-500/20">
                          <p className="text-xs font-medium text-purple-600 mb-1 px-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Station Overrides
                          </p>
                          {region.stationOverrides.map(override => (
                            <div
                              key={override.id}
                              className="flex items-center justify-between py-1 px-2 bg-purple-500/10 rounded text-sm mb-0.5"
                            >
                              <div className="flex items-center gap-2">
                                <Radio className="h-3 w-3 text-purple-500" />
                                <span className="font-medium">{override.station_name}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({override.field_name} • {override.plant_name})
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 hover:bg-destructive/20"
                                onClick={() => removeStationOverride(override.station_id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {filteredPlants.length === 0 && region.stationOverrides.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2 px-2">
                          No plants assigned to this region
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}

          {/* Unassigned Plants */}
          {unassignedPlants.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 px-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Unassigned Plants
              </p>
              {unassignedPlants.map(plant => (
                <div
                  key={plant.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent/50"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{plant.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    );
  };

  // Columns View Component
  const ColumnsView = () => {
    const selectedRegionData = regions.find(r => r.id === selectedRegion);
    const selectedPlantData = selectedRegionData?.plants.find(p => p.id === selectedPlant);

    return (
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Regions Column */}
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Regions
                <Badge variant="secondary" className="ml-1">{regions.length}</Badge>
              </CardTitle>
              <Button size="sm" onClick={() => setShowAddRegionDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {regions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No regions found
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-2">
                  {regions.map(region => {
                    const isSelected = selectedRegion === region.id;
                    return (
                      <div
                        key={region.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-accent border-border'
                        }`}
                        onClick={() => {
                          setSelectedRegion(isSelected ? null : region.id);
                          setSelectedPlant(null);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span>{getRegionIcon(region.name)}</span>
                              <span className="font-medium truncate">{region.name}</span>
                              {isSelected && (
                                <ChevronRight className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {region.plants.length} plants
                              </Badge>
                              {region.stationOverrides.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                                  {region.stationOverrides.length} overrides
                                </Badge>
                              )}
                            </div>
                            {region.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {region.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteRegionDialog(region);
                              }}
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

        {/* Plants Column */}
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Plants
                <Badge variant="secondary" className="ml-1">
                  {selectedRegionData?.plants.length || 0}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!selectedRegion ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Select a region to view plants
              </div>
            ) : (selectedRegionData?.plants.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No plants in this region
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-2">
                  {selectedRegionData?.plants.map(plant => {
                    const isSelected = selectedPlant === plant.id;
                    return (
                      <div
                        key={plant.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-accent border-border'
                        }`}
                        onClick={() => setSelectedPlant(isSelected ? null : plant.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{plant.name}</span>
                              {isSelected && (
                                <ChevronRight className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {plant.fields.length} fields
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMovePlantDialog({ plant, currentRegion: selectedRegionData! });
                              }}
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
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

        {/* Fields & Stations Column */}
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Fields & Stations
                <Badge variant="secondary" className="ml-1">
                  {selectedPlantData?.fields.length || 0}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!selectedPlant ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Select a plant to view fields
              </div>
            ) : (selectedPlantData?.fields.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No fields in this plant
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-2">
                  {selectedPlantData?.fields.map(field => (
                    <div key={field.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium text-sm">{field.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {field.stations.length} stations
                        </Badge>
                      </div>
                      {field.stations.length > 0 && (
                        <div className="space-y-1 pl-5 border-l border-border/50">
                          {field.stations.map(station => (
                            <div
                              key={station.id}
                              className={`flex items-center justify-between py-1 px-2 rounded text-sm ${
                                station.hasOverride 
                                  ? 'bg-purple-500/10 border border-purple-500/20' 
                                  : 'hover:bg-accent/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Radio className="h-3 w-3 text-amber-500" />
                                <span className="text-muted-foreground">{station.name}</span>
                              </div>
                              {station.hasOverride && (
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                                  → {station.overrideRegionName}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Manage your project hierarchy: Regions → Plants → Fields → Stations</span>
        </div>
        
        {/* Search Input */}
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hierarchy..."
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
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <Button size="sm" onClick={() => setShowAddRegionDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Region
            </Button>
          </div>
        </div>

        <TabsContent value="tree" className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Project Hierarchy
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
          <ColumnsView />
        </TabsContent>
      </Tabs>

      {/* Add Region Dialog */}
      <Dialog open={showAddRegionDialog} onOpenChange={setShowAddRegionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="regionName">Region Name</Label>
              <Input
                id="regionName"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                placeholder="e.g., East"
              />
            </div>
            <div>
              <Label htmlFor="regionDescription">Description (optional)</Label>
              <Input
                id="regionDescription"
                value={newRegionDescription}
                onChange={(e) => setNewRegionDescription(e.target.value)}
                placeholder="Description of the region"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRegionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRegion} disabled={!newRegionName.trim()}>
              Add Region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Plant Dialog */}
      <Dialog open={!!movePlantDialog} onOpenChange={(open) => !open && setMovePlantDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Plant to Another Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Move <span className="font-medium">{movePlantDialog?.plant.name}</span> from{' '}
              <span className="font-medium">{movePlantDialog?.currentRegion.name}</span> to:
            </p>
            <Select value={selectedTargetRegion} onValueChange={setSelectedTargetRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select target region" />
              </SelectTrigger>
              <SelectContent>
                {regions
                  .filter(r => r.id !== movePlantDialog?.currentRegion.id)
                  .map(region => (
                    <SelectItem key={region.id} value={region.id}>
                      {getRegionIcon(region.name)} {region.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovePlantDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleMovePlant} disabled={!selectedTargetRegion}>
              Move Plant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Station Override Dialog */}
      <Dialog open={!!stationOverrideDialog} onOpenChange={(open) => !open && setStationOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Station Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Override region assignment for <span className="font-medium">{stationOverrideDialog?.stationName}</span>:
            </p>
            <Select value={selectedTargetRegion} onValueChange={setSelectedTargetRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select override region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(region => (
                  <SelectItem key={region.id} value={region.id}>
                    {getRegionIcon(region.name)} {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStationOverrideDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleStationOverride} disabled={!selectedTargetRegion}>
              Set Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Region Confirmation */}
      <AlertDialog open={!!deleteRegionDialog} onOpenChange={(open) => !open && setDeleteRegionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Region?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRegionDialog?.name}"? 
              This will unassign all {deleteRegionDialog?.plants.length || 0} plants from this region.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRegion} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectHierarchyManagement;
