import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Edit2, Trash2, Search, Filter, X, FileText, Loader2, FolderPlus, Info, Columns, Download, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePSSRChecklistItems,
  usePSSRChecklistCategories,
  usePSSRChecklistRoles,
  useCreateChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  useCreateChecklistCategory,
  ChecklistItem,
} from '@/hooks/usePSSRChecklistLibrary';
import { getRoleResolutionDescription, BASE_ROLES_FOR_CHECKLIST } from '@/utils/resolveChecklistRole';
import { exportPSSRChecklistToExcel } from '@/utils/pssrChecklistExport';
import { toast } from 'sonner';

interface ItemFormData {
  category: string;
  topic: string;
  description: string;
  supporting_evidence: string;
  guidance_notes: string;
  approvers: string[];
  responsible: string;
}

// Group roles by category for display
const ROLE_GROUPS = {
  'TA2 Disciplines': [
    'Process TA2',
    'PACO TA2',
    'Elect TA2',
    'Static TA2',
    'Rotating TA2',
    'Civil TA2',
    'Tech Safety TA2',
  ],
  'Operations': [
    'ORA Engr.',
    'ORA Lead',
    'Ops Coach',
    'Site Engr.',
    'Ops Team Lead',
  ],
  'Projects': [
    'Project Engr',
    'Project Hub Lead',
    'Project Manager',
    'Commissioning Lead',
    'Construction Lead',
    'Completions Engr',
    'Project Controls Lead',
  ],
  'HSE': [
    'Ops HSE Adviser',
    'Environment Engr',
    'ER Adviser',
  ],
  'Other': [
    'CMMS Engr.',
    'CMMS Lead',
  ],
};

// Soft, muted category colors for visual distinction
const categoryColors: Record<string, string> = {
  'TI': 'bg-blue-50 text-blue-700/80 border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-300/80 dark:border-blue-800/40',
  'PS': 'bg-rose-50 text-rose-700/80 border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-300/80 dark:border-rose-800/40',
  'ORG': 'bg-violet-50 text-violet-700/80 border-violet-200/60 dark:bg-violet-950/30 dark:text-violet-300/80 dark:border-violet-800/40',
  'DOC': 'bg-orange-50 text-orange-700/80 border-orange-200/60 dark:bg-orange-950/30 dark:text-orange-300/80 dark:border-orange-800/40',
  'ER': 'bg-amber-50 text-amber-700/80 border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-300/80 dark:border-amber-800/40',
  'HSE': 'bg-teal-50 text-teal-700/80 border-teal-200/60 dark:bg-teal-950/30 dark:text-teal-300/80 dark:border-teal-800/40',
};

// Shortened display names for long category names
const categoryDisplayNames: Record<string, string> = {
  'Technical Integrity': 'Tech Integrity',
};

// Helper function to get display name
const getCategoryDisplayName = (name: string | undefined): string => {
  if (!name) return '';
  return categoryDisplayNames[name] || name;
};


// Generate display ID from category ref_id and sequence number
const generateDisplayId = (categoryRefId: string | undefined, sequenceNumber: number): string => {
  if (!categoryRefId) return `??-${String(sequenceNumber).padStart(2, '0')}`;
  return `${categoryRefId}-${String(sequenceNumber).padStart(2, '0')}`;
};

