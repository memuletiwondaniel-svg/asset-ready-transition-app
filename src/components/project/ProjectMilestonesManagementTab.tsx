import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2, Search, Milestone, GripVertical } from 'lucide-react';
import { useProjectMilestoneTypes, ProjectMilestoneType } from '@/hooks/useProjectMilestoneTypes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ProjectMilestonesManagementTab = () => {
  const { milestoneTypes, isLoading, createMilestoneType } = useProjectMilestoneTypes();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestoneType | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_custom: false,
  });


  // Update mutation
  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; code?: string; name?: string; description?: string; is_custom?: boolean; display_order?: number }) => {

      const { data: result, error } = await supabase
        .from('project_milestone_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestone-types'] });
      toast({ title: 'Success', description: 'Milestone type updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_milestone_types')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestone-types'] });
      toast({ title: 'Success', description: 'Milestone type deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleOpenForm = (milestone?: ProjectMilestoneType) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        code: milestone.code,
        name: milestone.name,
        description: milestone.description || '',
        is_custom: milestone.is_custom,
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        is_custom: true,
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingMilestone(null);
    setFormData({ code: '', name: '', description: '', is_custom: true });
  };


  const handleSave = async () => {
    try {
      if (editingMilestone) {
        await updateMilestone.mutateAsync({
          id: editingMilestone.id,
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          is_custom: formData.is_custom,
        });
      } else {
        await createMilestoneType({
          code: formData.code || undefined,
          name: formData.name,
          description: formData.description || undefined,
          is_custom: formData.is_custom,
        });
      }

      handleCloseForm();
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMilestone.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const filteredMilestones = milestoneTypes.filter((m) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(query) || 
           m.code.toLowerCase().includes(query) ||
           m.description?.toLowerCase().includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading milestones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search milestones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-80"
          />
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </Button>
      </div>


      {/* Milestones Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {filteredMilestones.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Milestone className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No milestones found</p>
              <Button variant="link" className="mt-2" onClick={() => handleOpenForm()}>
                Add the first milestone
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMilestones.map((milestone) => (
                  <TableRow key={milestone.id} className="group">
                    <TableCell className="font-mono text-sm">{milestone.code}</TableCell>
                    <TableCell className="font-medium">{milestone.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {milestone.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={milestone.is_custom ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-muted text-muted-foreground'}>
                        {milestone.is_custom ? 'Custom' : 'System'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenForm(milestone)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="e.g., FEED_COMPLETE"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Milestone name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.is_custom ? 'custom' : 'system'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, is_custom: v === 'custom' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name}
            >
              {editingMilestone ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milestone type? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
