import React, { useState, useMemo } from 'react';
import { InlineEditableCell } from '@/components/ui/InlineEditableCell';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/skeleton-loader';
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
import { Home, Plus, Edit2, Trash2, Search, X, GripVertical, Trash, Check, Settings, Cog, UserCheck, FileText, ClipboardList } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePSSRReasons, usePSSRReasonSubOptions, usePSSRTieInScopes, usePSSRMOCScopes, PSSRReason, PSSRTieInScope, PSSRMOCScope } from '@/hooks/usePSSRReasons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ThemeToggle } from './admin/ThemeToggle';
import LanguageSelector from './admin/LanguageSelector';
import UserProfileDropdown from './admin/UserProfileDropdown';
import OrshLogo from './ui/OrshLogo';
import { getCurrentTranslations } from '@/utils/translations';
import AdminHeader from './admin/AdminHeader';
import PSSRConfigurationMatrix from './pssr/PSSRConfigurationMatrix';
import ChecklistItemConfigurationMatrix from './pssr/ChecklistItemConfigurationMatrix';
import ManageChecklistPage from './ManageChecklistPage';
import ChecklistManagementPage from './ChecklistManagementPage';
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
  const [activeTab, setActiveTab] = useState('configuration');
  
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

  // Inline edit handlers
  const handleInlineEdit = async (type: string, id: string, field: string, newValue: string) => {
    const tableName = type === 'reason' ? 'pssr_reasons' 
      : type === 'tie-in' ? 'pssr_tie_in_scopes' 
      : 'pssr_moc_scopes';

    try {
      const updateData = { [field]: newValue.trim() };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ 
        queryKey: [type === 'reason' ? 'pssr-reasons-all' : type === 'tie-in' ? 'pssr-tie-in-scopes-all' : 'pssr-moc-scopes-all'] 
      });
      toast.success('Updated successfully');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
      throw error;
    }
  };

  // Validation functions
  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'Name cannot be empty' };
    }
    if (trimmed.length > 100) {
      return { valid: false, error: 'Name must be less than 100 characters' };
    }
    return { valid: true };
  };

  const validateCode = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'Code cannot be empty' };
    }
    if (trimmed.length > 20) {
      return { valid: false, error: 'Code must be less than 20 characters' };
    }
    return { valid: true };
  };

  const validateDescription = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { valid: false, error: 'Description cannot be empty' };
    }
    if (trimmed.length > 500) {
      return { valid: false, error: 'Description must be less than 500 characters' };
    }
    return { valid: true };
  };

  // Handle edit/create from modal
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
      transition: transition || 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease',
      opacity: isDragging ? 0.5 : 1,
      backgroundColor: isDragging ? 'hsl(var(--accent))' : 'transparent',
    };

    return (
      <TableRow 
        ref={setNodeRef} 
        style={style} 
        className={`
          transition-all duration-300 hover:bg-accent/30 
          ${isDragging ? 'relative z-50 shadow-2xl scale-105 rounded-lg' : ''}
        `}
      >
        <TableCell className="w-12">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-2 rounded-md hover:bg-accent/50 transition-all duration-300 hover:scale-110"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors duration-300" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="animate-scale-up">
              <p>Drag to reorder</p>
            </TooltipContent>
          </Tooltip>
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

  const showTieInTab = tabMatches('tie-in scopes', allTieInScopes.map(s => s.code + s.description));
  const showMOCTab = tabMatches('moc scopes', allMOCScopes.map(s => s.name));

  // Auto-switch to first visible tab if current tab is hidden by search
  React.useEffect(() => {
    if (searchQuery.trim()) {
      if (activeTab === 'tie-in' && !showTieInTab) {
        if (showMOCTab) setActiveTab('moc');
        else setActiveTab('configuration');
      } else if (activeTab === 'moc' && !showMOCTab) {
        if (showTieInTab) setActiveTab('tie-in');
        else setActiveTab('configuration');
      }
    }
  }, [searchQuery, activeTab, showTieInTab, showMOCTab]);

  return (
    <div className="flex-1 overflow-auto">
      <AnimatedBackground>
        <div className="relative z-10">
          <AdminHeader 
            icon={<Settings className="w-6 h-6" />} 
            iconGradient="from-emerald-500 to-emerald-600"
            title="PSSR Configuration" 
            description="Manage PSSR reasons, tie-in scopes, and Management of Change options"
            customBreadcrumbs={[
              { label: 'Home', path: '/', onClick: onBack },
              { label: 'Administration', path: '/admin-tools', onClick: onBack },
              { label: 'PSSR Configuration', path: '/admin-tools', onClick: () => {} }
            ]}
          />

          <TooltipProvider delayDuration={200}>
            <div className="container pt-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Modern Tab Navigation */}
            <TabsList className="inline-flex h-12 w-full overflow-x-auto bg-muted/30 backdrop-blur-sm p-1 rounded-xl border border-border/40 shadow-fluent-sm gap-2 scrollbar-none">
              <TabsTrigger 
                value="configuration"
                className="flex-shrink-0 whitespace-nowrap px-4 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-fluent-sm transition-all duration-200"
              >
                <Cog className="h-4 w-4 mr-1.5" />
                PSSR Reasons
              </TabsTrigger>
              <TabsTrigger
                value="full-checklists"
                className="flex-shrink-0 whitespace-nowrap px-4 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-fluent-sm transition-all duration-200"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Checklist
              </TabsTrigger>
              <TabsTrigger
                value="checklists"
                className="flex-shrink-0 whitespace-nowrap px-4 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-fluent-sm transition-all duration-200"
              >
                <ClipboardList className="h-4 w-4 mr-1.5" />
                Items
              </TabsTrigger>
              <TabsTrigger 
                value="item-config"
                className="flex-shrink-0 whitespace-nowrap px-4 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-fluent-sm transition-all duration-200"
              >
                <UserCheck className="h-4 w-4 mr-1.5" />
                Item Approvers
              </TabsTrigger>
              {showTieInTab && (
                <TabsTrigger 
                  value="tie-in"
                  className="flex-shrink-0 whitespace-nowrap px-4 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-fluent-sm transition-all duration-200"
                >
                  Tie-in Scopes
                </TabsTrigger>
              )}
              {showMOCTab && (
                <TabsTrigger 
                  value="moc"
                  className="flex-shrink-0 whitespace-nowrap px-4 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-fluent-sm transition-all duration-200"
                >
                  MOC Scopes
                </TabsTrigger>
              )}
            </TabsList>

          {/* Tie-in Scopes Tab */}
          <TabsContent value="tie-in" className="animate-fade-in-up">
            <Card className="fluent-card border-border/40">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/5 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle className="text-2xl font-semibold">Tie-in Scopes</CardTitle>
                    <CardDescription className="text-base">Manage advanced tie-in scope options</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setEditDialog({ open: true, type: 'tie-in', item: {} })}
                    className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scope
                  </Button>
                </div>
                {selectedTieInScopes.size > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl animate-scale-in">
                    <span className="text-sm font-medium text-foreground">
                      {selectedTieInScopes.size} item{selectedTieInScopes.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('tie-in', true)}
                        className="fluent-button shadow-fluent-xs"
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Enable
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('tie-in', false)}
                        className="fluent-button shadow-fluent-xs"
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Disable
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openBulkDeleteDialog('tie-in')}
                        className="fluent-button shadow-fluent-xs"
                      >
                        <Trash className="h-4 w-4 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {allTieInScopes.length === 0 ? (
                  <div className="p-6">
                    <TableSkeleton rows={5} columns={7} />
                  </div>
                ) : (
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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-border/40 hover:bg-transparent">
                              <TableHead className="w-14 pl-6">
                                <Checkbox
                                  checked={allTieInScopes.length > 0 && selectedTieInScopes.size === allTieInScopes.length}
                                  onCheckedChange={(checked) => toggleSelectAll('tie-in', checked as boolean)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                              </TableHead>
                              <TableHead className="w-14"></TableHead>
                              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</TableHead>
                              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</TableHead>
                              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</TableHead>
                              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allTieInScopes.map((scope) => (
                              <SortableRow key={scope.id} id={scope.id}>
                                <TableCell className="pl-6">
                                  <Checkbox
                                    checked={selectedTieInScopes.has(scope.id)}
                                    onCheckedChange={() => toggleSelectItem('tie-in', scope.id)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-muted-foreground">
                                  #{scope.display_order}
                                </TableCell>
                                <TableCell className="font-medium text-foreground">
                                  <InlineEditableCell
                                    value={scope.code}
                                    onSave={(newValue) => handleInlineEdit('tie-in', scope.id, 'code', newValue)}
                                    placeholder="Enter code"
                                    maxLength={20}
                                    validate={validateCode}
                                  />
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <InlineEditableCell
                                    value={scope.description}
                                    onSave={(newValue) => handleInlineEdit('tie-in', scope.id, 'description', newValue)}
                                    type="textarea"
                                    placeholder="Enter description"
                                    maxLength={500}
                                    validate={validateDescription}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant={scope.is_active ? "default" : "secondary"}
                                        className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shadow-fluent-xs font-medium"
                                        onClick={() => handleToggleActive('tie-in', scope.id, scope.is_active)}
                                      >
                                        {scope.is_active ? 'Active' : 'Inactive'}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-popover border shadow-fluent-md">
                                      <p className="text-sm">Click to {scope.is_active ? 'disable' : 'enable'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex items-center justify-end gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setEditDialog({ open: true, type: 'tie-in', item: scope })}
                                          className="h-9 w-9 hover:bg-accent/50 transition-all duration-200"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-popover border shadow-fluent-md">
                                        <p className="text-sm">Edit scope</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => setDeleteDialog({ open: true, type: 'tie-in', id: scope.id })}
                                          className="h-9 w-9 text-destructive hover:bg-destructive/10 transition-all duration-200"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-popover border shadow-fluent-md">
                                        <p className="text-sm">Delete scope</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </SortableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                  </SortableContext>
                </DndContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MOC Scopes Tab */}
          <TabsContent value="moc" className="animate-fade-in-up">
            <Card className="fluent-card border-border/40">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/5 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle className="text-2xl font-semibold">MOC Scopes</CardTitle>
                    <CardDescription className="text-base">Manage Management of Change scope options</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setEditDialog({ open: true, type: 'moc', item: {} })}
                    className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scope
                  </Button>
                </div>
                {selectedMOCScopes.size > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl animate-scale-in">
                    <span className="text-sm font-medium text-foreground">
                      {selectedMOCScopes.size} item{selectedMOCScopes.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('moc', true)}
                        className="fluent-button shadow-fluent-xs"
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Enable
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkToggleActive('moc', false)}
                        className="fluent-button shadow-fluent-xs"
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Disable
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openBulkDeleteDialog('moc')}
                        className="fluent-button shadow-fluent-xs"
                      >
                        <Trash className="h-4 w-4 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
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
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border/40 hover:bg-transparent">
                            <TableHead className="w-14 pl-6">
                              <Checkbox
                                checked={allMOCScopes.length > 0 && selectedMOCScopes.size === allMOCScopes.length}
                                onCheckedChange={(checked) => toggleSelectAll('moc', checked as boolean)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </TableHead>
                            <TableHead className="w-14"></TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allMOCScopes.map((scope) => (
                            <SortableRow key={scope.id} id={scope.id}>
                              <TableCell className="pl-6">
                                <Checkbox
                                  checked={selectedMOCScopes.has(scope.id)}
                                  onCheckedChange={() => toggleSelectItem('moc', scope.id)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                              </TableCell>
                              <TableCell className="text-sm font-semibold text-muted-foreground">
                                #{scope.display_order}
                              </TableCell>
                              <TableCell className="font-medium text-foreground">
                                <InlineEditableCell
                                  value={scope.name}
                                  onSave={(newValue) => handleInlineEdit('moc', scope.id, 'name', newValue)}
                                  placeholder="Enter MOC scope name"
                                  maxLength={100}
                                  validate={validateName}
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant={scope.is_active ? "default" : "secondary"}
                                      className="cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shadow-fluent-xs font-medium"
                                      onClick={() => handleToggleActive('moc', scope.id, scope.is_active)}
                                    >
                                      {scope.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-popover border shadow-fluent-md">
                                    <p className="text-sm">Click to {scope.is_active ? 'disable' : 'enable'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditDialog({ open: true, type: 'moc', item: scope })}
                                        className="h-9 w-9 hover:bg-accent/50 transition-all duration-200"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-popover border shadow-fluent-md">
                                      <p className="text-sm">Edit scope</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeleteDialog({ open: true, type: 'moc', id: scope.id })}
                                        className="h-9 w-9 text-destructive hover:bg-destructive/10 transition-all duration-200"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-popover border shadow-fluent-md">
                                      <p className="text-sm">Delete scope</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </SortableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Matrix Tab */}
          <TabsContent value="configuration" className="animate-fade-in-up">
            <PSSRConfigurationMatrix />
          </TabsContent>

          {/* Full Checklists Tab */}
          <TabsContent value="full-checklists" className="animate-fade-in-up">
            <ManageChecklistPage onBack={() => setActiveTab('configuration')} selectedLanguage={currentLanguage} embedded={true} />
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="checklists" className="animate-fade-in-up">
            <ChecklistManagementPage onBack={() => setActiveTab('configuration')} selectedLanguage={currentLanguage} />
          </TabsContent>
        </Tabs>

        {/* Edit/Create Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
          <DialogContent className="sm:max-w-lg no-hover-effects">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-semibold">
                {editDialog.item?.id ? 'Edit' : 'Add New'} {editDialog.type === 'reason' ? 'PSSR Reason' : editDialog.type === 'tie-in' ? 'Tie-in Scope' : 'MOC Scope'}
              </DialogTitle>
              <DialogDescription className="text-base">
                {editDialog.item?.id ? 'Update the details below to modify this' : 'Fill in the details below to create a new'} {editDialog.type} entry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {editDialog.type === 'tie-in' ? (
                <>
                  <div className="space-y-2.5">
                    <Label htmlFor="code" className="text-sm font-semibold">Code</Label>
                    <Input
                      id="code"
                      value={editDialog.item?.code || ''}
                      onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, code: e.target.value } })}
                      placeholder="e.g., MECH, PACO, ELECT"
                      className="h-11 bg-background/50"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                    <Textarea
                      id="description"
                      value={editDialog.item?.description || ''}
                      onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, description: e.target.value } })}
                      placeholder="Provide a detailed description of this scope..."
                      rows={4}
                      className="bg-background/50 resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
                  <Input
                    id="name"
                    value={editDialog.item?.name || ''}
                    onChange={(e) => setEditDialog({ ...editDialog, item: { ...editDialog.item, name: e.target.value } })}
                    placeholder="Enter a descriptive name..."
                    className="h-11 bg-background/50"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setEditDialog({ open: false, type: '', item: null })}
                className="fluent-button"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
              >
                {editDialog.item?.id ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
          <DialogContent className="sm:max-w-md no-hover-effects">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-semibold text-destructive">Confirm Deletion</DialogTitle>
              <DialogDescription className="text-base">
                Are you sure you want to delete this item? This action cannot be undone and the item will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialog({ open: false, type: '', id: '' })}
                className="fluent-button"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
              >
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={bulkDeleteDialog.open} onOpenChange={(open) => setBulkDeleteDialog({ ...bulkDeleteDialog, open })}>
          <DialogContent className="sm:max-w-md no-hover-effects">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-semibold text-destructive">Confirm Bulk Deletion</DialogTitle>
              <DialogDescription className="text-base">
                Are you sure you want to delete <span className="font-semibold text-foreground">{bulkDeleteDialog.count} item{bulkDeleteDialog.count !== 1 ? 's' : ''}</span>? This action cannot be undone and all selected items will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setBulkDeleteDialog({ open: false, type: '', count: 0 })}
                className="fluent-button"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
              >
                Delete {bulkDeleteDialog.count} Item{bulkDeleteDialog.count !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
            </div>
          </TooltipProvider>
        </div>
      </AnimatedBackground>
    </div>
  );
};

export default PSSRSettingsManagement;
