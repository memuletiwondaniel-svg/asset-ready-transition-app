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
import { Plus, Pencil, Trash2, Building2, MapPin, Radio, ChevronRight } from 'lucide-react';
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
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');

  const filteredFields = selectedPlant ? getFieldsByPlant(selectedPlant) : fields;
  const filteredStations = selectedField ? getStationsByField(selectedField) : stations;

  const openAddDialog = (type: LocationType) => {
    setFormName('');
    setFormDescription('');
    setFormParentId(type === 'field' ? (selectedPlant || '') : type === 'station' ? (selectedField || '') : '');
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>Manage your location hierarchy: Plants → Fields → Stations</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {renderLocationCard(
          'Plants',
          <Building2 className="h-4 w-4" />,
          plants,
          'plant',
          selectedPlant,
          (id) => { setSelectedPlant(id); setSelectedField(null); }
        )}

        {renderLocationCard(
          'Fields',
          <MapPin className="h-4 w-4" />,
          filteredFields,
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
          filteredStations,
          'station',
          null,
          undefined,
          (item) => {
            const station = item as Station;
            return fields.find(f => f.id === station.field_id)?.name || null;
          }
        )}
      </div>

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
