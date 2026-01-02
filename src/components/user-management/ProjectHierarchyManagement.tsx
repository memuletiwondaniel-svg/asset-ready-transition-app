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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  Search
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

  const getRegionColor = (regionName: string) => {
    switch (regionName.toLowerCase()) {
      case 'north': return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'central': return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      case 'south': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
      default: return 'bg-muted border-border';
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

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Project Hierarchy
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage regional groupings of plants and station overrides
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddRegionDialog} onOpenChange={setShowAddRegionDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Region
              </Button>
            </DialogTrigger>
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
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search plants, fields, or stations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {regions.map(region => (
          <Card key={region.id} className={`${getRegionColor(region.name)} border-2`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>{getRegionIcon(region.name)}</span>
                  {region.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {region.plants.length} plants
                  </Badge>
                  {region.stationOverrides.length > 0 && (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                      {region.stationOverrides.length} overrides
                    </Badge>
                  )}
                </div>
              </div>
              {region.description && (
                <p className="text-xs text-muted-foreground mt-1">{region.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {/* Plants */}
                  {region.plants
                    .filter(filterHierarchy)
                    .map(plant => (
                      <Collapsible 
                        key={plant.id} 
                        open={expandedPlants.has(plant.id)}
                        onOpenChange={() => togglePlant(plant.id)}
                      >
                        <div className="bg-background/50 rounded-lg border">
                          <CollapsibleTrigger className="w-full p-2 flex items-center justify-between hover:bg-accent/50 rounded-t-lg">
                            <div className="flex items-center gap-2">
                              {expandedPlants.has(plant.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <Building2 className="h-4 w-4 text-primary" />
                              <span className="font-medium">{plant.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMovePlantDialog({ plant, currentRegion: region });
                              }}
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="p-2 pt-0 space-y-1">
                              {plant.fields.map(field => (
                                <Collapsible
                                  key={field.id}
                                  open={expandedFields.has(field.id)}
                                  onOpenChange={() => toggleField(field.id)}
                                >
                                  <CollapsibleTrigger className="w-full p-1.5 pl-6 flex items-center gap-2 hover:bg-accent/30 rounded">
                                    {expandedFields.has(field.id) ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    <Layers className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm">{field.name}</span>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="pl-12 space-y-1 py-1">
                                      {field.stations.map(station => (
                                        <div
                                          key={station.id}
                                          className={`flex items-center justify-between p-1.5 rounded text-sm ${
                                            station.hasOverride 
                                              ? 'bg-purple-500/10 border border-purple-500/20' 
                                              : 'hover:bg-accent/20'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Radio className="h-3 w-3 text-muted-foreground" />
                                            <span>{station.name}</span>
                                            {station.hasOverride && (
                                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                                                → {station.overrideRegionName}
                                              </Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={() => setStationOverrideDialog({
                                              stationId: station.id,
                                              stationName: station.name,
                                              currentRegionId: station.overrideRegionId
                                            })}
                                          >
                                            <ArrowLeftRight className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}

                  {/* Station Overrides from other regions */}
                  {region.stationOverrides.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <p className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Station Overrides (from other regions)
                      </p>
                      {region.stationOverrides.map(override => (
                        <div
                          key={override.id}
                          className="flex items-center justify-between p-2 bg-purple-500/10 rounded border border-purple-500/20 mb-1"
                        >
                          <div className="text-sm">
                            <span className="font-medium">{override.station_name}</span>
                            <span className="text-muted-foreground text-xs ml-2">
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

                  {region.plants.filter(filterHierarchy).length === 0 && region.stationOverrides.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No plants assigned to this region
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unassigned Plants */}
      {unassignedPlants.length > 0 && (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
              <AlertTriangle className="h-5 w-5" />
              Unassigned Plants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassignedPlants.map(plant => (
                <div
                  key={plant.id}
                  className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg"
                >
                  <Building2 className="h-4 w-4" />
                  <span>{plant.name}</span>
                  <Select
                    onValueChange={(regionId) => assignPlantToRegion(plant.id, regionId)}
                  >
                    <SelectTrigger className="h-7 w-32">
                      <SelectValue placeholder="Assign to..." />
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Move Plant Dialog */}
      <Dialog open={!!movePlantDialog} onOpenChange={() => setMovePlantDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Plant to Another Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Move <strong>{movePlantDialog?.plant.name}</strong> from{' '}
              <strong>{movePlantDialog?.currentRegion.name}</strong> to:
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
      <Dialog open={!!stationOverrideDialog} onOpenChange={() => setStationOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Station Region Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Override region for station <strong>{stationOverrideDialog?.stationName}</strong>:
            </p>
            <Select value={selectedTargetRegion} onValueChange={setSelectedTargetRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(region => (
                  <SelectItem key={region.id} value={region.id}>
                    {getRegionIcon(region.name)} {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stationOverrideDialog?.currentRegionId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  removeStationOverride(stationOverrideDialog.stationId);
                  setStationOverrideDialog(null);
                }}
              >
                Remove Override
              </Button>
            )}
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
    </div>
  );
};

export default ProjectHierarchyManagement;
