import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useORMMilestones } from '@/hooks/useORMMilestones';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, Target, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ORMMilestoneTrackingProps {
  planId: string;
  deliverables: any[];
}

export const ORMMilestoneTracking: React.FC<ORMMilestoneTrackingProps> = ({ planId, deliverables }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_date: '',
    linked_deliverables: [] as string[]
  });

  const { milestones, createMilestone, updateMilestone, isCreating } = useORMMilestones(planId);

  const handleSubmit = () => {
    if (!formData.name) return;

    createMilestone({
      orm_plan_id: planId,
      ...formData
    });

    setFormData({ name: '', description: '', target_date: '', linked_deliverables: [] });
    setIsCreateOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'DELAYED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-4 h-4" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" />;
      case 'DELAYED': return <AlertCircle className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Milestones</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Milestone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Milestone Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Phase 1 Complete"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the milestone..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="target_date">Target Date</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>

              <div>
                <Label>Linked Deliverables</Label>
                <Select
                  value={formData.linked_deliverables.length > 0 ? formData.linked_deliverables[0] : ''}
                  onValueChange={(value) => {
                    const current = formData.linked_deliverables;
                    if (current.includes(value)) {
                      setFormData({ ...formData, linked_deliverables: current.filter(d => d !== value) });
                    } else {
                      setFormData({ ...formData, linked_deliverables: [...current, value] });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select deliverables" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliverables.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.deliverable_type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.linked_deliverables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.linked_deliverables.map((id) => {
                      const del = deliverables.find(d => d.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {del?.deliverable_type.replace(/_/g, ' ')}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} disabled={isCreating || !formData.name} className="w-full">
                {isCreating ? 'Creating...' : 'Create Milestone'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline visualization */}
          <div className="relative">
            {milestones && milestones.length > 0 ? (
              <div className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="relative flex gap-4">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        milestone.status === 'COMPLETED' ? 'bg-green-500' :
                        milestone.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                        milestone.status === 'DELAYED' ? 'bg-red-500' :
                        'bg-gray-400'
                      } text-white`}>
                        {getStatusIcon(milestone.status)}
                      </div>
                      {index < (milestones.length - 1) && (
                        <div className="w-0.5 h-full bg-border absolute top-10 left-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">{milestone.name}</h4>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                              )}
                            </div>
                            <Badge className={getStatusColor(milestone.status)} variant="secondary">
                              {milestone.status.replace('_', ' ')}
                            </Badge>
                          </div>

                          <div className="space-y-3 mt-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Target: {milestone.target_date ? format(new Date(milestone.target_date), 'MMM d, yyyy') : 'Not set'}
                              </span>
                              {milestone.completion_date && (
                                <span className="text-green-600">
                                  • Completed: {format(new Date(milestone.completion_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>

                            {milestone.linked_deliverables && milestone.linked_deliverables.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Linked Deliverables:</p>
                                <div className="flex flex-wrap gap-1">
                                  {milestone.linked_deliverables.map((delId: string) => {
                                    const del = deliverables.find(d => d.id === delId);
                                    return del ? (
                                      <Badge key={delId} variant="outline" className="text-xs">
                                        {del.deliverable_type.replace(/_/g, ' ')}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}

                            <div>
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-muted-foreground flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4" />
                                  Progress
                                </span>
                                <span className="font-medium">{milestone.progress_percentage}%</span>
                              </div>
                              <Progress value={milestone.progress_percentage} className="h-2" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No milestones yet. Click "Add Milestone" to create one.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
