import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, User, GitBranch, MessageSquare } from 'lucide-react';
import { useORPPlans } from '@/hooks/useORPPlans';
import { useProfileUsers } from '@/hooks/useProfileUsers';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { ORPAttachmentsPanel } from './ORPAttachmentsPanel';

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
  const [progress, setProgress] = useState(deliverable?.completion_percentage || 0);
  const [comments, setComments] = useState(deliverable?.comments || '');
  const [status, setStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'>(deliverable?.status || 'NOT_STARTED');

  const handleSave = () => {
    updateDeliverable({
      deliverableId: deliverable.id,
      status,
      progress,
      comments
    });
  };

  const handleAddCollaborator = (userId: string) => {
    addCollaborator({
      deliverableId: deliverable.id,
      userId
    });
  };

  const handleAddDependency = (predecessorId: string) => {
    addDependency({
      deliverableId: deliverable.id,
      predecessorId
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deliverable?.deliverable?.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
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
              <Label>Progress: {progress}%</Label>
              <Input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value))}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Estimated Manhours</Label>
              <Input value={deliverable?.estimated_manhours || 'N/A'} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={deliverable?.start_date || ''} disabled />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={deliverable?.end_date || ''} disabled />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full">Save Changes</Button>
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-4 mt-4">
            <div>
              <Label>Add Collaborator</Label>
              <div className="flex gap-2 mt-2">
                <EnhancedCombobox
                  options={users?.map(u => ({ value: u.user_id, label: u.full_name })) || []}
                  onValueChange={handleAddCollaborator}
                  placeholder="Select team member"
                />
              </div>
            </div>

            <div className="space-y-2">
              {deliverable?.collaborators?.map((collab: any) => (
                <div key={collab.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm">User ID: {collab.user_id}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCollaborator(collab.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {!deliverable?.collaborators?.length && (
                <p className="text-center text-muted-foreground py-4">No collaborators added</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="dependencies" className="space-y-4 mt-4">
            <div>
              <Label>Add Predecessor</Label>
              <div className="flex gap-2 mt-2">
                <EnhancedCombobox
                  options={allDeliverables
                    ?.filter(d => d.id !== deliverable.id)
                    ?.map(d => ({ value: d.id, label: d.deliverable?.name })) || []}
                  onValueChange={handleAddDependency}
                  placeholder="Select predecessor"
                />
              </div>
            </div>

            <div className="space-y-2">
              {deliverable?.dependencies?.map((dep: any) => (
                <div key={dep.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
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
                <p className="text-center text-muted-foreground py-4">No dependencies added</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 mt-4">
            <ORPAttachmentsPanel deliverableId={deliverable.id} />
          </TabsContent>

          <TabsContent value="comments" className="space-y-4 mt-4">
            <div>
              <Label>Comments & Notes</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={8}
                placeholder="Add comments, notes, or updates..."
                className="mt-2"
              />
            </div>
            <Button onClick={handleSave} className="w-full">Save Comments</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
