import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, User, GitBranch, ArrowRight, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { ORPAttachmentsPanel } from './ORPAttachmentsPanel';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ORPDeliverableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverable: any;
  allDeliverables: any[];
  planId: string;
}

export const ORPDeliverableModal: React.FC<ORPDeliverableModalProps> = ({
  open,
  onOpenChange,
  deliverable,
  allDeliverables,
  planId
}) => {
  const { updateDeliverable, addCollaborator, removeCollaborator, addDependency, removeDependency } = useORPPlans();
  const { data: users } = useProfileUsers();
  const queryClient = useQueryClient();
  
  // Editable state
  const [progress, setProgress] = useState(deliverable?.completion_percentage || 0);
  const [comments, setComments] = useState(deliverable?.comments || '');
  const [status, setStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'>(deliverable?.status || 'NOT_STARTED');
  const [startDate, setStartDate] = useState(deliverable?.start_date || '');
  const [endDate, setEndDate] = useState(deliverable?.end_date || '');
  const [estimatedManhours, setEstimatedManhours] = useState(deliverable?.estimated_manhours || '');

  // Fetch successors (deliverables that depend on this one)
  const { data: successors } = useQuery({
    queryKey: ['orp-successors', deliverable?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orp_deliverable_dependencies')
        .select('id, deliverable_id')
        .eq('predecessor_id', deliverable.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!deliverable?.id
  });

  // Reset state when deliverable changes
  useEffect(() => {
    if (deliverable) {
      setProgress(deliverable.completion_percentage || 0);
      setComments(deliverable.comments || '');
      setStatus(deliverable.status || 'NOT_STARTED');
      setStartDate(deliverable.start_date || '');
      setEndDate(deliverable.end_date || '');
      setEstimatedManhours(deliverable.estimated_manhours || '');
    }
  }, [deliverable]);

  // Get successors with their details
  const successorsWithDetails = useMemo(() => {
    if (!successors) return [];
    return successors.map(s => {
      const del = allDeliverables.find(d => d.id === s.deliverable_id);
      return {
        ...s,
        deliverable: del
      };
    });
  }, [successors, allDeliverables]);

  const handleSave = () => {
    updateDeliverable({
      deliverableId: deliverable.id,
      status,
      progress,
      comments,
      start_date: startDate,
      end_date: endDate,
      estimated_manhours: estimatedManhours ? Number(estimatedManhours) : undefined
    });
    onOpenChange(false);
  };

  const handleAddCollaborator = (userId: string) => {
    addCollaborator({
      deliverableId: deliverable.id,
      userId
    });
  };

  const handleAddPredecessor = (predecessorId: string) => {
    addDependency({
      deliverableId: deliverable.id,
      predecessorId
    });
  };

  const handleAddSuccessor = async (successorId: string) => {
    // Add this deliverable as a predecessor to the selected successor
    const { error } = await supabase
      .from('orp_deliverable_dependencies')
      .insert({
        deliverable_id: successorId,
        predecessor_id: deliverable.id
      });
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      queryClient.invalidateQueries({ queryKey: ['orp-successors', deliverable.id] });
    }
  };

  const handleRemoveSuccessor = async (dependencyId: string) => {
    const { error } = await supabase
      .from('orp_deliverable_dependencies')
      .delete()
      .eq('id', dependencyId);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      queryClient.invalidateQueries({ queryKey: ['orp-successors', deliverable.id] });
    }
  };

  // Filter out deliverables that are already predecessors, successors, or current
  const availablePredecessors = useMemo(() => {
    const existingPredecessorIds = deliverable?.dependencies?.map((d: any) => d.predecessor_id) || [];
    return allDeliverables?.filter(d => 
      d.id !== deliverable?.id && 
      !existingPredecessorIds.includes(d.id)
    ) || [];
  }, [allDeliverables, deliverable]);

  const availableSuccessors = useMemo(() => {
    const existingSuccessorIds = successors?.map(s => s.deliverable_id) || [];
    return allDeliverables?.filter(d => 
      d.id !== deliverable?.id && 
      !existingSuccessorIds.includes(d.id)
    ) || [];
  }, [allDeliverables, deliverable, successors]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{deliverable?.deliverable?.name}</span>
            <Badge variant="outline" className="ml-2">
              {status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="collaborators">Team</TabsTrigger>
            <TabsTrigger value="attachments">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Estimated Hours
                </Label>
                <Input
                  type="number"
                  value={estimatedManhours}
                  onChange={(e) => setEstimatedManhours(e.target.value)}
                  placeholder="Enter hours..."
                />
              </div>
            </div>

            <div>
              <Label>Progress</Label>
              <div className="relative mt-2">
                {/* Progress bar with visible draggable slider */}
                <div className="relative h-8 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                  {/* Progress fill - emerald to avoid conflict with blue CTA */}
                  <div 
                    className="absolute inset-y-0 left-0 bg-emerald-500 dark:bg-emerald-400 transition-all duration-150 pointer-events-none"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Visible styled range slider */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full cursor-pointer appearance-none bg-transparent
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-8
                      [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-slate-400
                      [&::-webkit-slider-thumb]:rounded
                      [&::-webkit-slider-thumb]:shadow-md
                      [&::-webkit-slider-thumb]:cursor-grab
                      [&::-webkit-slider-thumb]:active:cursor-grabbing
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-8
                      [&::-moz-range-thumb]:bg-white
                      [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-slate-400
                      [&::-moz-range-thumb]:rounded
                      [&::-moz-range-thumb]:shadow-md
                      [&::-moz-range-thumb]:cursor-grab
                      [&::-webkit-slider-runnable-track]:bg-transparent
                      [&::-moz-range-track]:bg-transparent"
                  />
                  {/* Percentage label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm font-medium text-white drop-shadow-md">
                      {progress}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Click or drag to adjust progress</p>
              </div>
            </div>

            <div>
              <Label>Comments & Notes</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder="Add comments, notes, or updates..."
                className="mt-2"
              />
            </div>

            <Button onClick={handleSave} className="w-full">Save Changes</Button>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Target End Date
                </Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Estimated Manhours
              </Label>
              <Input
                type="number"
                value={estimatedManhours}
                onChange={(e) => setEstimatedManhours(e.target.value)}
                placeholder="Enter estimated hours..."
                className="mt-2"
              />
            </div>

            {startDate && endDate && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Duration: {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            )}

            <Button onClick={handleSave} className="w-full">Save Schedule</Button>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-6 mt-4">
            {/* Predecessors Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Predecessors</Label>
                <span className="text-xs text-muted-foreground">(must complete before this)</span>
              </div>
              
              <div className="flex gap-2">
                <EnhancedCombobox
                  options={availablePredecessors.map(d => ({ value: d.id, label: d.deliverable?.name }))}
                  onValueChange={handleAddPredecessor}
                  placeholder="Add predecessor..."
                />
              </div>

              <div className="space-y-2">
                {deliverable?.dependencies?.map((dep: any) => (
                  <div key={dep.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">
                        {allDeliverables?.find(d => d.id === dep.predecessor_id)?.deliverable?.name}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeDependency(dep.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {!deliverable?.dependencies?.length && (
                  <p className="text-center text-muted-foreground py-4 text-sm">No predecessors - this activity can start immediately</p>
                )}
              </div>
            </div>

            {/* Successors Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Successors</Label>
                <span className="text-xs text-muted-foreground">(depends on this)</span>
              </div>

              <div className="flex gap-2">
                <EnhancedCombobox
                  options={availableSuccessors.map(d => ({ value: d.id, label: d.deliverable?.name }))}
                  onValueChange={handleAddSuccessor}
                  placeholder="Add successor..."
                />
              </div>

              <div className="space-y-2">
                {successorsWithDetails.map((succ) => (
                  <div key={succ.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">
                        {succ.deliverable?.deliverable?.name}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveSuccessor(succ.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {!successorsWithDetails.length && (
                  <p className="text-center text-muted-foreground py-4 text-sm">No successors - no activities depend on this</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-4 mt-4">
            <div>
              <Label>Add Team Member</Label>
              <div className="flex gap-2 mt-2">
                <EnhancedCombobox
                  options={users?.map(u => ({ value: u.user_id, label: u.full_name })) || []}
                  onValueChange={handleAddCollaborator}
                  placeholder="Select team member..."
                />
              </div>
            </div>

            <div className="space-y-2">
              {deliverable?.collaborators?.map((collab: any) => {
                const user = users?.find(u => u.user_id === collab.user_id);
                return (
                  <div key={collab.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user?.full_name || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">{user?.position || 'Team Member'}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCollaborator(collab.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              {!deliverable?.collaborators?.length && (
                <p className="text-center text-muted-foreground py-4">No team members assigned</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 mt-4">
            <ORPAttachmentsPanel deliverableId={deliverable.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
