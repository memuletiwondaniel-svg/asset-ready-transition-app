import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Edit2, Trash2, Search, Filter, X, FileCheck, Loader2, Columns, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useVCRItems, useCreateVCRItem, useUpdateVCRItem, useDeleteVCRItem, VCRItemWithRoles } from '@/hooks/useVCRItems';
import { useVCRItemCategories } from '@/hooks/useVCRItemCategories';
import { useCategorizedRoles } from '@/hooks/useCategorizedRoles';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const categoryColors: Record<string, string> = {
  'DI': 'bg-blue-50 text-blue-700/80 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-300/80 dark:border-blue-800/40',
  'TI': 'bg-teal-50 text-teal-700/80 border-teal-200/60 dark:bg-teal-950/30 dark:text-teal-300/80 dark:border-teal-800/40',
  'OI': 'bg-violet-50 text-violet-700/80 border-violet-200/60 dark:bg-violet-950/30 dark:text-violet-300/80 dark:border-violet-800/40',
  'MS': 'bg-orange-50 text-orange-700/80 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-300/80 dark:border-orange-800/40',
  'HS': 'bg-rose-50 text-rose-700/80 border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-300/80 dark:border-rose-800/40',
  'OR': 'bg-amber-50 text-amber-700/80 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300/80 dark:border-amber-800/40',
};

const getCategoryColor = (code: string | undefined) => {
  if (!code) return '';
  // Strip trailing numbers for matching (e.g., DI2 -> DI)
  const baseCode = code.replace(/\d+$/, '');
  return categoryColors[baseCode] || '';
};

const generateDisplayId = (categoryCode: string | undefined, displayOrder: number): string => {
  if (!categoryCode) return `??-${String(displayOrder).padStart(2, '0')}`;
  const baseCode = categoryCode.replace(/\d+$/, '');
  return `${baseCode}-${String(displayOrder).padStart(2, '0')}`;
};

interface ItemFormData {
  category_id: string;
  vcr_item: string;
  topic: string;
  delivering_party_role_id: string;
  approving_party_role_ids: string[];
  supporting_evidence: string;
  guidance_notes: string;
}

const emptyForm: ItemFormData = {
  category_id: '',
  vcr_item: '',
  topic: '',
  delivering_party_role_id: '',
  approving_party_role_ids: [],
  supporting_evidence: '',
  guidance_notes: '',
};

