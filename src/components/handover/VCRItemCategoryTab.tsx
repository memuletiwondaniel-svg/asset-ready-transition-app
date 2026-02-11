import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useVCRItemCategories } from '@/hooks/useVCRItemCategories';

const getCodeColor = (code: string) => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return {
    bg: `hsl(${hue}, 45%, 94%)`,
    text: `hsl(${hue}, 55%, 40%)`,
    border: `hsl(${hue}, 40%, 85%)`,
  };
};

const VCRItemCategoryTab: React.FC = () => {
  const { data: categories, isLoading, addCategory, updateCategory, deleteCategory } = useVCRItemCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; description: string } | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    addCategory.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setName('');
          setDescription('');
        },
      }
    );
  };

  const handleEdit = (cat: { id: string; name: string; description: string | null }) => {
    setEditingCategory({ id: cat.id, name: cat.name, description: cat.description || '' });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    updateCategory.mutate(
      { id: editingCategory.id, name: editingCategory.name.trim(), description: editingCategory.description.trim() || undefined },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          setEditingCategory(null);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this category?')) {
      deleteCategory.mutate(id);
    }
  };

  // Auto-generate code preview
  const getCodePreview = (value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    if (words.length === 1) return value.slice(0, 2).toUpperCase();
    return words.map(w => w[0]?.toUpperCase() || '').join('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Categories</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm text-white gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add VCR Item Category</DialogTitle>
                  <DialogDescription>
                    Enter the category name. The code will be auto-generated from the initials.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name *</Label>
                    <Input
                      id="category-name"
                      placeholder="e.g. Environmental Compliance"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                    {name.trim() && (
                      <p className="text-xs text-muted-foreground">
                        Auto-generated code: <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-semibold" style={{ backgroundColor: getCodeColor(getCodePreview(name)).bg, color: getCodeColor(getCodePreview(name)).text, borderColor: getCodeColor(getCodePreview(name)).border }}>{getCodePreview(name)}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-desc">Description (optional)</Label>
                    <Textarea
                      id="category-desc"
                      placeholder="Brief description of this category..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!name.trim() || addCategory.isPending}>
                    {addCategory.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Category
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map(cat => (
              <TableRow key={cat.id}>
                <TableCell className="py-2">
                  <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-mono font-semibold tracking-wide" style={{ backgroundColor: getCodeColor(cat.code).bg, color: getCodeColor(cat.code).text, borderColor: getCodeColor(cat.code).border }}>{cat.code}</span>
                </TableCell>
                <TableCell className="py-2 font-medium">{cat.name}</TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">{cat.description || '-'}</TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(cat)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deleteCategory.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!categories || categories.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No categories found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Category Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header with accent bar */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-lg font-semibold tracking-tight">Edit Category</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground/80">
                Update the category details below.
              </DialogDescription>
            </DialogHeader>
          </div>

          {editingCategory && (
            <div className="px-6 pb-2 space-y-5">
              {/* Category Name Field */}
              <div className="space-y-2">
                <Label htmlFor="edit-category-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-category-name"
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="h-11 text-sm font-medium bg-muted/40 border-border/60 focus:bg-background focus:border-primary/50 transition-all duration-200"
                  placeholder="Enter category name..."
                />
                {editingCategory.name.trim() && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-muted-foreground/70">Code:</span>
                    <span
                      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-semibold"
                      style={{
                        backgroundColor: getCodeColor(getCodePreview(editingCategory.name)).bg,
                        color: getCodeColor(getCodePreview(editingCategory.name)).text,
                        borderColor: getCodeColor(getCodePreview(editingCategory.name)).border,
                      }}
                    >
                      {getCodePreview(editingCategory.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="edit-category-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description <span className="text-muted-foreground/50 font-normal normal-case">(optional)</span>
                </Label>
                <Textarea
                  id="edit-category-desc"
                  value={editingCategory.description}
                  onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  rows={3}
                  className="text-sm bg-muted/40 border-border/60 focus:bg-background focus:border-primary/50 transition-all duration-200 resize-none"
                  placeholder="Brief description of this category..."
                />
              </div>
            </div>
          )}

          {/* Footer with separator */}
          <div className="border-t bg-muted/30 px-6 py-4 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!editingCategory?.name.trim() || updateCategory.isPending}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm px-5"
            >
              {updateCategory.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VCRItemCategoryTab;
