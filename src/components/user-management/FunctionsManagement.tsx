import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Loader2, GripVertical } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoleCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export const FunctionsManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<RoleCategory | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDisplayOrder, setNewDisplayOrder] = useState('');

  // Fetch functions (role_category)
  const { data: functions, isLoading } = useQuery({
    queryKey: ['role-categories-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_category')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as RoleCategory[];
    },
  });

  // Add function mutation
  const addMutation = useMutation({
    mutationFn: async ({ name, description, display_order }: { name: string; description: string; display_order: number }) => {
      const { data, error } = await supabase
        .from('role_category')
        .insert({ name, description: description || null, display_order, is_active: true })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-categories-management'] });
      queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Function added successfully.' });
      setIsAddOpen(false);
      setNewName('');
      setNewDescription('');
      setNewDisplayOrder('');
    },
    onError: (error) => {
      console.error('Error adding function:', error);
      toast({ title: 'Error', description: 'Failed to add function.', variant: 'destructive' });
    },
  });

  // Update function mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, description, display_order }: { id: string; name: string; description: string; display_order: number }) => {
      const { data, error } = await supabase
        .from('role_category')
        .update({ name, description: description || null, display_order })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-categories-management'] });
      queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Function updated successfully.' });
      setIsEditOpen(false);
      setEditingFunction(null);
    },
    onError: (error) => {
      console.error('Error updating function:', error);
      toast({ title: 'Error', description: 'Failed to update function.', variant: 'destructive' });
    },
  });

  // Delete function mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('role_category')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-categories-management'] });
      queryClient.invalidateQueries({ queryKey: ['role-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categorized-roles'] });
      toast({ title: 'Success', description: 'Function deactivated successfully.' });
    },
    onError: (error) => {
      console.error('Error deleting function:', error);
      toast({ title: 'Error', description: 'Failed to deactivate function.', variant: 'destructive' });
    },
  });

  const filteredFunctions = functions?.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFunctions = filteredFunctions?.filter(f => f.is_active) || [];

  const handleAdd = () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Please enter a function name.', variant: 'destructive' });
      return;
    }
    const order = newDisplayOrder ? parseInt(newDisplayOrder) : (functions?.length || 0) + 1;
    addMutation.mutate({ name: newName.trim(), description: newDescription.trim(), display_order: order });
  };

  const handleEdit = (func: RoleCategory) => {
    setEditingFunction(func);
    setNewName(func.name);
    setNewDescription(func.description || '');
    setNewDisplayOrder(func.display_order.toString());
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingFunction || !newName.trim()) {
      toast({ title: 'Error', description: 'Please enter a function name.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: editingFunction.id,
      name: newName.trim(),
      description: newDescription.trim(),
      display_order: parseInt(newDisplayOrder) || editingFunction.display_order,
    });
  };

  const handleDelete = (func: RoleCategory) => {
    if (confirm(`Are you sure you want to deactivate "${func.name}"? This may affect roles assigned to this function.`)) {
      deleteMutation.mutate(func.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Functions</h2>
          <p className="text-muted-foreground">
            {activeFunctions.length} active functions
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Function
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search functions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Functions Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeFunctions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No functions found
                    </TableCell>
                  </TableRow>
                ) : (
                  activeFunctions.map((func) => (
                    <TableRow key={func.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{func.display_order}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{func.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {func.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={func.is_active ? 'default' : 'secondary'}>
                          {func.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(func)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(func)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Function</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Name *
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter function name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Display Order
              </Label>
              <Input
                id="order"
                type="number"
                value={newDisplayOrder}
                onChange={(e) => setNewDisplayOrder(e.target.value)}
                placeholder="Auto-assigned if empty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Function
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Function</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Name *
              </Label>
              <Input
                id="editName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter function name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </Label>
              <Input
                id="editDescription"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editOrder" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Display Order
              </Label>
              <Input
                id="editOrder"
                type="number"
                value={newDisplayOrder}
                onChange={(e) => setNewDisplayOrder(e.target.value)}
                placeholder="Enter display order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Function
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FunctionsManagement;
