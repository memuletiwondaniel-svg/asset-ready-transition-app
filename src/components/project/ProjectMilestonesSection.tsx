import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, X, CalendarDays } from 'lucide-react';
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
                  className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                >
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMilestone(milestone.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
