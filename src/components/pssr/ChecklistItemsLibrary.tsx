import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit2, Trash2, Search, Filter, X, FileText, Loader2, FolderPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePSSRChecklistItems,
  usePSSRChecklistCategories,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useCreateChecklistCategory,
  ChecklistItem,
} from '@/hooks/usePSSRChecklistLibrary';
import { useDisciplines } from '@/hooks/useDisciplines';

interface ItemFormData {
  unique_id: string;
  category_id: string;
  topic: string;
  description: string;
  supporting_evidence: string;
  approving_authorities: string[];
  responsible_party: string;
}

const ChecklistItemsLibrary: React.FC = () => {
  const { data: items, isLoading: itemsLoading } = usePSSRChecklistItems();
  const { data: categories, isLoading: categoriesLoading } = usePSSRChecklistCategories();
  const { disciplines } = useDisciplines();
  
  const createItem = useCreateChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const deleteItem = useDeleteChecklistItem();
  const createCategory = useCreateChecklistCategory();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ChecklistItem | null>(null);
  
  // New category dialog state
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({ name: '', ref_id: '', description: '' });
  
  const [formData, setFormData] = useState<ItemFormData>({
    unique_id: '',
    category_id: '',
    topic: '',
    description: '',
    supporting_evidence: '',
    approving_authorities: [],
    responsible_party: '',
  });

  const isLoading = itemsLoading || categoriesLoading;

  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      const matchesSearch = 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unique_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.approving_authority?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supporting_evidence?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    filteredItems.forEach(item => {
      const categoryName = item.category?.name || 'Uncategorized';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });
    return groups;
  }, [filteredItems]);

  const generateNextUniqueId = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    if (!category || !items) return '';
    
    const categoryItems = items.filter(i => i.category_id === categoryId);
    const nextNum = categoryItems.length + 1;
    return `${category.ref_id}-${String(nextNum).padStart(2, '0')}`;
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      unique_id: '',
      category_id: categories?.[0]?.id || '',
      topic: '',
      description: '',
      supporting_evidence: '',
      approving_authorities: [],
      responsible_party: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      unique_id: item.unique_id,
      category_id: item.category_id,
      topic: item.topic || '',
      description: item.description,
      supporting_evidence: item.supporting_evidence || '',
      approving_authorities: item.approving_authority ? item.approving_authority.split(',').map(s => s.trim()) : [],
      responsible_party: item.responsible_party || '',
    });
    setIsFormOpen(true);
  };

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === '__new__') {
      setShowNewCategoryDialog(true);
      return;
    }
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      unique_id: editingItem ? prev.unique_id : generateNextUniqueId(categoryId),
    }));
  };

  const generateCategoryRefId = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 4);
  };

  const handleNewCategoryNameChange = (name: string) => {
    setNewCategoryData(prev => ({
      ...prev,
      name,
      ref_id: generateCategoryRefId(name),
    }));
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryData.name.trim() || !newCategoryData.ref_id.trim()) return;
    
    const result = await createCategory.mutateAsync({
      name: newCategoryData.name.trim(),
      ref_id: newCategoryData.ref_id.trim().toUpperCase(),
      description: newCategoryData.description.trim() || undefined,
    });
    
    // Set the newly created category as selected
    if (result) {
      setFormData(prev => ({
        ...prev,
        category_id: result.id,
        unique_id: `${result.ref_id}-01`,
      }));
    }
    
    setShowNewCategoryDialog(false);
    setNewCategoryData({ name: '', ref_id: '', description: '' });
  };

  const handleSubmit = async () => {
    if (!formData.category_id || !formData.description.trim()) {
      return;
    }

    const payload = {
      unique_id: formData.unique_id || generateNextUniqueId(formData.category_id),
      category_id: formData.category_id,
      topic: formData.topic.trim() || null,
      description: formData.description.trim(),
      supporting_evidence: formData.supporting_evidence.trim() || null,
      approving_authority: formData.approving_authorities.length > 0 ? formData.approving_authorities.join(', ') : null,
      responsible_party: formData.responsible_party.trim() || null,
      is_active: true,
      version: editingItem ? editingItem.version + 1 : 1,
      sequence_number: editingItem?.sequence_number || (items?.filter(i => i.category_id === formData.category_id).length || 0) + 1,
    };

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await createItem.mutateAsync(payload);
    }

    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    await deleteItem.mutateAsync(deleteConfirmItem.id);
    setDeleteConfirmItem(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PSSR Checklist Item Library
              </CardTitle>
              <CardDescription>
                Manage the master library of PSSR checklist items across all categories
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-6">
            <Badge variant="outline" className="px-3 py-1">
              {filteredItems.length} items
            </Badge>
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="px-3 py-1">
                {categories?.find(c => c.id === categoryFilter)?.name}
              </Badge>
            )}
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="flex-1">Description</TableHead>
                  <TableHead className="w-48">Approver</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {items?.length === 0 
                        ? 'No checklist items yet. Click "Add Item" to create one.'
                        : 'No items match your search criteria.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow 
                      key={item.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenEdit(item)}
                    >
                      <TableCell className="font-mono text-sm">{item.unique_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <p>{item.description}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.approving_authority?.replace(/^TA-/i, '') || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteConfirmItem(item); }}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Checklist Item' : 'Add New Checklist Item'}</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? 'Update the details of this checklist item.'
                : 'Create a new checklist item for the PSSR library.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Category & ID Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select value={formData.category_id} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.filter(c => c.is_active).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                    <Separator className="my-1" />
                    <SelectItem value="__new__" className="text-primary">
                      <span className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4" />
                        Add New Category
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Unique ID
                </label>
                <Input 
                  value={formData.unique_id || generateNextUniqueId(formData.category_id)} 
                  disabled 
                  className="bg-muted/50 border-muted font-mono"
                />
              </div>
            </div>

            {/* Topic Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Topic
              </label>
              <Input
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., Piping, Electrical, Instruments"
                className="placeholder:text-muted-foreground/60 placeholder:italic"
              />
              <p className="text-xs text-muted-foreground">1-2 word tag summarizing the item</p>
            </div>

            {/* Description Section */}
            <div className="border-t border-border/40 pt-5 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter the checklist item description..."
                className="placeholder:text-muted-foreground/60 placeholder:italic min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Supporting Evidence
              </label>
              <Input
                value={formData.supporting_evidence}
                onChange={(e) => setFormData(prev => ({ ...prev, supporting_evidence: e.target.value }))}
                placeholder="e.g., Signed-off ITR-B, Test Records"
                className="placeholder:text-muted-foreground/60 placeholder:italic"
              />
            </div>

            {/* Responsible Party Section */}
            <div className="border-t border-border/40 pt-5 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Responsible Party
              </label>
              <Select
                value={formData.responsible_party || 'none'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, responsible_party: value === 'none' ? '' : value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select responsible party..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Project Engr">Project Engr</SelectItem>
                  <SelectItem value="Commissioning">Commissioning</SelectItem>
                  <SelectItem value="ORA">ORA</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  {disciplines?.map(discipline => (
                    <SelectItem key={discipline.id} value={discipline.name}>{discipline.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Approvers Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Approvers <span className="text-muted-foreground/60 normal-case font-normal">(Disciplines)</span>
              </label>
              <div className="space-y-3">
                {formData.approving_authorities.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    {formData.approving_authorities.map((auth) => (
                      <Badge key={auth} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                        {auth}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive transition-colors"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            approving_authorities: prev.approving_authorities.filter(a => a !== auth)
                          }))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !formData.approving_authorities.includes(value)) {
                      setFormData(prev => ({
                        ...prev,
                        approving_authorities: [...prev.approving_authorities, value]
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Add discipline..." />
                  </SelectTrigger>
                  <SelectContent>
                    {!formData.approving_authorities.includes('Operations') && (
                      <SelectItem value="Operations">Operations</SelectItem>
                    )}
                    {disciplines?.filter(d => !formData.approving_authorities.includes(d.name)).map(discipline => (
                      <SelectItem key={discipline.id} value={discipline.name}>{discipline.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.category_id || !formData.description.trim() || createItem.isPending || updateItem.isPending}
            >
              {(createItem.isPending || updateItem.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmItem?.unique_id}"? This will mark the item as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for checklist items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={newCategoryData.name}
                onChange={(e) => handleNewCategoryNameChange(e.target.value)}
                placeholder="e.g., Technical Integrity"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reference ID <span className="text-destructive">*</span>
              </label>
              <Input
                value={newCategoryData.ref_id}
                onChange={(e) => setNewCategoryData(prev => ({ ...prev, ref_id: e.target.value.toUpperCase() }))}
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
                value={newCategoryData.description}
                onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNewCategory} 
              disabled={!newCategoryData.name.trim() || !newCategoryData.ref_id.trim() || createCategory.isPending}
            >
              {createCategory.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChecklistItemsLibrary;
