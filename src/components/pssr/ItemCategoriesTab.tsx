import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePSSRChecklistCategories,
  useCreateChecklistCategory,
  useUpdateChecklistCategory,
  useDeleteChecklistCategory,
  ChecklistCategory,
} from '@/hooks/usePSSRChecklistLibrary';

const ItemCategoriesTab: React.FC = () => {
  const { data: categories, isLoading } = usePSSRChecklistCategories();
  const createCategory = useCreateChecklistCategory();
  const updateCategory = useUpdateChecklistCategory();
  const deleteCategory = useDeleteChecklistCategory();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ChecklistCategory | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<ChecklistCategory | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    ref_id: '',
    description: '',
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', ref_id: '', description: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (category: ChecklistCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      ref_id: category.ref_id,
      description: category.description || '',
    });
    setIsFormOpen(true);
  };

  const generateRefId = (name: string) => {
    // Generate a ref_id from the name (first letters of each word, uppercase)
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 4);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      ref_id: editingCategory ? prev.ref_id : generateRefId(name),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.ref_id.trim()) {
      return;
    }

    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        name: formData.name.trim(),
        ref_id: formData.ref_id.trim().toUpperCase(),
        description: formData.description.trim() || null,
      });
    } else {
      await createCategory.mutateAsync({
        name: formData.name.trim(),
        ref_id: formData.ref_id.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
      });
    }

    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmCategory) return;
    await deleteCategory.mutateAsync(deleteConfirmCategory.id);
    setDeleteConfirmCategory(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeCategories = categories?.filter(c => c.is_active) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Item Categories
              </CardTitle>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Ref ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Order</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No categories yet. Click "Add Category" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeCategories.map(category => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {category.ref_id}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell>{category.display_order}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenEdit(category)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeleteConfirmCategory(category)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Update the category details.'
                : 'Create a new category for checklist items.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Technical Integrity"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reference ID <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.ref_id}
                onChange={(e) => setFormData(prev => ({ ...prev, ref_id: e.target.value.toUpperCase() }))}
                placeholder="e.g., TI"
                className="font-mono uppercase"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Short identifier used in item IDs (e.g., TI-01, PS-02)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name.trim() || !formData.ref_id.trim() || createCategory.isPending || updateCategory.isPending}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmCategory} onOpenChange={(open) => !open && setDeleteConfirmCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmCategory?.name}"? This will mark the category as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
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

export default ItemCategoriesTab;
