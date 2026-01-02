import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Building2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Commission {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CommissionsManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Fetch commissions
  const { data: commissions, isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Commission[];
    },
  });

  // Add commission mutation
  const addMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from('commission')
        .insert({ name, description: description || null, is_active: true })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast({ title: 'Success', description: 'Commission added successfully.' });
      setIsAddOpen(false);
      setNewName('');
      setNewDescription('');
    },
    onError: (error) => {
      console.error('Error adding commission:', error);
      toast({ title: 'Error', description: 'Failed to add commission.', variant: 'destructive' });
    },
  });

  // Update commission mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      const { data, error } = await supabase
        .from('commission')
        .update({ name, description: description || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast({ title: 'Success', description: 'Commission updated successfully.' });
      setIsEditOpen(false);
      setEditingCommission(null);
    },
    onError: (error) => {
      console.error('Error updating commission:', error);
      toast({ title: 'Error', description: 'Failed to update commission.', variant: 'destructive' });
    },
  });

  // Delete commission mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast({ title: 'Success', description: 'Commission deactivated successfully.' });
    },
    onError: (error) => {
      console.error('Error deleting commission:', error);
      toast({ title: 'Error', description: 'Failed to deactivate commission.', variant: 'destructive' });
    },
  });

  const filteredCommissions = commissions?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCommissions = filteredCommissions?.filter(c => c.is_active) || [];

  const handleAdd = () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Please enter a commission name.', variant: 'destructive' });
      return;
    }
    addMutation.mutate({ name: newName.trim(), description: newDescription.trim() });
  };

  const handleEdit = (commission: Commission) => {
    setEditingCommission(commission);
    setNewName(commission.name);
    setNewDescription(commission.description || '');
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingCommission || !newName.trim()) {
      toast({ title: 'Error', description: 'Please enter a commission name.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({
      id: editingCommission.id,
      name: newName.trim(),
      description: newDescription.trim(),
    });
  };

  const handleDelete = (commission: Commission) => {
    if (confirm(`Are you sure you want to deactivate "${commission.name}"?`)) {
      deleteMutation.mutate(commission.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Commissions</h2>
          <p className="text-muted-foreground">
            {activeCommissions.length} active commissions
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Commission
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search commissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No commissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  activeCommissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">{commission.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {commission.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={commission.is_active ? 'default' : 'secondary'}>
                          {commission.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(commission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(commission)}
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
            <DialogTitle>Add New Commission</DialogTitle>
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
                placeholder="Enter commission name"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission</DialogTitle>
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
                placeholder="Enter commission name"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommissionsManagement;
