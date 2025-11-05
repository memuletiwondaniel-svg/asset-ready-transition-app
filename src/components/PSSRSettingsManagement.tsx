import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Home, Plus, Edit2, Trash2, CheckCircle, XCircle, Search, X, GripVertical, Trash, Check } from 'lucide-react';
import { usePSSRReasons, usePSSRReasonSubOptions, usePSSRTieInScopes, usePSSRMOCScopes, PSSRReason, PSSRTieInScope, PSSRMOCScope } from '@/hooks/usePSSRReasons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import AdminHeader from './admin/AdminHeader';
import { getCurrentTranslations } from '@/utils/translations';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PSSRSettingsManagementProps {
  onBack: () => void;
  selectedLanguage?: string;
  translations?: any;
}

const PSSRSettingsManagement: React.FC<PSSRSettingsManagementProps> = ({ 
  onBack,
  selectedLanguage = 'English',
  translations = {}
}) => {
  const queryClient = useQueryClient();
  const [currentLanguage, setCurrentLanguage] = useState(selectedLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('reasons');
  
  const t = getCurrentTranslations(currentLanguage);
  
  // Fetch ALL items (including inactive) for admin management
  const { data: allReasons = [] } = useQuery({
    queryKey: ['pssr-reasons-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_reasons')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PSSRReason[];
    },
  });

  const { data: allTieInScopes = [] } = useQuery({
    queryKey: ['pssr-tie-in-scopes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_tie_in_scopes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PSSRTieInScope[];
    },
  });

  const { data: allMOCScopes = [] } = useQuery({
    queryKey: ['pssr-moc-scopes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_moc_scopes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PSSRMOCScope[];
    },
  });

  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ 
    open: false, 
    type: '', 
    item: null 
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string }>({ 
    open: false, 
    type: '', 
    id: '' 
  });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{ open: boolean; type: string; count: number }>({ 
    open: false, 
    type: '', 
    count: 0 
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [selectedTieInScopes, setSelectedTieInScopes] = useState<Set<string>>(new Set());
  const [selectedMOCScopes, setSelectedMOCScopes] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent, type: string) => {
    setActiveId(event.active.id as string);
    setActiveType(type);
  };

  const handleDragEnd = async (event: DragEndEvent, type: string) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveType(null);

    if (!over || active.id === over.id) {
      return;
    }

    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';
    
    let items: any[];
    if (type === 'reason') {
      items = allReasons;
    } else if (type === 'tie-in') {
      items = allTieInScopes;
    } else {
      items = allMOCScopes;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(items, oldIndex, newIndex);

    try {
      // Update display_order for all affected items
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from(tableName)
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ 
        queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] 
      });
      toast.success('Order updated successfully');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to update order');
    }
  };

  // Toggle active status
  const handleToggleActive = async (type: string, id: string, currentStatus: boolean) => {
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] });
      toast.success(`Item ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  // Handle edit/create
  const handleSave = async () => {
    const { type, item } = editDialog;
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';

    try {
      if (item.id) {
        // Update existing
        const updateData = type === 'tie-in' 
          ? { code: item.code, description: item.description }
          : { name: item.name };

        const { error } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Item updated successfully');
      } else {
        // Create new
        const maxOrder = type === 'reason' 
          ? Math.max(...allReasons.map(r => r.display_order), 0)
          : type === 'tie-in'
          ? Math.max(...allTieInScopes.map(s => s.display_order), 0)
          : Math.max(...allMOCScopes.map(s => s.display_order), 0);

        const insertData = type === 'tie-in'
          ? { code: item.code, description: item.description, display_order: maxOrder + 1 }
          : { name: item.name, display_order: maxOrder + 1 };

        const { error } = await supabase
          .from(tableName)
          .insert(insertData);

        if (error) throw error;
        toast.success('Item created successfully');
      }

      queryClient.invalidateQueries({ queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] });
      setEditDialog({ open: false, type: '', item: null });
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save item');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    const { type, id } = deleteDialog;
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] });
      toast.success('Item deleted successfully');
      setDeleteDialog({ open: false, type: '', id: '' });
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete item');
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = (type: string, checked: boolean) => {
    if (type === 'reason') {
      setSelectedReasons(checked ? new Set(allReasons.map(r => r.id)) : new Set());
    } else if (type === 'tie-in') {
      setSelectedTieInScopes(checked ? new Set(allTieInScopes.map(s => s.id)) : new Set());
    } else {
      setSelectedMOCScopes(checked ? new Set(allMOCScopes.map(s => s.id)) : new Set());
    }
  };

  const toggleSelectItem = (type: string, id: string) => {
    if (type === 'reason') {
      const newSelected = new Set(selectedReasons);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedReasons(newSelected);
    } else if (type === 'tie-in') {
      const newSelected = new Set(selectedTieInScopes);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedTieInScopes(newSelected);
    } else {
      const newSelected = new Set(selectedMOCScopes);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedMOCScopes(newSelected);
    }
  };

  // Bulk action handlers
  const handleBulkToggleActive = async (type: string, active: boolean) => {
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';
    
    const selectedIds = type === 'reason' ? Array.from(selectedReasons)
      : type === 'tie-in' ? Array.from(selectedTieInScopes)
      : Array.from(selectedMOCScopes);

    if (selectedIds.length === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      for (const id of selectedIds) {
        const { error } = await supabase
          .from(tableName)
          .update({ is_active: active })
          .eq('id', id);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ 
        queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] 
      });
      
      // Clear selections
      if (type === 'reason') setSelectedReasons(new Set());
      else if (type === 'tie-in') setSelectedTieInScopes(new Set());
      else setSelectedMOCScopes(new Set());

      toast.success(`${selectedIds.length} item(s) ${active ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating items:', error);
      toast.error('Failed to update items');
    }
  };

  const handleBulkDelete = async () => {
    const { type } = bulkDeleteDialog;
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';
    
    const selectedIds = type === 'reason' ? Array.from(selectedReasons)
      : type === 'tie-in' ? Array.from(selectedTieInScopes)
      : Array.from(selectedMOCScopes);

    try {
      for (const id of selectedIds) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ 
        queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] 
      });
      
      // Clear selections
      if (type === 'reason') setSelectedReasons(new Set());
      else if (type === 'tie-in') setSelectedTieInScopes(new Set());
      else setSelectedMOCScopes(new Set());

      toast.success(`${selectedIds.length} item(s) deleted successfully`);
      setBulkDeleteDialog({ open: false, type: '', count: 0 });
    } catch (error) {
      console.error('Error deleting items:', error);
      toast.error('Failed to delete items');
    }
  };

  const openBulkDeleteDialog = (type: string) => {
    const count = type === 'reason' ? selectedReasons.size
      : type === 'tie-in' ? selectedTieInScopes.size
      : selectedMOCScopes.size;

    if (count === 0) {
      toast.error('No items selected');
      return;
    }

    setBulkDeleteDialog({ open: true, type, count });
  };

  // Sortable row component
  interface SortableRowProps {
    id: string;
    children: React.ReactNode;
  }

  const SortableRow: React.FC<SortableRowProps> = ({ id, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      backgroundColor: isDragging ? 'hsl(var(--accent))' : 'transparent',
    };

    return (
      <TableRow ref={setNodeRef} style={style} className={isDragging ? 'relative z-50' : ''}>
        <TableCell className="w-12">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </div>
        </TableCell>
        {children}
      </TableRow>
    );
  };

  // Filter tab content based on search
  const tabMatches = (tabName: string, content: string[]) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return tabName.toLowerCase().includes(query) || 
           content.some(item => item.toLowerCase().includes(query));
  };

  const showReasonsTab = tabMatches('reasons', allReasons.map(r => r.name));
  const showTieInTab = tabMatches('tie-in scopes', allTieInScopes.map(s => s.code + s.description));
  const showMOCTab = tabMatches('moc scopes', allMOCScopes.map(s => s.name));

  // Auto-switch to first visible tab if current tab is hidden by search
  React.useEffect(() => {
    if (searchQuery.trim()) {
      if (activeTab === 'reasons' && !showReasonsTab) {
        if (showTieInTab) setActiveTab('tie-in');
        else if (showMOCTab) setActiveTab('moc');
      } else if (activeTab === 'tie-in' && !showTieInTab) {
        if (showReasonsTab) setActiveTab('reasons');
        else if (showMOCTab) setActiveTab('moc');
      } else if (activeTab === 'moc' && !showMOCTab) {
        if (showReasonsTab) setActiveTab('reasons');
        else if (showTieInTab) setActiveTab('tie-in');
      }
    }
  }, [searchQuery, activeTab, showReasonsTab, showTieInTab, showMOCTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-r from-emerald-500/10 to-primary/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-gradient-to-l from-primary/10 to-emerald-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{
          animationDelay: '700ms'
        }} />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-t from-emerald-500/10 to-primary/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{
          animationDelay: '1400ms'
        }} />
      </div>

      <div className="relative z-10">
        <AdminHeader 
          selectedLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          translations={t}
        />

        <div className="border-t border-border/50" />

        <div className="container pt-16 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumb className="mb-14 animate-fade-in">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={onBack} className="cursor-pointer flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Home className="h-4 w-4" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink onClick={onBack} className="cursor-pointer hover:text-foreground transition-colors">
                  Administration
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">PSSR Configuration</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Soft, De-emphasized Header */}
          <div className="mb-16 text-center animate-fade-in">
            <h1 className="text-xl md:text-2xl font-normal tracking-wide mb-3 text-muted-foreground/80">
              PSSR Configuration
            </h1>
            <p className="text-muted-foreground/60 text-sm max-w-2xl mx-auto leading-relaxed">
              Manage PSSR reasons, tie-in scopes, and Management of Change options
            </p>
          </div>

          {/* Enhanced Search Bar */}
          <div className="mb-16 animate-scale-in">
            <div className="relative max-w-xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-primary/10 rounded-2xl blur-xl" />
              <div className="relative bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-2xl shadow-lg hover:border-emerald-500/30 transition-colors">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search configuration settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 pr-14 h-16 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-muted rounded-xl"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-3 text-center animate-fade-in">
                Found {[showReasonsTab, showTieInTab, showMOCTab].filter(Boolean).length} {[showReasonsTab, showTieInTab, showMOCTab].filter(Boolean).length === 1 ? 'section' : 'sections'}
              </p>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
            {/* Modern Tab Navigation */}
            <div className="flex justify-center">
              <TabsList className="inline-flex h-14 items-center justify-center rounded-2xl bg-card/80 backdrop-blur-sm p-1.5 text-muted-foreground shadow-lg border animate-scale-in">
                {showReasonsTab && (
                  <TabsTrigger 
                    value="reasons" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-accent/50"
                  >
                    PSSR Reasons
                  </TabsTrigger>
                )}
                {showTieInTab && (
                  <TabsTrigger 
                    value="tie-in"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-accent/50"
                  >
                    Tie-in Scopes
                  </TabsTrigger>
                )}
                {showMOCTab && (
                  <TabsTrigger 
                    value="moc"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md hover:bg-accent/50"
                  >
                    MOC Scopes
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

          {/* PSSR Reasons Tab */}
          <TabsContent value="reasons" className="animate-fade-in mt-0">
            <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-card to-card/50 py-8 px-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle>PSSR Reasons</CardTitle>
                    <CardDescription>Manage available reasons for creating a PSSR</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setEditDialog({ open: true, type: 'reason', item: {} })}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reason
                  </Button>
                </div>
                {selectedReasons.size > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
                    <span className="text-sm text-muted-foreground">
                      {selectedReasons.size} item(s) selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('reason', true)}
                        className="h-8"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Enable
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('reason', false)}
                        className="h-8"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Disable
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openBulkDeleteDialog('reason')}
                        className="h-8"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event) => handleDragStart(event, 'reason')}
                  onDragEnd={(event) => handleDragEnd(event, 'reason')}
                >
                  <SortableContext
                    items={allReasons.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={allReasons.length > 0 && selectedReasons.size === allReasons.length}
                              onCheckedChange={(checked) => toggleSelectAll('reason', checked as boolean)}
                            />
                          </TableHead>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allReasons.map((reason) => (
                          <SortableRow key={reason.id} id={reason.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedReasons.has(reason.id)}
                                onCheckedChange={() => toggleSelectItem('reason', reason.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{reason.display_order}</TableCell>
                            <TableCell>{reason.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={reason.is_active ? "default" : "secondary"}
                                className="cursor-pointer"
                                onClick={() => handleToggleActive('reason', reason.id, reason.is_active)}
                              >
                                {reason.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                {reason.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditDialog({ open: true, type: 'reason', item: reason })}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteDialog({ open: true, type: 'reason', id: reason.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </SortableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tie-in Scopes Tab */}
          <TabsContent value="tie-in" className="animate-fade-in mt-0">
            <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-card to-card/50 py-8 px-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle>Tie-in Scopes</CardTitle>
                    <CardDescription>Manage advanced tie-in scope options</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setEditDialog({ open: true, type: 'tie-in', item: {} })}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scope
                  </Button>
                </div>
                {selectedTieInScopes.size > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
                    <span className="text-sm text-muted-foreground">
                      {selectedTieInScopes.size} item(s) selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('tie-in', true)}
                        className="h-8"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Enable
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('tie-in', false)}
                        className="h-8"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Disable
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openBulkDeleteDialog('tie-in')}
                        className="h-8"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event) => handleDragStart(event, 'tie-in')}
                  onDragEnd={(event) => handleDragEnd(event, 'tie-in')}
                >
                  <SortableContext
                    items={allTieInScopes.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={allTieInScopes.length > 0 && selectedTieInScopes.size === allTieInScopes.length}
                              onCheckedChange={(checked) => toggleSelectAll('tie-in', checked as boolean)}
                            />
                          </TableHead>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTieInScopes.map((scope) => (
                          <SortableRow key={scope.id} id={scope.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTieInScopes.has(scope.id)}
                                onCheckedChange={() => toggleSelectItem('tie-in', scope.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{scope.display_order}</TableCell>
                            <TableCell className="font-semibold">{scope.code}</TableCell>
                            <TableCell className="max-w-md truncate">{scope.description}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={scope.is_active ? "default" : "secondary"}
                                className="cursor-pointer"
                                onClick={() => handleToggleActive('tie-in', scope.id, scope.is_active)}
                              >
                                {scope.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                {scope.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditDialog({ open: true, type: 'tie-in', item: scope })}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteDialog({ open: true, type: 'tie-in', id: scope.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </SortableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MOC Scopes Tab */}
          <TabsContent value="moc" className="animate-fade-in mt-0">
            <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-card to-card/50 py-8 px-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle>MOC Scopes</CardTitle>
                    <CardDescription>Manage Management of Change scope options</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setEditDialog({ open: true, type: 'moc', item: {} })}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scope
                  </Button>
                </div>
                {selectedMOCScopes.size > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
                    <span className="text-sm text-muted-foreground">
                      {selectedMOCScopes.size} item(s) selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('moc', true)}
                        className="h-8"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Enable
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('moc', false)}
                        className="h-8"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Disable
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openBulkDeleteDialog('moc')}
                        className="h-8"
                      >
                        <Trash className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(event) => handleDragStart(event, 'moc')}
                  onDragEnd={(event) => handleDragEnd(event, 'moc')}
                >
                  <SortableContext
                    items={allMOCScopes.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={allMOCScopes.length > 0 && selectedMOCScopes.size === allMOCScopes.length}
                              onCheckedChange={(checked) => toggleSelectAll('moc', checked as boolean)}
                            />
                          </TableHead>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allMOCScopes.map((scope) => (
                          <SortableRow key={scope.id} id={scope.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedMOCScopes.has(scope.id)}
                                onCheckedChange={() => toggleSelectItem('moc', scope.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{scope.display_order}</TableCell>
                            <TableCell>{scope.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={scope.is_active ? "default" : "secondary"}
                                className="cursor-pointer"
                                onClick={() => handleToggleActive('moc', scope.id, scope.is_active)}
                              >
                                {scope.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                {scope.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditDialog({ open: true, type: 'moc', item: scope })}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteDialog({ open: true, type: 'moc', id: scope.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </SortableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit/Create Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editDialog.item?.id ? 'Edit' : 'Add'} {editDialog.type === 'reason' ? 'Reason' : editDialog.type === 'tie-in' ? 'Tie-in Scope' : 'MOC Scope'}
              </DialogTitle>
              <DialogDescription>
                {editDialog.item?.id ? 'Update' : 'Create a new'} {editDialog.type} entry
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {editDialog.type === 'tie-in' ? (
                <>
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={editDialog.item?.code || ''}
                      onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, code: e.target.value } })}
                      placeholder="e.g., MECH, PACO, ELECT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editDialog.item?.description || ''}
                      onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, description: e.target.value } })}
                      placeholder="Detailed description of the scope"
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editDialog.item?.name || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, name: e.target.value } })}
                    placeholder="Enter name"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog({ open: false, type: '', item: null })}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this item? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: '', id: '' })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={bulkDeleteDialog.open} onOpenChange={(open) => setBulkDeleteDialog({ ...bulkDeleteDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Bulk Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {bulkDeleteDialog.count} item(s)? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDeleteDialog({ open: false, type: '', count: 0 })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                Delete {bulkDeleteDialog.count} Item(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
};

export default PSSRSettingsManagement;
