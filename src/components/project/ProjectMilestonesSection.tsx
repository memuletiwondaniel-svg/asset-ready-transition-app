import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, X, CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectMilestonesSectionProps {
  milestones: any[];
  setMilestones: React.Dispatch<React.SetStateAction<any[]>>;
}

export const ProjectMilestonesSection: React.FC<ProjectMilestonesSectionProps> = ({ 
  milestones, 
  setMilestones 
}) => {
  const [newMilestone, setNewMilestone] = useState({
    milestone_name: '',
    milestone_date: undefined as Date | undefined,
    is_scorecard_project: false
  });

  const addMilestone = () => {
    if (newMilestone.milestone_name && newMilestone.milestone_date) {
      const milestone = {
        id: Date.now().toString(),
        ...newMilestone,
        milestone_date: newMilestone.milestone_date.toISOString().split('T')[0]
      };
      setMilestones(prev => [...prev, milestone]);
      setNewMilestone({ 
        milestone_name: '', 
        milestone_date: undefined, 
        is_scorecard_project: false 
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-2">
            <Label>Milestone Name</Label>
            <Input
              value={newMilestone.milestone_name}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, milestone_name: e.target.value }))}
              placeholder="Enter milestone name"
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
              <span className="text-sm text-gray-600">
                {newMilestone.is_scorecard_project ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          <Button 
            type="button"
            onClick={addMilestone}
            disabled={!newMilestone.milestone_name || !newMilestone.milestone_date}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>

        {/* Milestones List */}
        {milestones.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Project Milestones</h4>
            <div className="space-y-2">
              {milestones.map((milestone) => (
                <div 
                  key={milestone.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900 min-w-0 flex-1">{milestone.milestone_name}</span>
                    <span className="text-sm text-gray-600 whitespace-nowrap">
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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