const VCRItemsTab: React.FC = () => {
  const { data: items, isLoading: itemsLoading } = useVCRItems();
  const { data: categories, isLoading: categoriesLoading } = useVCRItemCategories();
  const { data: groupedRoles, isLoading: rolesLoading } = useCategorizedRoles();

  const createItem = useCreateVCRItem();
  const updateItem = useUpdateVCRItem();
  const deleteItem = useDeleteVCRItem();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VCRItemWithRoles | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<VCRItemWithRoles | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyForm);

  const [visibleColumns, setVisibleColumns] = useState({
    topic: true,
    deliveringParty: true,
    approvers: true,
    supportingEvidence: false,
    guidanceNotes: false,
  });

  const isLoading = itemsLoading || categoriesLoading;

  // Flatten all roles for dropdowns
  const allRoles = useMemo(() => {
    if (!groupedRoles) return [];
    return groupedRoles.flatMap(g => g.roles);
  }, [groupedRoles]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const displayId = generateDisplayId(item.category_code, item.display_order);
      const matchesSearch =
        item.vcr_item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.delivering_role_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supporting_evidence?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const visibleColumnCount = 3 + Object.values(visibleColumns).filter(Boolean).length;

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ ...emptyForm, category_id: categories?.[0]?.id || '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: VCRItemWithRoles) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id || '',
      vcr_item: item.vcr_item,
      topic: item.topic || '',
      delivering_party_role_id: item.delivering_party_role_id || '',
      approving_party_role_ids: item.approving_party_role_ids || [],
      supporting_evidence: item.supporting_evidence || '',
      guidance_notes: item.guidance_notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.category_id || !formData.vcr_item.trim()) return;

    const payload = {
      category_id: formData.category_id,
      vcr_item: formData.vcr_item.trim(),
      topic: formData.topic.trim() || null,
      delivering_party_role_id: formData.delivering_party_role_id || null,
      approving_party_role_ids: formData.approving_party_role_ids.length > 0 ? formData.approving_party_role_ids : null,
      supporting_evidence: formData.supporting_evidence.trim() || null,
      guidance_notes: formData.guidance_notes.trim() || null,
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

  const handleExport = () => {
    if (!filteredItems.length) return;
    const rows = filteredItems.map(item => ({
      'ID': generateDisplayId(item.category_code, item.display_order),
      'Category': item.category_name || '',
      'Topic': item.topic || '',
      'Description': item.vcr_item,
      'Delivering Party': item.delivering_role_name || '',
      'Approvers': (item.approving_role_names || []).join(', '),
      'Supporting Evidence': item.supporting_evidence || '',
      'Guidance Notes': item.guidance_notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VCR Items');
    const filename = `VCR_Items_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Exported to ${filename}`);
  };

  const toggleApprover = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      approving_party_role_ids: prev.approving_party_role_ids.includes(roleId)
        ? prev.approving_party_role_ids.filter(id => id !== roleId)
        : [...prev.approving_party_role_ids, roleId],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Checklist Items
            </CardTitle>
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
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')}>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><Columns className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={visibleColumns.topic} onCheckedChange={(c) => setVisibleColumns(p => ({ ...p, topic: !!c }))}>Topic</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.deliveringParty} onCheckedChange={(c) => setVisibleColumns(p => ({ ...p, deliveringParty: !!c }))}>Delivering Party</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.approvers} onCheckedChange={(c) => setVisibleColumns(p => ({ ...p, approvers: !!c }))}>Approvers</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.supportingEvidence} onCheckedChange={(c) => setVisibleColumns(p => ({ ...p, supportingEvidence: !!c }))}>Supporting Evidence</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleColumns.guidanceNotes} onCheckedChange={(c) => setVisibleColumns(p => ({ ...p, guidanceNotes: !!c }))}>Guidance Notes</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleExport} disabled={!filteredItems.length}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Export to Excel</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-6">
            <Badge variant="outline" className="px-3 py-1">{filteredItems.length} items</Badge>
            {categoryFilter !== 'all' && (() => {
              const cat = categories?.find(c => c.id === categoryFilter);
              return cat ? (
                <Badge variant="outline" className={cn("px-3 py-1 font-medium", getCategoryColor(cat.code))}>
                  {cat.name}
                </Badge>
              ) : null;
            })()}
          </div>

          {/* Table */}
          <div className="border rounded-lg max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead>Description</TableHead>
                  {visibleColumns.topic && <TableHead className="w-40">Topic</TableHead>}
                  {visibleColumns.deliveringParty && <TableHead className="w-40">Delivering Party</TableHead>}
                  {visibleColumns.approvers && <TableHead className="w-48">Approvers</TableHead>}
                  {visibleColumns.supportingEvidence && <TableHead className="w-48">Supporting Evidence</TableHead>}
                  {visibleColumns.guidanceNotes && <TableHead className="w-48">Guidance Notes</TableHead>}
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                      {items?.length === 0 ? 'No VCR items yet. Click "Add Item" to create one.' : 'No items match your search criteria.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenEdit(item)}>
                      <TableCell className="font-mono text-xs">
                        {generateDisplayId(item.category_code, item.display_order)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs font-medium", getCategoryColor(item.category_code))}>
                          {item.category_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-4 text-sm whitespace-normal break-words">{item.vcr_item}</p>
                      </TableCell>
                      {visibleColumns.topic && (
                        <TableCell className="text-sm text-muted-foreground">{item.topic || '—'}</TableCell>
                      )}
                      {visibleColumns.deliveringParty && (
                        <TableCell className="text-sm text-muted-foreground">{item.delivering_role_name || '—'}</TableCell>
                      )}
                      {visibleColumns.approvers && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(item.approving_role_names || []).slice(0, 3).map((name, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                            ))}
                            {(item.approving_role_names || []).length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{(item.approving_role_names || []).length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.supportingEvidence && (
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <p className="line-clamp-2">{item.supporting_evidence || '—'}</p>
                        </TableCell>
                      )}
                      {visibleColumns.guidanceNotes && (
                        <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                          <p className="line-clamp-2">{item.guidance_notes || '—'}</p>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(item)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmItem(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
          
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {editingItem ? 'Edit Checklist Item' : 'New Checklist Item'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {editingItem ? 'Update the details for this checklist item.' : 'Define a new VCR checklist item with its category and parties.'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData(p => ({ ...p, category_id: v }))}>
                  <SelectTrigger className="bg-muted/30 border-border/60 focus:bg-background transition-colors">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Delivering Party
                </Label>
                <Select value={formData.delivering_party_role_id} onValueChange={(v) => setFormData(p => ({ ...p, delivering_party_role_id: v }))}>
                  <SelectTrigger className="bg-muted/30 border-border/60 focus:bg-background transition-colors">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedRoles?.map(group => (
                      <React.Fragment key={group.category.id}>
                        <SelectItem value={`__label_${group.category.id}`} disabled className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                          {group.category.name}
                        </SelectItem>
                        {group.roles.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={formData.vcr_item}
                onChange={(e) => setFormData(p => ({ ...p, vcr_item: e.target.value }))}
                placeholder="Enter VCR item description..."
                rows={3}
                className="bg-muted/30 border-border/60 focus:bg-background transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Topic
              </Label>
              <Input
                value={formData.topic}
                onChange={(e) => setFormData(p => ({ ...p, topic: e.target.value }))}
                placeholder="e.g., Basis for Design"
                className="bg-muted/30 border-border/60 focus:bg-background transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Approving Parties
                </Label>
                {formData.approving_party_role_ids.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    {formData.approving_party_role_ids.length} selected
                  </Badge>
                )}
              </div>
              <div className="border border-border/60 rounded-lg bg-muted/20 p-3 max-h-44 overflow-y-auto space-y-3">
                {groupedRoles?.map(group => (
                  <div key={group.category.id}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1.5 border-b border-border/30 pb-1">
                      {group.category.name}
                    </p>
                    <div className="grid grid-cols-2 gap-0.5">
                      {group.roles.map(role => (
                        <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 transition-colors">
                          <Checkbox
                            checked={formData.approving_party_role_ids.includes(role.id)}
                            onCheckedChange={() => toggleApprover(role.id)}
                          />
                          <span className="text-foreground/90">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Supporting Evidence
                </Label>
                <Textarea
                  value={formData.supporting_evidence}
                  onChange={(e) => setFormData(p => ({ ...p, supporting_evidence: e.target.value }))}
                  placeholder="e.g., DEM 1 Compliance Report"
                  rows={3}
                  className="bg-muted/30 border-border/60 focus:bg-background transition-colors resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Guidance Notes
                </Label>
                <Textarea
                  value={formData.guidance_notes}
                  onChange={(e) => setFormData(p => ({ ...p, guidance_notes: e.target.value }))}
                  placeholder="Enter guidance notes..."
                  rows={3}
                  className="bg-muted/30 border-border/60 focus:bg-background transition-colors resize-none text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="px-5">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.category_id || !formData.vcr_item.trim() || createItem.isPending || updateItem.isPending} className="px-5">
              {(createItem.isPending || updateItem.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete VCR Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this VCR checklist item? This action can be undone by an administrator.
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
    </div>
  );
};

export default VCRItemsTab;
