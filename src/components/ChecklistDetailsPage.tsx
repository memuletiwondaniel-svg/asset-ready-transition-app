import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Filter, Calendar, User, Activity, FileText, Edit, Trash2, Plus, Settings, Eye, Home, Grid3x3, List, ChevronLeft, ChevronRight, FolderInput, X, Maximize2, Minimize2, Check, XCircle, ClipboardList } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import EditChecklistForm from './EditChecklistForm';
import EditChecklistItemModal from './EditChecklistItemModal';
import ViewChecklistItemModal from './ViewChecklistItemModal';
import { Checklist } from '@/hooks/useChecklists';
import { useChecklistItems, ChecklistItem } from '@/hooks/useChecklistItems';
import AdminHeader from '@/components/admin/AdminHeader';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { getCurrentTranslations } from '@/utils/translations';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  'General': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  'Hardware Integrity': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  'Process Safety': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  'Documentation': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  'Organization': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  'Health & Safety': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  'Emergency Response': 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  'HSE': 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
  'Electrical': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  'Mechanical': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  'Instrumentation': 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30',
  'Civil': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  'Rotating': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30'
};
interface ChecklistDetailsPageProps {
  checklist: Checklist;
  onBack: () => void;
  selectedLanguage?: string;
  translations?: any;
}
const ChecklistDetailsPage: React.FC<ChecklistDetailsPageProps> = ({
  checklist,
  onBack,
  selectedLanguage = "English",
  translations = {}
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  const t = getCurrentTranslations(currentLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showEditChecklist, setShowEditChecklist] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [viewingItem, setViewingItem] = useState<ChecklistItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [bulkSelectedItems, setBulkSelectedItems] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [targetCategory, setTargetCategory] = useState('');
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('checklist-expanded-columns');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [activeTab, setActiveTab] = useState('items');
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const {
    toast
  } = useToast();
  const {
    data: allChecklistItems = [],
    isLoading
  } = useChecklistItems();
  const [selectedItems, setSelectedItems] = useState<string[]>(checklist.selected_items || []);

  // Filter checklist items to show only the ones selected for this checklist
  const checklistItems = allChecklistItems.filter(item => selectedItems.includes(item.unique_id));

  // Mock active PSSR data
  const activePSSRs = [{
    id: 'PSSR-2024-001',
    projectName: 'Gas Processing Unit A',
    status: 'In Progress',
    progress: 65
  }, {
    id: 'PSSR-2024-002',
    projectName: 'Compression Station B',
    status: 'Under Review',
    progress: 85
  }, {
    id: 'PSSR-2024-003',
    projectName: 'Pipeline Section C',
    status: 'Not Started',
    progress: 0
  }];

  // Filter and sort checklist items
  const filteredItems = useMemo(() => {
    let items = checklistItems.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) || (item.required_evidence || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'id':
          comparison = (a.unique_id || '').localeCompare(b.unique_id || '');
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'authority':
          comparison = (a.Approver || '').localeCompare(b.Approver || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return items;
  }, [searchQuery, selectedCategory, sortBy, sortOrder, checklistItems, selectedItems]);

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);
  const handleEditChecklist = () => {
    setShowEditChecklist(true);
  };
  const handleSaveChecklist = (updatedChecklist: Checklist, updatedSelectedItems: string[]) => {
    // Update checklist and selected items
    setSelectedItems(updatedSelectedItems);
    setShowEditChecklist(false);
    // In real app, this would save to database
  };
  const handleEditItem = (item: ChecklistItem) => {
    setEditingItem(item);
  };
  const handleSaveItem = (updatedItem: ChecklistItem) => {
    // This would trigger a refetch from the server
    setEditingItem(null);
  };
  const handleDeleteItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(id => id !== itemId));
    setEditingItem(null);
  };
  const getCategoryStats = (category: string) => {
    const categoryItems = category === 'all' ? checklistItems : checklistItems.filter(item => item.category === category);
    return categoryItems.length;
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In Progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'Under Review':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">Under Review</Badge>;
      case 'Not Started':
        return <Badge variant="outline">Not Started</Badge>;
      case 'Completed':
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setBulkSelectedItems(new Set(paginatedItems.map(item => item.unique_id)));
    } else {
      setBulkSelectedItems(new Set());
    }
  };
  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSet = new Set(bulkSelectedItems);
    if (checked) {
      newSet.add(itemId);
    } else {
      newSet.delete(itemId);
    }
    setBulkSelectedItems(newSet);
  };
  const handleBulkDelete = () => {
    Array.from(bulkSelectedItems).forEach(itemId => {
      handleDeleteItem(itemId);
    });
    setBulkSelectedItems(new Set());
    setShowDeleteDialog(false);
  };
  const handleBulkMoveCategory = () => {
    if (!targetCategory) return;

    // In a real implementation, this would update the items in the database
    Array.from(bulkSelectedItems).forEach(itemId => {
      // Update item category logic here
      console.log(`Moving item ${itemId} to category ${targetCategory}`);
    });
    setBulkSelectedItems(new Set());
    setShowMoveDialog(false);
    setTargetCategory('');
  };
  const allSelected = paginatedItems.length > 0 && paginatedItems.every(item => bulkSelectedItems.has(item.unique_id));
  const someSelected = paginatedItems.some(item => bulkSelectedItems.has(item.unique_id)) && !allSelected;

  // Inline editing handlers
  const handleStartEdit = (itemId: string, field: string, currentValue: string) => {
    setEditingCell({
      itemId,
      field
    });
    setEditValue(currentValue || '');
  };
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };
  const handleSaveEdit = () => {
    if (!editingCell) return;
    const item = paginatedItems.find(i => i.unique_id === editingCell.itemId);
    if (!item) return;

    // Validation
    if (editingCell.field === 'description' && editValue.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Description cannot be empty",
        variant: "destructive"
      });
      return;
    }
    if (editingCell.field === 'description' && editValue.length > 500) {
      toast({
        title: "Validation Error",
        description: "Description must be less than 500 characters",
        variant: "destructive"
      });
      return;
    }

    // In a real implementation, this would update the item in the database
    console.log(`Updating ${editingCell.field} for item ${editingCell.itemId} to:`, editValue);
    toast({
      title: "Item Updated",
      description: `Successfully updated ${editingCell.field}`
    });
    setEditingCell(null);
    setEditValue('');
  };

  // Handle keyboard shortcuts for inline editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Column width toggle
  const toggleColumnWidth = (columnName: string) => {
    setExpandedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        newSet.delete(columnName);
      } else {
        newSet.add(columnName);
      }
      localStorage.setItem('checklist-expanded-columns', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  // Show edit checklist form
  if (showEditChecklist) {
    return <EditChecklistForm checklist={checklist} onBack={() => setShowEditChecklist(false)} onSave={() => setShowEditChecklist(false)} />;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <AnimatedBackground>
        <div className="relative z-10">
          {/* Admin Header with Breadcrumb */}
          <AdminHeader 
            icon={<ClipboardList className="h-5 w-5" />}
            title={checklist.name}
            description="Manage checklist items and track progress"
          />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Checklist Overview - Compact Stats */}
        <div className="mb-6 animate-fade-in-up">
          <Card className="border-border/40 bg-card/95 backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    {checklist.name}
                  </CardTitle>
                  
                </div>
                <Button variant="outline" size="sm" onClick={handleEditChecklist} className="shadow-sm hover:shadow-md transition-shadow">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Checklist
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 cursor-pointer hover:bg-primary/10 hover:scale-[1.02] transition-all duration-200" onClick={() => setActiveTab('items')}>
                  <div className="p-2 rounded-full bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{checklist.items_count}</p>
                    <p className="text-xs text-muted-foreground font-medium">Total Items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10 cursor-pointer hover:bg-green-500/10 hover:scale-[1.02] transition-all duration-200" onClick={() => setActiveTab('pssrs')}>
                  <div className="p-2 rounded-full bg-green-500/10">
                    <Activity className="h-5 w-5 text-green-600 dark:text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{checklist.active_pssr_count}</p>
                    <p className="text-xs text-muted-foreground font-medium">Active PSSRs</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{new Date(checklist.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground font-medium">Created Date</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <div className="p-2 rounded-full bg-purple-500/10">
                    <User className="h-5 w-5 text-purple-600 dark:text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground truncate max-w-[100px]">{checklist.created_by}</p>
                    <p className="text-xs text-muted-foreground font-medium">Created By</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="items" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Checklist Items
            </TabsTrigger>
            <TabsTrigger value="pssrs" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Active PSSRs
            </TabsTrigger>
          </TabsList>

          {/* Checklist Items Tab */}
          <TabsContent value="items" className="space-y-6">
            {/* Search and Filter Controls */}
            <Card className="border-border/40 bg-card/95 backdrop-blur-xl shadow-lg animate-fade-in">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input placeholder="Search checklist items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-11 bg-background/50 transition-all duration-200 focus:shadow-md" />
                  </div>
                  <div className="flex gap-3">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-56 h-11 bg-background/50 transition-all duration-200 hover:bg-background/70">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories ({getCategoryStats('all')})</SelectItem>
                        {Array.from(new Set(allChecklistItems.map(item => item.category))).map(category => <SelectItem key={category} value={category}>
                            {category} ({getCategoryStats(category)})
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                      <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-9 px-3 transition-all duration-200">
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                      <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-9 px-3 transition-all duration-200">
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Add Item Button */}
                    <Button 
                      variant="default"
                      size="default"
                      className="h-11 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90 duration-300 relative z-10" />
                      <span className="relative z-10">Add Item</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions Toolbar */}
            {bulkSelectedItems.size > 0 && <div className="bg-primary/10 backdrop-blur-xl border border-primary/20 rounded-lg p-4 flex items-center justify-between gap-4 shadow-lg animate-slide-in-right">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold shadow-sm">
                    {bulkSelectedItems.size} item{bulkSelectedItems.size !== 1 ? 's' : ''} selected
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setBulkSelectedItems(new Set())} className="hover:bg-background/50">
                    <X className="h-4 w-4 mr-2" />
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowMoveDialog(true)} className="shadow-sm hover:shadow-md transition-shadow">
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to Category
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} className="shadow-sm hover:shadow-md transition-shadow">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              </div>}

            {/* Items Content - Grid or Table View */}
            <Card className="border-border/40 bg-card/95 backdrop-blur-xl shadow-xl animate-fade-in" style={{
                animationDelay: '100ms'
              }}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Checklist Items ({filteredItems.length})</CardTitle>
                    <CardDescription className="mt-1">
                      {viewMode === 'grid' ? 'Card view' : 'Table view'} • Page {currentPage} of {totalPages}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                      <p className="text-muted-foreground">Loading checklist items...</p>
                    </div>
                  </div> : viewMode === 'grid' ? (/* Grid View */
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {paginatedItems.map((item, index) => <div 
                      key={item.unique_id} 
                      className="group relative p-5 rounded-xl border-2 border-border/40 bg-gradient-to-br from-card/80 to-card/50 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 hover:-translate-y-1 transition-all duration-300 hover:scale-[1.03] animate-scale-in cursor-pointer overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/10 before:via-transparent before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700" 
                      style={{
                        animationDelay: `${index * 50}ms`
                      }} 
                      onClick={() => setViewingItem(item)}
                    >
                        {/* Item Header */}
                          <div className="flex items-start justify-between gap-4 mb-3 relative z-10">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Badge variant="outline" className="font-mono text-sm px-3 py-1 bg-primary/5 border-primary/30 text-primary font-semibold shrink-0 whitespace-nowrap transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/70 group-hover:scale-105">
                              {item.unique_id}
                            </Badge>
                            <Badge className={`text-xs px-2.5 py-1 font-medium transition-all duration-300 group-hover:scale-105 ${CATEGORY_COLORS[item.category] || 'bg-secondary/10 text-secondary-foreground border-secondary/30'}`}>
                              {item.category}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-sm font-medium text-foreground mb-3 line-clamp-2 leading-relaxed transition-colors duration-300 group-hover:text-primary relative z-10">
                          {item.description}
                        </p>
                        
                        {/* Footer Info */}
                        <div className="flex items-center justify-between gap-4 pt-3 border-t border-border/20">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">Supporting Evidence</p>
                            <p className="text-xs font-medium text-foreground truncate">
                              {item.required_evidence || 'No evidence required'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground mb-1">Authority</p>
                            <p className="text-xs font-medium text-foreground">
                              {item.Approver || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>)}
                  </div>) : (/* Table View */
                  <div className="rounded-lg border border-border/40 overflow-hidden animate-fade-in">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableHead className="w-12">
                            <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} aria-label="Select all items" className={someSelected ? "data-[state=checked]:bg-primary/50" : ""} />
                          </TableHead>
                          <TableHead className={`cursor-pointer hover:bg-muted/50 transition-colors duration-200 ${expandedColumns.has('id') ? 'min-w-[180px]' : 'w-32'} group`} onClick={() => handleSort('id')}>
                            <div className="flex items-center justify-between">
                              <span>Item ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                                e.stopPropagation();
                                toggleColumnWidth('id');
                              }}>
                                {expandedColumns.has('id') ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableHead>
                          <TableHead className={`cursor-pointer hover:bg-muted/50 transition-colors duration-200 ${expandedColumns.has('description') ? 'min-w-[500px]' : ''} group`} onClick={() => handleSort('description')}>
                            <div className="flex items-center justify-between">
                              <span>Description {sortBy === 'description' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                                e.stopPropagation();
                                toggleColumnWidth('description');
                              }}>
                                {expandedColumns.has('description') ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableHead>
                          <TableHead className={`cursor-pointer hover:bg-muted/50 transition-colors duration-200 ${expandedColumns.has('category') ? 'min-w-[220px]' : 'w-40'} group`} onClick={() => handleSort('category')}>
                            <div className="flex items-center justify-between">
                              <span>Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                                e.stopPropagation();
                                toggleColumnWidth('category');
                              }}>
                                {expandedColumns.has('category') ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableHead>
                          <TableHead className={`${expandedColumns.has('evidence') ? 'min-w-[350px]' : 'max-w-xs'} group`}>
                            <div className="flex items-center justify-between">
                              <span>Supporting Evidence</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                                e.stopPropagation();
                                toggleColumnWidth('evidence');
                              }}>
                                {expandedColumns.has('evidence') ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableHead>
                          <TableHead className={`cursor-pointer hover:bg-muted/50 transition-colors duration-200 ${expandedColumns.has('authority') ? 'min-w-[220px]' : 'w-40'} group`} onClick={() => handleSort('authority')}>
                            <div className="flex items-center justify-between">
                              <span>Authority {sortBy === 'authority' && (sortOrder === 'asc' ? '↑' : '↓')}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                                e.stopPropagation();
                                toggleColumnWidth('authority');
                              }}>
                                {expandedColumns.has('authority') ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.map((item, index) => <TableRow 
                          key={item.unique_id} 
                          className={`group hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent hover:shadow-lg hover:scale-[1.01] transition-all duration-300 cursor-pointer animate-fade-in border-l-4 border-l-transparent hover:border-l-primary ${bulkSelectedItems.has(item.unique_id) ? 'bg-primary/5 border-l-primary' : ''}`} 
                          style={{
                            animationDelay: `${index * 30}ms`
                          }}
                          onClick={() => setViewingItem(item)}
                        >
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Checkbox checked={bulkSelectedItems.has(item.unique_id)} onCheckedChange={checked => handleSelectItem(item.unique_id, checked as boolean)} aria-label={`Select ${item.unique_id}`} />
                            </TableCell>
                            <TableCell className="font-mono font-medium text-primary group-hover:text-primary/80 transition-colors">
                              {item.unique_id}
                            </TableCell>
                            <TableCell className={expandedColumns.has('description') ? '' : 'max-w-md'}>
                              {editingCell?.itemId === item.unique_id && editingCell?.field === 'description' ? <div className="flex items-center gap-2 animate-fade-in">
                                  <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={handleKeyDown} className="min-h-[60px] text-sm resize-none" autoFocus maxLength={500} />
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <Button size="sm" onClick={handleSaveEdit} className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700">
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 w-7 p-0">
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div> : <div className={`${expandedColumns.has('description') ? 'font-medium' : 'line-clamp-2 font-medium'} cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors duration-200 group`} onDoubleClick={e => {
                              e.stopPropagation();
                              handleStartEdit(item.unique_id, 'description', item.description);
                            }}>
                                  {item.description}
                                  <span className="ml-2 opacity-0 group-hover:opacity-50 text-xs text-muted-foreground transition-opacity">
                                    (double-click to edit)
                                  </span>
                                </div>}
                            </TableCell>
                            <TableCell>
                              {editingCell?.itemId === item.unique_id && editingCell?.field === 'category' ? <div className="flex items-center gap-2 animate-fade-in">
                                  <Select value={editValue} onValueChange={setEditValue}>
                                    <SelectTrigger className="h-9 w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from(new Set(allChecklistItems.map(i => i.category))).map(cat => <SelectItem key={cat} value={cat}>
                                          {cat}
                                        </SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="sm" onClick={handleSaveEdit} className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700">
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 w-7 p-0">
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div> : <div className="cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors duration-200 group inline-block" onDoubleClick={e => {
                              e.stopPropagation();
                              handleStartEdit(item.unique_id, 'category', item.category);
                            }}>
                                  <Badge className={`${CATEGORY_COLORS[item.category] || 'bg-secondary/10 text-secondary-foreground border-secondary/30'}`}>
                                    {item.category}
                                  </Badge>
                                  <span className="ml-2 opacity-0 group-hover:opacity-50 text-xs text-muted-foreground transition-opacity">
                                    (double-click)
                                  </span>
                                </div>}
                            </TableCell>
                            <TableCell className={expandedColumns.has('evidence') ? '' : 'max-w-xs'}>
                              {editingCell?.itemId === item.unique_id && editingCell?.field === 'evidence' ? <div className="flex items-center gap-2 animate-fade-in">
                                  <Textarea value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={handleKeyDown} className="min-h-[60px] text-sm resize-none" autoFocus maxLength={300} />
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <Button size="sm" onClick={handleSaveEdit} className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700">
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 w-7 p-0">
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div> : <div className={`${expandedColumns.has('evidence') ? 'text-sm text-muted-foreground' : 'line-clamp-2 text-sm text-muted-foreground'} cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors duration-200 group`} onDoubleClick={e => {
                              e.stopPropagation();
                              handleStartEdit(item.unique_id, 'evidence', item.required_evidence || '');
                            }}>
                                  {item.required_evidence || '-'}
                                  {item.required_evidence && <span className="ml-2 opacity-0 group-hover:opacity-50 text-xs transition-opacity">
                                      (double-click to edit)
                                    </span>}
                                </div>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {editingCell?.itemId === item.unique_id && editingCell?.field === 'approver' ? <div className="flex items-center gap-2 animate-fade-in">
                                  <Input value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={handleKeyDown} className="h-9" autoFocus maxLength={100} />
                                  <div className="flex gap-1 shrink-0">
                                    <Button size="sm" onClick={handleSaveEdit} className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700">
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 w-7 p-0">
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div> : <div className="cursor-pointer hover:bg-muted/20 p-2 rounded transition-colors duration-200 group" onDoubleClick={e => {
                              e.stopPropagation();
                              handleStartEdit(item.unique_id, 'approver', item.Approver || '');
                            }}>
                                  {item.Approver || '-'}
                                  <span className="ml-2 opacity-0 group-hover:opacity-50 text-xs text-muted-foreground transition-opacity">
                                    (double-click)
                                  </span>
                                </div>}
                            </TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table>
                  </div>)}
                
                {/* Pagination Controls */}
                {!isLoading && filteredItems.length > 0 && <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/20 animate-fade-in" style={{
                    animationDelay: '200ms'
                  }}>
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="transition-all duration-200 hover:scale-105">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({
                          length: Math.min(5, totalPages)
                        }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className="h-9 w-9 p-0 transition-all duration-200 hover:scale-110">
                              {pageNum}
                            </Button>;
                        })}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="transition-all duration-200 hover:scale-105">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active PSSRs Tab */}
          <TabsContent value="pssrs" className="space-y-6">
            <Card className="border border-border/20 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Active PSSR Reviews</CardTitle>
                <CardDescription>
                  Projects currently using this checklist for PSSR reviews
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activePSSRs.map(pssr => <div key={pssr.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{pssr.id}</h4>
                        <p className="text-sm text-muted-foreground">{pssr.projectName}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{pssr.progress}% Complete</div>
                          <div className="w-24 bg-muted rounded-full h-2 mt-1">
                            <div className="bg-primary h-2 rounded-full" style={{
                              width: `${pssr.progress}%`
                            }} />
                          </div>
                        </div>
                        {getStatusBadge(pssr.status)}
                        <Button variant="outline" size="sm">
                          View PSSR
                        </Button>
                      </div>
                    </div>)}
                  {activePSSRs.length === 0 && <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active PSSRs</h3>
                      <p className="text-muted-foreground">
                        No projects are currently using this checklist for PSSR reviews.
                      </p>
                    </div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Item Modal */}
      {viewingItem && <ViewChecklistItemModal isOpen={true} item={viewingItem} onClose={() => setViewingItem(null)} onEdit={() => {
          setEditingItem(viewingItem);
          setViewingItem(null);
        }} />}

      {/* Edit Item Modal */}
      {editingItem && <EditChecklistItemModal isOpen={true} item={editingItem} onClose={() => setEditingItem(null)} onComplete={handleSaveItem} />}

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-semibold text-destructive">
              Confirm Bulk Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete <span className="font-semibold text-foreground">{bulkSelectedItems.size} item{bulkSelectedItems.size !== 1 ? 's' : ''}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="transition-all duration-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90 transition-all duration-200">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Move to Category Dialog */}
      <AlertDialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-semibold">
              Move to Category
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Select a category to move <span className="font-semibold text-foreground">{bulkSelectedItems.size} item{bulkSelectedItems.size !== 1 ? 's' : ''}</span> to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={targetCategory} onValueChange={setTargetCategory}>
              <SelectTrigger className="h-11 bg-background/50">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {Array.from(new Set(allChecklistItems.map(item => item.category))).map(category => <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setTargetCategory('')} className="transition-all duration-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkMoveCategory} disabled={!targetCategory} className="transition-all duration-200">
              Move Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        </div>
      </AnimatedBackground>
    </div>;
};
export default ChecklistDetailsPage;