import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, ListChecks } from 'lucide-react';
import { WizardActivity, catalogToWizardActivity } from './types';
import { ORAActivity, useORAActivityCatalog } from '@/hooks/useORAActivityCatalog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Props {
  activities: WizardActivity[];
  phase: string;
  onActivitiesChange: (activities: WizardActivity[]) => void;
}

export const StepActivities: React.FC<Props> = ({ activities, phase, onActivitiesChange }) => {
  const [search, setSearch] = useState('');
  const [showAddFromCatalog, setShowAddFromCatalog] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  const selectedCount = activities.filter(a => a.selected).length;

  const filteredActivities = activities.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id: string) => {
    onActivitiesChange(
      activities.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    );
  };

  const handleAddCustomActivity = () => {
    if (!customName) return;
    const newActivity: WizardActivity = {
      id: `custom-${Date.now()}`,
      catalogId: `CUSTOM-${Date.now()}`,
      name: customName,
      description: customDescription || null,
      phase,
      area: 'ORM',
      entryType: 'activity',
      requirementLevel: 'optional',
      estimatedManhours: null,
      discipline: null,
      selected: true,
      durationDays: null,
      startDate: '',
      endDate: '',
      predecessorIds: [],
    };
    onActivitiesChange([...activities, newActivity]);
    setCustomName('');
    setCustomDescription('');
    setShowAddCustom(false);
  };

  return (
    <div className="space-y-4 p-1">
      <div className="text-center space-y-2 pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <ListChecks className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">ORA Activities & Deliverables</h3>
        <p className="text-sm text-muted-foreground">
          {activities.length} activities loaded • {selectedCount} selected
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAddFromCatalog(true)}>
          <Plus className="w-4 h-4 mr-1" /> From Catalog
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowAddCustom(true)}>
          <Plus className="w-4 h-4 mr-1" /> Custom
        </Button>
      </div>

      <ScrollArea className="h-[340px]">
        <div className="space-y-2 pr-3">
          {filteredActivities.map(activity => (
            <div
              key={activity.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                activity.selected ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border opacity-60"
              )}
            >
              <Checkbox
                checked={activity.selected}
                onCheckedChange={() => handleToggle(activity.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{activity.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {activity.entryType}
                  </Badge>
                  {activity.requirementLevel === 'mandatory' && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">Required</Badge>
                  )}
                </div>
                {activity.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{activity.description}</p>
                )}
                <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                  {activity.area && <span>{activity.area}</span>}
                  {activity.discipline && <span>• {activity.discipline}</span>}
                  {activity.estimatedManhours && <span>• {activity.estimatedManhours}h est.</span>}
                </div>
              </div>
            </div>
          ))}
          {filteredActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No activities found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add from Catalog Dialog */}
      <AddFromCatalogDialog
        open={showAddFromCatalog}
        onOpenChange={setShowAddFromCatalog}
        existingIds={activities.map(a => a.id)}
        onAdd={(newActivities) => {
          onActivitiesChange([...activities, ...newActivities]);
          setShowAddFromCatalog(false);
        }}
      />

      {/* Add Custom Dialog */}
      <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Activity Name *</Label>
              <Input value={customName} onChange={(e) => setCustomName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustom(false)}>Cancel</Button>
            <Button onClick={handleAddCustomActivity} disabled={!customName}>Add Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-component for adding from catalog
function AddFromCatalogDialog({
  open, onOpenChange, existingIds, onAdd
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIds: string[];
  onAdd: (activities: WizardActivity[]) => void;
}) {
  const { activities: catalogActivities, isLoading } = useORAActivityCatalog();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const availableActivities = catalogActivities.filter(a => !existingIds.includes(a.id));
  const filtered = availableActivities.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const toAdd = catalogActivities
      .filter(a => selected.has(a.id))
      .map(catalogToWizardActivity);
    onAdd(toAdd);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from Activity Catalog</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search catalog..." className="pl-9" />
        </div>
        <ScrollArea className="flex-1 max-h-[40vh]">
          <div className="space-y-1 pr-3">
            {filtered.map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => toggleSelect(a.id)}>
                <Checkbox checked={selected.has(a.id)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{a.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{a.phase}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            Add {selected.size} Activities
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
