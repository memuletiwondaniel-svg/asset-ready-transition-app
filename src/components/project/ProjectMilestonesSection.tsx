import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, X, CalendarDays, Pencil, Check, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectMilestoneTypes } from '@/hooks/useProjectMilestoneTypes';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';

interface ProjectMilestonesSectionProps {
  milestones: any[];
  setMilestones: React.Dispatch<React.SetStateAction<any[]>>;
}

interface MilestoneItemProps {
  milestone: any;
  editingId: string | null;
  editingMilestone: any;
  milestoneOptions: { value: string; label: string }[];
  isLoading: boolean;
  isCreating: boolean;
  onStartEditing: (milestone: any) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onRemove: (id: string) => void;
  onEditMilestoneTypeSelect: (typeId: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditDateChange: (date: Date | undefined) => void;
  onEditScorecardChange: (checked: boolean) => void;
  onCreateNewMilestoneTypeForEdit: (name: string) => void;
}

const MilestoneItem: React.FC<MilestoneItemProps> = ({
  milestone,
  editingId,
  editingMilestone,
  milestoneOptions,
  isLoading,
  isCreating,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onRemove,
  onEditMilestoneTypeSelect,
  onEditDescriptionChange,
  onEditDateChange,
  onEditScorecardChange,
  onCreateNewMilestoneTypeForEdit,
}) => {
  const isEditing = editingId === milestone.id;

  return (
    <div className="group p-3 bg-muted/40 hover:bg-muted/60 rounded-lg border border-transparent hover:border-border/60 transition-colors">
      {isEditing && editingMilestone ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs">Milestone Type</Label>
              <EnhancedSearchableCombobox
                options={milestoneOptions}
                value={editingMilestone.milestone_type_id}
                onValueChange={onEditMilestoneTypeSelect}
                placeholder="Select milestone..."
                searchPlaceholder="Search milestones..."
                allowCreate={true}
                onCreateNew={onCreateNewMilestoneTypeForEdit}
                disabled={isLoading || isCreating}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={editingMilestone.milestone_description}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                placeholder="Additional comments..."
                className="h-10 min-h-[40px] resize-none"
                rows={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editingMilestone.milestone_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {editingMilestone.milestone_date ? (
                      format(editingMilestone.milestone_date, "do MMM yyyy")
                    ) : (
                      <span>Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editingMilestone.milestone_date}
                    onSelect={onEditDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingMilestone.is_scorecard_project}
                  onCheckedChange={onEditScorecardChange}
                />
                <span className="text-xs text-muted-foreground">Scorecard</span>
              </div>
              <div className="flex gap-1 ml-auto">
                <Button type="button" size="sm" onClick={onSaveEditing} className="bg-green-600 hover:bg-green-700 text-white">
                  <Check className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={onCancelEditing}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="font-medium text-foreground truncate">
              {milestone.milestone_name}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {format(new Date(milestone.milestone_date), "do MMMM yyyy")}
            </span>
            {milestone.is_scorecard_project && (
              <Badge
                variant="outline"
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-400 text-xs font-semibold shadow-sm whitespace-nowrap"
              >
                Scorecard
              </Badge>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onStartEditing(milestone)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50"
              >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(milestone.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            </div>
          </div>
          </div>
      )}
    </div>
  );
};

export const ProjectMilestonesSection: React.FC<ProjectMilestonesSectionProps> = ({ 
  milestones, 
  setMilestones 
}) => {
  const { milestoneTypes, isLoading, createMilestoneType, isCreating } = useProjectMilestoneTypes();
  
  const [newMilestone, setNewMilestone] = useState({
    milestone_type_id: '',
    milestone_name: '',
    milestone_description: '',
    milestone_date: undefined as Date | undefined,
    is_scorecard_project: false,
    status: 'pending' as 'pending' | 'in_progress' | 'completed'
  });
  const [isAddOpen, setIsAddOpen] = useState(false);


  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<{
    milestone_type_id: string;
    milestone_name: string;
    milestone_description: string;
    milestone_date: Date | undefined;
    is_scorecard_project: boolean;
  } | null>(null);

  const sortedMilestones = useMemo(
    () => [...milestones].sort((a, b) =>
      new Date(a.milestone_date).getTime() - new Date(b.milestone_date).getTime()
    ),
    [milestones]
  );

  const milestoneOptions = milestoneTypes.map(type => ({
    value: type.id,
    label: type.name
  }));

  const handleMilestoneTypeSelect = (typeId: string) => {
    const selectedType = milestoneTypes.find(t => t.id === typeId);
    setNewMilestone(prev => ({
      ...prev,
      milestone_type_id: typeId,
      milestone_name: selectedType?.name || '',
      milestone_description: selectedType?.description || ''
    }));
  };

  const handleEditMilestoneTypeSelect = (typeId: string) => {
    const selectedType = milestoneTypes.find(t => t.id === typeId);
    setEditingMilestone(prev => prev ? ({
      ...prev,
      milestone_type_id: typeId,
      milestone_name: selectedType?.name || prev.milestone_name
    }) : null);
  };

  const handleCreateNewMilestoneType = async (name: string) => {
    try {
      const result = await createMilestoneType({ name });
      setNewMilestone(prev => ({
        ...prev,
        milestone_type_id: result.id,
        milestone_name: result.name
      }));
    } catch (error) {
      console.error('Failed to create milestone type:', error);
    }
  };

  const handleCreateNewMilestoneTypeForEdit = async (name: string) => {
    try {
      const result = await createMilestoneType({ name });
      setEditingMilestone(prev => prev ? ({
        ...prev,
        milestone_type_id: result.id,
        milestone_name: result.name
      }) : null);
    } catch (error) {
      console.error('Failed to create milestone type:', error);
    }
  };

  const addMilestone = () => {
    if (newMilestone.milestone_name && newMilestone.milestone_date) {
      const milestone = {
        id: Date.now().toString(),
        milestone_type_id: newMilestone.milestone_type_id,
        milestone_name: newMilestone.milestone_name,
        milestone_description: newMilestone.milestone_description,
        milestone_date: newMilestone.milestone_date.toISOString().split('T')[0],
        is_scorecard_project: newMilestone.is_scorecard_project,
        status: newMilestone.status
      };
      setMilestones(prev => [...prev, milestone]);
      setNewMilestone({ 
        milestone_type_id: '',
        milestone_name: '', 
        milestone_description: '',
        milestone_date: undefined, 
        is_scorecard_project: false,
        status: 'pending'
      });
      setIsAddOpen(false);
    }
  };

  const removeMilestone = (id: string) => {
    setMilestones(prev => prev.filter(milestone => milestone.id !== id));
  };

  const startEditing = (milestone: any) => {
    setEditingId(milestone.id);
    setEditingMilestone({
      milestone_type_id: milestone.milestone_type_id || '',
      milestone_name: milestone.milestone_name,
      milestone_description: milestone.milestone_description || '',
      milestone_date: new Date(milestone.milestone_date),
      is_scorecard_project: milestone.is_scorecard_project
    });
  };

  const saveEditing = () => {
    if (editingId && editingMilestone && editingMilestone.milestone_name && editingMilestone.milestone_date) {
      setMilestones(prev => prev.map(m => 
        m.id === editingId 
          ? {
              ...m,
              milestone_type_id: editingMilestone.milestone_type_id,
              milestone_name: editingMilestone.milestone_name,
              milestone_description: editingMilestone.milestone_description,
              milestone_date: editingMilestone.milestone_date.toISOString().split('T')[0],
              is_scorecard_project: editingMilestone.is_scorecard_project
            }
          : m
      ));
      setEditingId(null);
      setEditingMilestone(null);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingMilestone(null);
  };

  const handleStatusChange = (id: string, checked: boolean) => {
    setMilestones(prev => prev.map(m => 
      m.id === id 
        ? { ...m, status: checked ? 'completed' : 'pending' }
        : m
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMilestones((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header row: count + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Milestones</span>
          <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 text-[11px] font-medium bg-muted text-muted-foreground">
            {milestones.length}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Add milestone
        </Button>
      </div>

      {/* Milestones List or Empty State */}
      {milestones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
          <Calendar className="mx-auto h-6 w-6 text-muted-foreground/60 mb-2" />
          <p className="text-sm text-muted-foreground">No milestones yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Click "Add milestone" to define your first one.</p>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={milestones.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <SortableMilestoneItem
                    key={milestone.id}
                    milestone={milestone}
                    editingId={editingId}
                    editingMilestone={editingMilestone}
                    milestoneOptions={milestoneOptions}
                    isLoading={isLoading}
                    isCreating={isCreating}
                    onStartEditing={startEditing}
                    onSaveEditing={saveEditing}
                    onCancelEditing={cancelEditing}
                    onRemove={removeMilestone}
                    onStatusChange={handleStatusChange}
                    onEditMilestoneTypeSelect={handleEditMilestoneTypeSelect}
                    onEditDescriptionChange={(value) => setEditingMilestone(prev => prev ? ({ ...prev, milestone_description: value }) : null)}
                    onEditDateChange={(date) => setEditingMilestone(prev => prev ? ({ ...prev, milestone_date: date }) : null)}
                    onEditScorecardChange={(checked) => setEditingMilestone(prev => prev ? ({ ...prev, is_scorecard_project: checked }) : null)}
                    onCreateNewMilestoneTypeForEdit={handleCreateNewMilestoneTypeForEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add Milestone Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Add milestone
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Milestone Type</Label>
              <EnhancedSearchableCombobox
                options={milestoneOptions}
                value={newMilestone.milestone_type_id}
                onValueChange={handleMilestoneTypeSelect}
                placeholder={isLoading ? "Loading..." : "Select milestone..."}
                searchPlaceholder="Search milestones..."
                allowCreate={true}
                onCreateNew={handleCreateNewMilestoneType}
                disabled={isLoading || isCreating}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Milestone Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !newMilestone.milestone_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {newMilestone.milestone_date
                          ? format(newMilestone.milestone_date, "dd MMM yyyy")
                          : "Pick a date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newMilestone.milestone_date}
                      onSelect={(date) => setNewMilestone(prev => ({ ...prev, milestone_date: date }))}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Scorecard</Label>
                <div className="flex items-center space-x-2 h-10 px-3 rounded-md border border-input bg-background">
                  <Switch
                    checked={newMilestone.is_scorecard_project}
                    onCheckedChange={(checked) => setNewMilestone(prev => ({ ...prev, is_scorecard_project: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {newMilestone.is_scorecard_project ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Description / Comments</Label>
              <Textarea
                value={newMilestone.milestone_description}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, milestone_description: e.target.value }))}
                placeholder="Optional notes about this milestone..."
                className="min-h-[80px] resize-none bg-background"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={addMilestone}
              disabled={!newMilestone.milestone_name || !newMilestone.milestone_date || isCreating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="h-4 w-4" />
              Add milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
