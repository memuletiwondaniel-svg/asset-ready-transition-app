import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOWLMutations } from '@/hooks/useOWLMutations';
import type { OutstandingWorkItem, OWLSource, OWLStatus } from '@/hooks/useOutstandingWorkList';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';

interface OWLItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OutstandingWorkItem | null;
  projects: { id: string; name: string; code: string }[];
}

const OWLItemDialog: React.FC<OWLItemDialogProps> = ({
  open,
  onOpenChange,
  item,
  projects,
}) => {
  // Use lightweight mutations hook instead of full useOutstandingWorkItems
  const { createItem, updateItem, deleteItem, isCreating, isUpdating, isDeleting } = useOWLMutations();
  
  const [formData, setFormData] = useState({
    project_id: '',
    source: 'PSSR' as OWLSource,
    title: '',
    description: '',
    priority: 2,
    status: 'OPEN' as OWLStatus,
    action_party_role_id: '',
    assigned_to: '',
    due_date: '',
    comments: '',
  });

  // Fetch roles with caching
  const { data: roles } = useQuery({
    queryKey: ['roles-for-owl'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache - roles rarely change
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        project_id: item.project_id || '',
        source: item.source,
        title: item.title,
        description: item.description || '',
        priority: item.priority || 2,
        status: item.status,
        action_party_role_id: item.action_party_role_id || '',
        assigned_to: item.assigned_to || '',
        due_date: item.due_date || '',
        comments: item.comments || '',
      });
    } else {
      setFormData({
        project_id: '',
        source: 'PSSR',
        title: '',
        description: '',
        priority: 2,
        status: 'OPEN',
        action_party_role_id: '',
        assigned_to: '',
        due_date: '',
        comments: '',
      });
    }
  }, [item, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      project_id: formData.project_id || null,
      action_party_role_id: formData.action_party_role_id || null,
      assigned_to: formData.assigned_to || null,
      due_date: formData.due_date || null,
      source_id: null,
      completed_date: formData.status === 'CLOSED' ? new Date().toISOString().split('T')[0] : null,
      created_by: null,
    };

    if (item) {
      updateItem({ id: item.id, ...data });
    } else {
      createItem(data);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (item && window.confirm('Are you sure you want to delete this item?')) {
      deleteItem(item.id);
      onOpenChange(false);
    }
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? `Edit Item: ${item.item_number}` : 'Add New OWL Item'}
          </DialogTitle>
          <DialogDescription>
            {item
              ? 'Update the details of this outstanding work item'
              : 'Create a new outstanding work item for tracking'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the work item"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the outstanding work..."
              rows={3}
            />
          </div>

          {/* Project & Source Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={formData.project_id || 'none'}
                onValueChange={value => setFormData(prev => ({ ...prev, project_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source *</Label>
              <Select
                value={formData.source}
                onValueChange={value => setFormData(prev => ({ ...prev, source: value as OWLSource }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUNCHLIST">Punchlist (GoCompletions)</SelectItem>
                  <SelectItem value="PSSR">PSSR</SelectItem>
                  <SelectItem value="PAC">PAC Review</SelectItem>
                  <SelectItem value="FAC">FAC Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority.toString()}
                onValueChange={value => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Priority 1 (Critical)</SelectItem>
                  <SelectItem value="2">Priority 2 (High)</SelectItem>
                  <SelectItem value="3">Priority 3 (Medium)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={value => setFormData(prev => ({ ...prev, status: value as OWLStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Party & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action Party</Label>
              <Select
                value={formData.action_party_role_id || 'none'}
                onValueChange={value => setFormData(prev => ({ ...prev, action_party_role_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {roles?.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comments / Notes</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={e => setFormData(prev => ({ ...prev, comments: e.target.value }))}
              placeholder="Additional notes or action tracking comments..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {item && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
                {isSubmitting ? 'Saving...' : item ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OWLItemDialog;
