import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Layers, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useVCRItemCategories } from '@/hooks/useVCRItemCategories';

const VCRItemCategoryTab: React.FC = () => {
  const { data: categories, isLoading, addCategory, deleteCategory } = useVCRItemCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>VCR Item Categories</CardTitle>
              <CardDescription>
                Manage categories used to classify VCR checklist items.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
              <span className="font-semibold">{categories?.length || 0}</span>
              <span className="text-xs opacity-70">categories</span>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
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
                        Auto-generated code: <Badge variant="secondary" className="font-mono">{getCodePreview(name)}</Badge>
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
      <CardContent>
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
                <TableCell>
                  <Badge variant="outline" className="font-mono font-semibold">{cat.code}</Badge>
                </TableCell>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{cat.description || '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(cat.id)}
                    disabled={deleteCategory.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!categories || categories.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No categories found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default VCRItemCategoryTab;
