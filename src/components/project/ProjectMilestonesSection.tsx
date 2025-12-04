import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, X, CalendarDays, Pencil, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectMilestoneTypes } from '@/hooks/useProjectMilestoneTypes';
import { EnhancedSearchableCombobox } from '@/components/ui/enhanced-searchable-combobox';

interface ProjectMilestonesSectionProps {
  milestones: any[];
  setMilestones: React.Dispatch<React.SetStateAction<any[]>>;
}

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<{
    milestone_type_id: string;
    milestone_name: string;
    milestone_description: string;
    milestone_date: Date | undefined;
    is_scorecard_project: boolean;
  } | null>(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Calendar className="h-5 w-5 mr-2" />
          Project Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Milestone */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-2">
            <Label>Milestone Type</Label>
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

          <div className="space-y-2">
            <Label>Description/Comments</Label>
            <Textarea
              value={newMilestone.milestone_description}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, milestone_description: e.target.value }))}
              placeholder="Additional comments..."
              className="h-10 min-h-[40px] resize-none"
              rows={1}
            />
          </div>

          <div className="space-y-2">
            <Label>Milestone Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newMilestone.milestone_date && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {newMilestone.milestone_date ? (
                    format(newMilestone.milestone_date, "do MMMM yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
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

          <div className="space-y-2">
            <Label>Scorecard</Label>
            <div className="flex items-center space-x-2 h-10">
              <Switch
                checked={newMilestone.is_scorecard_project}
                onCheckedChange={(checked) => setNewMilestone(prev => ({ ...prev, is_scorecard_project: checked }))}
              />
              <span className="text-sm text-muted-foreground">
                {newMilestone.is_scorecard_project ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          <Button 
            type="button"
            onClick={addMilestone}
            disabled={!newMilestone.milestone_name || !newMilestone.milestone_date || isCreating}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>

        {/* Milestones List */}
        {milestones.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Project Milestones</h4>
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div 
                  key={milestone.id}
                  className="p-3 bg-muted/50 rounded-lg"
                >
                  {editingId === milestone.id && editingMilestone ? (
                    // Editing mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="space-y-2">
                          <Label className="text-xs">Milestone Type</Label>
                          <EnhancedSearchableCombobox
                            options={milestoneOptions}
                            value={editingMilestone.milestone_type_id}
                            onValueChange={handleEditMilestoneTypeSelect}
                            placeholder="Select milestone..."
                            searchPlaceholder="Search milestones..."
                            allowCreate={true}
                            onCreateNew={handleCreateNewMilestoneTypeForEdit}
                            disabled={isLoading || isCreating}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={editingMilestone.milestone_description}
                            onChange={(e) => setEditingMilestone(prev => prev ? ({ ...prev, milestone_description: e.target.value }) : null)}
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
                                onSelect={(date) => setEditingMilestone(prev => prev ? ({ ...prev, milestone_date: date }) : null)}
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
                              onCheckedChange={(checked) => setEditingMilestone(prev => prev ? ({ ...prev, is_scorecard_project: checked }) : null)}
                            />
                            <span className="text-xs text-muted-foreground">Scorecard</span>
                          </div>
                          <div className="flex gap-1 ml-auto">
                            <Button
                              type="button"
                              size="sm"
                              onClick={saveEditing}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Checkbox 
                          checked={milestone.status === 'completed'}
                          onCheckedChange={(checked) => {
                            setMilestones(prev => prev.map(m => 
                              m.id === milestone.id 
                                ? { ...m, status: checked ? 'completed' : 'pending' }
                                : m
                            ));
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            "font-medium block",
                            milestone.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                          )}>
                            {milestone.milestone_name}
                          </span>
                          {milestone.milestone_description && (
                            <span className="text-sm text-muted-foreground block mt-1">
                              {milestone.milestone_description}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(milestone.milestone_date), "do MMMM yyyy")}
                        </span>
                        {milestone.is_scorecard_project && (
                          <Badge 
                            variant="outline" 
                            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-400 text-xs font-semibold shadow-sm whitespace-nowrap"
                          >
                            ✨ Scorecard
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(milestone)}
                          className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMilestone(milestone.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