const ChecklistItemsLibrary: React.FC = () => {
  const { data: items, isLoading: itemsLoading } = usePSSRChecklistItems();
  const { data: categories, isLoading: categoriesLoading } = usePSSRChecklistCategories();
  const { data: roles, isLoading: rolesLoading } = usePSSRChecklistRoles();
  
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
    category: '',
    topic: '',
    description: '',
    supporting_evidence: '',
    guidance_notes: '',
    approvers: [],
    responsible: '',
  });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    topic: true,
    responsible: false,
    supportingEvidence: false,
    approvers: true,
  });

  const isLoading = itemsLoading || categoriesLoading;
  const visibleColumnCount = 3 + Object.values(visibleColumns).filter(Boolean).length;

  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      const displayId = generateDisplayId(item.categoryData?.ref_id, item.sequence_number);
      const matchesSearch = 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.approvers?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supporting_evidence?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    filteredItems.forEach(item => {
      const categoryName = item.categoryData?.name || 'Uncategorized';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });
    return groups;
  }, [filteredItems]);

  const getNextSequenceNumber = (categoryId: string) => {
    if (!items) return 1;
    const categoryItems = items.filter(i => i.category === categoryId);
    return categoryItems.length + 1;
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      category: categories?.[0]?.id || '',
      topic: '',
      description: '',
      supporting_evidence: '',
      guidance_notes: '',
      approvers: [],
      responsible: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      topic: item.topic || '',
      description: item.description,
      supporting_evidence: item.supporting_evidence || '',
      guidance_notes: (item as any).guidance_notes || '',
      approvers: item.approvers ? item.approvers.split(',').map(s => s.trim()) : [],
      responsible: item.responsible || '',
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
      category: categoryId,
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
        category: result.id,
      }));
    }
    
    setShowNewCategoryDialog(false);
    setNewCategoryData({ name: '', ref_id: '', description: '' });
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.description.trim()) {
      return;
    }

    const categoryChanged = editingItem && editingItem.category !== formData.category;

    const payload = {
      category: formData.category,
      topic: formData.topic.trim() || null,
      description: formData.description.trim(),
      supporting_evidence: formData.supporting_evidence.trim() || null,
      guidance_notes: formData.guidance_notes.trim() || null,
      approvers: formData.approvers.length > 0 ? formData.approvers.join(', ') : null,
      responsible: formData.responsible.trim() || null,
      is_active: true,
      version: editingItem ? editingItem.version + 1 : 1,
      sequence_number: categoryChanged ? undefined : (editingItem?.sequence_number || getNextSequenceNumber(formData.category)),
    };

    if (editingItem) {
      await updateItem.mutateAsync({ 
        id: editingItem.id, 
        oldCategory: categoryChanged ? editingItem.category : undefined,
        ...payload 
      });
    } else {
      await createItem.mutateAsync(payload);
    }

    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    await deleteItem.mutateAsync({ 
      id: deleteConfirmItem.id, 
      categoryId: deleteConfirmItem.category 
    });
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
            <div className="flex items-center gap-3">
              <CardTitle>
                PSSR Items
              </CardTitle>
              <Badge variant="outline" className="px-3 py-1">
                {filteredItems.length} items
              </Badge>
              {categoryFilter !== 'all' && (() => {
                const cat = categories?.find(c => c.id === categoryFilter);
                return (
                  <Badge 
                    variant="outline" 
                    className={cn("px-3 py-1 font-medium", categoryColors[cat?.ref_id || ''])}
                  >
                    {getCategoryDisplayName(cat?.name)}
                  </Badge>
                );
              })()}
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
            
            {/* Column Visibility Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.topic}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, topic: checked }))}
                >
                  Topic
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.responsible}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, responsible: checked }))}
                >
                  Responsible
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.supportingEvidence}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, supportingEvidence: checked }))}
                >
                  Supporting Evidence
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.approvers}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, approvers: checked }))}
                >
                  Approvers
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      if (items && categories) {
                        const filename = exportPSSRChecklistToExcel(items, categories);
                        toast.success(`Exported to ${filename}`);
                      }
                    }}
                    disabled={!items || items.length === 0}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export to Excel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>


          {/* Items Table */}
          <div className="border rounded-lg max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  {visibleColumns.topic && <TableHead className="w-32">Topic</TableHead>}
                  <TableHead className="flex-1">Description</TableHead>
                  {visibleColumns.responsible && <TableHead className="w-40">Responsible</TableHead>}
                  {visibleColumns.supportingEvidence && <TableHead className="w-48">Supporting Evidence</TableHead>}
                  {visibleColumns.approvers && <TableHead className="w-48">Approvers</TableHead>}
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                      {items?.length === 0 
                        ? 'No checklist items yet. Click "Add Item" to create one.'
                        : 'No items match your search criteria.'}
                    </TableCell>
                  </TableRow>
                ) : (
                   filteredItems.map(item => (
                     <TableRow 
                       key={item.id} 
                       className="group cursor-pointer hover:bg-muted/50"
                       onClick={() => handleOpenEdit(item)}
                     >
                      <TableCell className="font-mono text-sm font-medium">{generateDisplayId(item.categoryData?.ref_id, item.sequence_number)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("font-medium", categoryColors[item.categoryData?.ref_id || ''])}
                        >
                          {getCategoryDisplayName(item.categoryData?.name)}
                        </Badge>
                      </TableCell>
                      {visibleColumns.topic && (
                        <TableCell className="text-sm text-muted-foreground">
                          {item.topic || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <p>{item.description}</p>
                      </TableCell>
                      {visibleColumns.responsible && (
                        <TableCell className="text-sm text-muted-foreground">
                          {item.responsible || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.supportingEvidence && (
                        <TableCell className="text-sm text-muted-foreground">
                          {item.supporting_evidence || '-'}
                        </TableCell>
                      )}
                      {visibleColumns.approvers && (
                        <TableCell className="text-sm text-muted-foreground">
                          {item.approvers || '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
            <DialogTitle>{editingItem ? 'Edit PSSR Item' : 'Add New PSSR Item'}</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? 'Update the details of this PSSR item.'
                : 'Create a new PSSR item for the library.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Category Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category <span className="text-destructive">*</span>
              </label>
              <Select value={formData.category} onValueChange={handleCategoryChange}>
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

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Guidance Notes
              </label>
              <Textarea
                value={formData.guidance_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, guidance_notes: e.target.value }))}
                placeholder="Enter guidance notes..."
                className="placeholder:text-muted-foreground/60 placeholder:italic min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Responsible Section */}
            <div className="border-t border-border/40 pt-5 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Responsible
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Roles resolve based on PSSR location context</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-background font-normal"
                  >
                    {formData.responsible || 'Select responsible...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search roles..." />
                    <CommandList>
                      <CommandEmpty>No role found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => setFormData(prev => ({ ...prev, responsible: '' }))}
                        >
                          <Check className={cn("mr-2 h-4 w-4", !formData.responsible ? "opacity-100" : "opacity-0")} />
                          None
                        </CommandItem>
                      </CommandGroup>
                      {Object.entries(ROLE_GROUPS).map(([group, groupRoles]) => (
                        <CommandGroup key={group} heading={group}>
                          {groupRoles.map(role => (
                            <CommandItem
                              key={role}
                              value={role}
                              onSelect={() => setFormData(prev => ({ ...prev, responsible: role }))}
                            >
                              <Check className={cn("mr-2 h-4 w-4", formData.responsible === role ? "opacity-100" : "opacity-0")} />
                              {role}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Approvers Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Approvers
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Roles resolve based on PSSR location context</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-3">
                {formData.approvers.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    {formData.approvers.map((auth) => (
                      <Badge key={auth} variant="secondary" className="flex items-center gap-1 px-3 py-1.5">
                        {auth}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive transition-colors"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            approvers: prev.approvers.filter(a => a !== auth)
                          }))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-background font-normal"
                    >
                      Add approver...
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search roles..." />
                      <CommandList>
                        <CommandEmpty>No role found.</CommandEmpty>
                        {Object.entries(ROLE_GROUPS).map(([group, groupRoles]) => {
                          const availableRoles = groupRoles.filter(role => !formData.approvers.includes(role));
                          if (availableRoles.length === 0) return null;
                          return (
                            <CommandGroup key={group} heading={group}>
                              {availableRoles.map(role => (
                                <CommandItem
                                  key={role}
                                  value={role}
                                  onSelect={() => {
                                    if (!formData.approvers.includes(role)) {
                                      setFormData(prev => ({
                                        ...prev,
                                        approvers: [...prev.approvers, role]
                                      }));
                                    }
                                  }}
                                >
                                  {role}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.category || !formData.description.trim() || createItem.isPending || updateItem.isPending}
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
              Are you sure you want to delete this item? This will mark the item as inactive.
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
