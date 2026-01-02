import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, Save, X, Lock, CheckCircle2, Info, Loader2, Plus, Trash2, FileText, Clock, AlertCircle, Building2, Wrench, ChevronDown, ChevronRight, Edit2, Users, Settings2 } from 'lucide-react';
import { InlineEditableCell } from '@/components/ui/InlineEditableCell';
import { usePSSRReasonConfigurations, useUpsertPSSRReasonConfiguration, ConfigurationWithDetails } from '@/hooks/usePSSRReasonConfiguration';
import { useRoles } from '@/hooks/useRoles';
import { 
  usePSSRReasonCategories, 
  usePSSRDeliveryParties,
  useCreatePSSRReasonCategory,
  useUpdatePSSRReasonCategory,
  useDeletePSSRReasonCategory,
  useCreatePSSRDeliveryParty,
  useUpdatePSSRDeliveryParty,
  PSSRReasonCategory,
  PSSRDeliveryParty,
} from '@/hooks/usePSSRReasonCategories';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AddPSSRReasonWizard from './AddPSSRReasonWizard';
import EditPSSRReasonOverlay from './EditPSSRReasonOverlay';
import { PSSRReasonStatus } from '@/hooks/usePSSRReasons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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

interface LocalConfiguration {
  reason_id: string;
  reason_name: string;
  pssr_approver_role_ids: string[];
  sof_approver_role_ids: string[];
  isDirty: boolean;
  is_active: boolean;
  display_order: number;
  category_id: string | null;
  delivery_party_id: string | null;
  status: PSSRReasonStatus;
  reason_approver_role_ids: string[];
}

// Category Icon Helper Component
const CategoryIcon: React.FC<{ icon: string | null }> = ({ icon }) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Building2': <Building2 className="h-4 w-4 text-primary" />,
    'AlertTriangle': <AlertTriangle className="h-4 w-4 text-amber-500" />,
    'Wrench': <Wrench className="h-4 w-4 text-blue-500" />,
    'FileText': <FileText className="h-4 w-4 text-muted-foreground" />,
  };
  return <>{iconMap[icon || ''] || null}</>;
};

const STATUS_CONFIG: Record<PSSRReasonStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  awaiting_approval: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-300' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  in_use: { label: 'In Use', className: 'bg-blue-100 text-blue-700' },
};

// Sortable Row Component
interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  isDirty: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({ id, children, isDirty }) => {
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
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:bg-muted/50
        ${isDirty ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}
        ${isDragging ? 'relative z-50 shadow-2xl scale-[1.02] bg-card' : ''}
      `}
    >
      {children}
    </TableRow>
  );
};

const PSSRConfigurationMatrix: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: configurations = [], isLoading: isLoadingConfigs } = usePSSRReasonConfigurations();
  const { roles = [], isLoading: isLoadingRoles } = useRoles();
  const { data: categories = [], isLoading: isLoadingCategories } = usePSSRReasonCategories();
  const { data: deliveryParties = [], isLoading: isLoadingParties } = usePSSRDeliveryParties();
  const upsertMutation = useUpsertPSSRReasonConfiguration();
  
  // Category management mutations
  const createCategory = useCreatePSSRReasonCategory();
  const updateCategory = useUpdatePSSRReasonCategory();
  const deleteCategory = useDeletePSSRReasonCategory();
  const createDeliveryParty = useCreatePSSRDeliveryParty();
  const updateDeliveryParty = useUpdatePSSRDeliveryParty();

  const [localConfigs, setLocalConfigs] = useState<LocalConfiguration[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Add Reason Wizard State
  const [showAddReasonWizard, setShowAddReasonWizard] = useState(false);
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | null>(null);

  // Delete Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reasonId: string | null; reasonName: string }>({
    open: false,
    reasonId: null,
    reasonName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Category Delete Dialog State
  const [categoryDeleteDialog, setCategoryDeleteDialog] = useState<{ open: boolean; categoryId: string | null; categoryName: string }>({
    open: false,
    categoryId: null,
    categoryName: '',
  });

  // Category Edit Dialog State
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: Partial<PSSRReasonCategory>;
  }>({ open: false, mode: 'create', data: {} });

  // Delivery Party Dialog State
  const [partyDialog, setPartyDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    data: Partial<PSSRDeliveryParty>;
  }>({ open: false, mode: 'create', data: {} });

  // Delivery Parties section expanded state
  const [showDeliveryParties, setShowDeliveryParties] = useState(false);

  // Reason Details Overlay State
  const [editOverlay, setEditOverlay] = useState<{
    open: boolean;
    config: LocalConfiguration | null;
  }>({ open: false, config: null });

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);

  // Collapsible category state - all expanded by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string | null>>(new Set());

  // Initialize expanded categories when categories load
  useEffect(() => {
    if (categories.length > 0) {
      const allCategoryIds = new Set<string | null>(categories.map(c => c.id));
      allCategoryIds.add(null); // Include uncategorized
      setExpandedCategories(allCategoryIds);
    }
  }, [categories]);

  const toggleCategory = (categoryId: string | null) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

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

  // Initialize local configs from fetched data
  useEffect(() => {
    if (configurations.length > 0) {
      setLocalConfigs(configurations.map(config => ({
        reason_id: config.reason_id,
        reason_name: config.reason?.name || '',
        pssr_approver_role_ids: config.pssr_approver_role_ids || [],
        sof_approver_role_ids: config.sof_approver_role_ids || [],
        isDirty: false,
        is_active: config.reason?.is_active ?? true,
        display_order: config.reason?.display_order ?? 0,
        category_id: (config.reason as any)?.category_id || null,
        delivery_party_id: (config.reason as any)?.delivery_party_id || null,
        status: ((config.reason as any)?.status || 'draft') as PSSRReasonStatus,
        reason_approver_role_ids: (config.reason as any)?.reason_approver_role_ids || [],
      })));
    }
  }, [configurations]);

  const hasUnsavedChanges = useMemo(() => 
    localConfigs.some(c => c.isDirty), 
    [localConfigs]
  );

  // Sort configs by display_order
  const sortedConfigs = useMemo(() => 
    [...localConfigs].sort((a, b) => a.display_order - b.display_order),
    [localConfigs]
  );

  // Group configs by category
  const groupedConfigs = useMemo(() => {
    const groups = new Map<string | null, LocalConfiguration[]>();
    
    // Initialize groups in category display order
    const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);
    sortedCategories.forEach(cat => {
      groups.set(cat.id, []);
    });
    groups.set(null, []); // For uncategorized reasons
    
    // Assign configs to groups
    sortedConfigs.forEach(config => {
      const categoryId = config.category_id;
      if (groups.has(categoryId)) {
        groups.get(categoryId)!.push(config);
      } else {
        groups.get(null)!.push(config);
      }
    });
    
    return groups;
  }, [sortedConfigs, categories]);

  const handlePSSRApproverToggle = (reasonId: string, roleId: string) => {
    setLocalConfigs(prev => prev.map(config => {
      if (config.reason_id !== reasonId) return config;
      
      const currentRoles = config.pssr_approver_role_ids;
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter(id => id !== roleId)
        : [...currentRoles, roleId];
      
      // Remove from SoF if added to PSSR
      const newSofRoles = config.sof_approver_role_ids.filter(id => !newRoles.includes(id));
      
      return { 
        ...config, 
        pssr_approver_role_ids: newRoles,
        sof_approver_role_ids: newSofRoles,
        isDirty: true 
      };
    }));
  };

  const handleSoFApproverToggle = (reasonId: string, roleId: string) => {
    setLocalConfigs(prev => prev.map(config => {
      if (config.reason_id !== reasonId) return config;
      
      // Check if role is already a PSSR approver
      if (config.pssr_approver_role_ids.includes(roleId)) {
        toast.error('This role is already assigned as a PSSR Approver');
        return config;
      }
      
      const currentRoles = config.sof_approver_role_ids;
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter(id => id !== roleId)
        : [...currentRoles, roleId];
      
      return { ...config, sof_approver_role_ids: newRoles, isDirty: true };
    }));
  };

  const handleSave = async () => {
    const dirtyConfigs = localConfigs.filter(c => c.isDirty);
    
    if (dirtyConfigs.length === 0) {
      toast.info('No changes to save');
      return;
    }

    try {
      await upsertMutation.mutateAsync(dirtyConfigs.map(c => ({
        reason_id: c.reason_id,
        pssr_approver_role_ids: c.pssr_approver_role_ids,
        sof_approver_role_ids: c.sof_approver_role_ids,
      })));

      setLocalConfigs(prev => prev.map(c => ({ ...c, isDirty: false })));
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Failed to save configurations:', error);
    }
  };

  const handleCancelChanges = () => {
    setLocalConfigs(configurations.map(config => ({
      reason_id: config.reason_id,
      reason_name: config.reason?.name || '',
      pssr_approver_role_ids: config.pssr_approver_role_ids || [],
      sof_approver_role_ids: config.sof_approver_role_ids || [],
      isDirty: false,
      is_active: config.reason?.is_active ?? true,
      display_order: config.reason?.display_order ?? 0,
      category_id: (config.reason as any)?.category_id || null,
      delivery_party_id: (config.reason as any)?.delivery_party_id || null,
      status: ((config.reason as any)?.status || 'draft') as PSSRReasonStatus,
      reason_approver_role_ids: (config.reason as any)?.reason_approver_role_ids || [],
    })));
    toast.info('Changes discarded');
  };


  // Inline edit reason name
  const handleInlineEditName = async (reasonId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('pssr_reasons')
        .update({ name: newName.trim() })
        .eq('id', reasonId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      toast.success('Reason name updated');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
      throw error;
    }
  };

  // Toggle active status
  const handleToggleActive = async (reasonId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pssr_reasons')
        .update({ is_active: !currentStatus })
        .eq('id', reasonId);

      if (error) throw error;

      setLocalConfigs(prev => prev.map(config => 
        config.reason_id === reasonId 
          ? { ...config, is_active: !currentStatus }
          : config
      ));

      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      toast.success(`Reason ${!currentStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  // Delete reason
  const handleDeleteReason = async () => {
    if (!deleteDialog.reasonId) return;
    
    setIsDeleting(true);
    try {
      // Delete configuration first (foreign key)
      const { error: configError } = await supabase
        .from('pssr_reason_configuration')
        .delete()
        .eq('reason_id', deleteDialog.reasonId);

      if (configError) throw configError;

      // Delete the reason
      const { error: reasonError } = await supabase
        .from('pssr_reasons')
        .delete()
        .eq('id', deleteDialog.reasonId);

      if (reasonError) throw reasonError;

      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      toast.success('PSSR Reason deleted successfully');
      setDeleteDialog({ open: false, reasonId: null, reasonName: '' });
    } catch (error: any) {
      console.error('Error deleting reason:', error);
      toast.error(error.message || 'Failed to delete reason');
    } finally {
      setIsDeleting(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = sortedConfigs.findIndex(c => c.reason_id === active.id);
    const newIndex = sortedConfigs.findIndex(c => c.reason_id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedConfigs = arrayMove(sortedConfigs, oldIndex, newIndex);

    try {
      // Update display_order for all affected items
      const updates = reorderedConfigs.map((config, index) => ({
        id: config.reason_id,
        display_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('pssr_reasons')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      toast.success('Order updated successfully');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to update order');
    }
  };

  // Validation for name
  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return { valid: false, error: 'Name cannot be empty' };
    if (trimmed.length > 100) return { valid: false, error: 'Name must be less than 100 characters' };
    return { valid: true };
  };

  // Category handlers
  const handleCategorySubmit = async () => {
    const { mode, data } = categoryDialog;
    
    if (!data.name?.trim() || !data.code?.trim()) {
      toast.error('Name and code are required');
      return;
    }

    try {
      if (mode === 'edit' && data.id) {
        await updateCategory.mutateAsync({
          id: data.id,
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
          requires_delivery_party: data.requires_delivery_party || false,
          allows_free_text: data.allows_free_text || false,
          icon: data.icon || null,
        });
      } else {
        const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
        await createCategory.mutateAsync({
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
          display_order: maxOrder + 1,
          is_active: true,
          requires_delivery_party: data.requires_delivery_party || false,
          allows_free_text: data.allows_free_text || false,
          icon: data.icon || null,
        });
      }
      setCategoryDialog({ open: false, mode: 'create', data: {} });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryDeleteDialog.categoryId) return;
    
    try {
      await deleteCategory.mutateAsync(categoryDeleteDialog.categoryId);
      setCategoryDeleteDialog({ open: false, categoryId: null, categoryName: '' });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggleCategoryActive = async (category: PSSRReasonCategory) => {
    await updateCategory.mutateAsync({
      id: category.id,
      is_active: !category.is_active,
    });
  };

  // Delivery Party handlers
  const handlePartySubmit = async () => {
    const { mode, data } = partyDialog;
    
    if (!data.name?.trim() || !data.code?.trim()) {
      toast.error('Name and code are required');
      return;
    }

    try {
      if (mode === 'edit' && data.id) {
        await updateDeliveryParty.mutateAsync({
          id: data.id,
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
        });
      } else {
        const maxOrder = Math.max(...deliveryParties.map(p => p.display_order), 0);
        await createDeliveryParty.mutateAsync({
          name: data.name.trim(),
          code: data.code.trim(),
          description: data.description?.trim() || null,
          display_order: maxOrder + 1,
          is_active: true,
        });
      }
      setPartyDialog({ open: false, mode: 'create', data: {} });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Open add reason with preselected category
  const handleAddReasonToCategory = (categoryId: string) => {
    setPreselectedCategoryId(categoryId);
    setShowAddReasonWizard(true);
  };

  const isLoading = isLoadingConfigs || isLoadingRoles || isLoadingCategories || isLoadingParties;

  if (isLoading) {
    return (
      <Card className="fluent-card border-border/40">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="fluent-card border-border/40">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/5 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-semibold">PSSR Reasons</CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                variant="outline"
                onClick={() => setShowDeliveryParties(!showDeliveryParties)}
                className="fluent-button"
              >
                <Users className="h-4 w-4 mr-2" />
                Delivery Parties
                {showDeliveryParties ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setCategoryDialog({ open: true, mode: 'create', data: {} })}
                className="fluent-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setPreselectedCategoryId(null);
                  setShowAddReasonWizard(true);
                }}
                className="fluent-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reason
              </Button>
              {hasUnsavedChanges && (
                <Button 
                  variant="outline"
                  onClick={handleCancelChanges}
                  className="fluent-button"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Warning Banner - only show when there are configs */}
          {sortedConfigs.length > 0 && (
            <Alert className="mt-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Changes to this configuration will only apply to newly created PSSRs. Existing PSSRs will not be affected.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        {/* Delivery Parties Collapsible Section */}
        <Collapsible open={showDeliveryParties} onOpenChange={setShowDeliveryParties}>
          <CollapsibleContent className="border-b border-border/40">
            <div className="p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">Delivery Parties</h3>
                  <p className="text-xs text-muted-foreground">Manage delivery party options (P&E, BFM)</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPartyDialog({ open: true, mode: 'create', data: {} })}
                  className="fluent-button"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Party
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {deliveryParties.map((party) => (
                  <div
                    key={party.id}
                    className="flex items-center justify-between p-3 border border-border/40 rounded-lg bg-card/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {party.code}
                      </Badge>
                      <span className="text-sm font-medium">{party.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={party.is_active ? 'default' : 'secondary'} className="text-xs">
                        {party.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPartyDialog({ open: true, mode: 'edit', data: party })}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {deliveryParties.length === 0 && (
                  <p className="text-sm text-muted-foreground italic col-span-full py-2">No delivery parties configured</p>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedConfigs.map(c => c.reason_id)}
                strategy={verticalListSortingStrategy}
              >
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow className="border-b border-border/40 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[34%]">
                        PSSR Reason
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[8%]">
                        Status
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[20%]">
                        PSSR Approvers
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[20%]">
                        SoF Approvers
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Render categories in order */}
                    {[...categories].sort((a, b) => a.display_order - b.display_order).map((category) => {
                      const categoryConfigs = groupedConfigs.get(category.id) || [];
                      
                      return (
                        <React.Fragment key={category.id}>
                          {/* Category Header Row - Clickable to expand/collapse */}
                          <TableRow 
                            className="bg-muted/50 hover:bg-muted/70 border-t-2 border-border/60 cursor-pointer transition-colors group"
                            onClick={() => toggleCategory(category.id)}
                          >
                            <TableCell colSpan={4} className="py-3">
                              <div className="flex items-center gap-2">
                                {expandedCategories.has(category.id) ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                                )}
                                <CategoryIcon icon={category.icon} />
                                <span className="font-semibold text-sm">{category.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {categoryConfigs.length}
                                </Badge>
                                {!category.is_active && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                                )}
                                {category.requires_delivery_party && (
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    Delivery Party
                                  </Badge>
                                )}
                                
                                {/* Category action buttons */}
                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleAddReasonToCategory(category.id)}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Add reason to this category</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setCategoryDialog({ open: true, mode: 'edit', data: category })}
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit category</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleToggleCategoryActive(category)}
                                      >
                                        <Settings2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{category.is_active ? 'Deactivate' : 'Activate'}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => setCategoryDeleteDialog({ open: true, categoryId: category.id, categoryName: category.name })}
                                        disabled={categoryConfigs.length > 0}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {categoryConfigs.length > 0 ? 'Cannot delete category with reasons' : 'Delete category'}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Category's Reasons - Only show when expanded */}
                          {expandedCategories.has(category.id) && (
                            categoryConfigs.length > 0 ? (
                              categoryConfigs.map((config, index) => (
                                <SortableRow 
                                  key={config.reason_id} 
                                  id={config.reason_id}
                                  isDirty={config.isDirty}
                                >
                                  {/* Reason Name with Order Number - Clickable to open details */}
                                  <TableCell className="font-medium overflow-hidden pl-8">
                                    <div 
                                      className="flex items-center gap-2 min-w-0 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditOverlay({ open: true, config });
                                      }}
                                    >
                                      <span className="text-xs font-semibold text-muted-foreground shrink-0">{index + 1}.</span>
                                      <span className="flex-1 min-w-0 whitespace-normal break-words">
                                        {config.reason_name}
                                      </span>
                                      {config.isDirty && (
                                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 shrink-0">
                                          Modified
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>

                                  {/* Status Badge */}
                                  <TableCell>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          className={`${STATUS_CONFIG[config.status]?.className || ''} cursor-default font-medium text-xs`}
                                        >
                                          {STATUS_CONFIG[config.status]?.label || config.status}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {config.status === 'draft' && 'This reason is in draft and not yet submitted for approval'}
                                          {config.status === 'awaiting_approval' && 'This reason is pending approval'}
                                          {config.status === 'approved' && 'This reason is approved and ready for use'}
                                          {config.status === 'in_use' && 'This reason is currently being used in PSSRs'}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TableCell>

                                  {/* PSSR Approver Roles - Display only, click to edit */}
                                  <TableCell>
                                    <div 
                                      className="flex flex-wrap gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded transition-colors min-h-[36px] items-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditOverlay({ open: true, config });
                                      }}
                                    >
                                      {config.pssr_approver_role_ids.length > 0 ? (
                                        config.pssr_approver_role_ids.slice(0, 2).map((roleId) => {
                                          const role = roles.find(r => r.id === roleId);
                                          return role ? (
                                            <Badge key={roleId} variant="secondary" className="text-xs">
                                              {role.name}
                                            </Badge>
                                          ) : null;
                                        })
                                      ) : (
                                        <span className="text-sm text-muted-foreground italic">Click to add...</span>
                                      )}
                                      {config.pssr_approver_role_ids.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{config.pssr_approver_role_ids.length - 2} more
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>

                                  {/* SoF Approver Roles - Display only, click to edit */}
                                  <TableCell>
                                    <div 
                                      className="flex flex-wrap gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded transition-colors min-h-[36px] items-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditOverlay({ open: true, config });
                                      }}
                                    >
                                      {config.sof_approver_role_ids.length > 0 ? (
                                        config.sof_approver_role_ids.slice(0, 2).map((roleId) => {
                                          const role = roles.find(r => r.id === roleId);
                                          return role ? (
                                            <Badge key={roleId} variant="secondary" className="text-xs">
                                              {role.name}
                                            </Badge>
                                          ) : null;
                                        })
                                      ) : (
                                        <span className="text-sm text-muted-foreground italic">Click to add...</span>
                                      )}
                                      {config.sof_approver_role_ids.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{config.sof_approver_role_ids.length - 2} more
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </SortableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground pl-8">
                                  <span className="text-sm italic">No reasons configured for this category</span>
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Render uncategorized reasons if any */}
                    {(groupedConfigs.get(null) || []).length > 0 && (
                      <React.Fragment>
                        <TableRow 
                          className="bg-muted/30 hover:bg-muted/50 border-t-2 border-border/60 cursor-pointer transition-colors"
                          onClick={() => toggleCategory(null)}
                        >
                          <TableCell colSpan={4} className="py-3">
                            <div className="flex items-center gap-2">
                              {expandedCategories.has(null) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                              )}
                              <Info className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm text-muted-foreground">Uncategorized</span>
                              <Badge variant="secondary" className="text-xs">
                                {(groupedConfigs.get(null) || []).length}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedCategories.has(null) && (groupedConfigs.get(null) || []).map((config, index) => (
                          <SortableRow 
                            key={config.reason_id} 
                            id={config.reason_id}
                            isDirty={config.isDirty}
                          >
                            <TableCell className="font-medium overflow-hidden pl-8">
                              <div 
                                className="flex items-center gap-2 min-w-0 cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditOverlay({ open: true, config });
                                }}
                              >
                                <span className="text-xs font-semibold text-muted-foreground shrink-0">{index + 1}.</span>
                                <span className="flex-1 min-w-0 whitespace-normal break-words">
                                  {config.reason_name}
                                </span>
                                {config.isDirty && (
                                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300 shrink-0">
                                    Modified
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    className={`${STATUS_CONFIG[config.status]?.className || ''} cursor-default font-medium text-xs`}
                                  >
                                    {STATUS_CONFIG[config.status]?.label || config.status}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {config.status === 'draft' && 'This reason is in draft and not yet submitted for approval'}
                                    {config.status === 'awaiting_approval' && 'This reason is pending approval'}
                                    {config.status === 'approved' && 'This reason is approved and ready for use'}
                                    {config.status === 'in_use' && 'This reason is currently being used in PSSRs'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <RoleMultiSelect
                                roles={roles}
                                selectedRoleIds={config.pssr_approver_role_ids}
                                onToggle={(roleId) => handlePSSRApproverToggle(config.reason_id, roleId)}
                                placeholder="Select PSSR Approvers"
                                disabledRoleIds={[]}
                              />
                            </TableCell>
                            <TableCell>
                              <RoleMultiSelect
                                roles={roles}
                                selectedRoleIds={config.sof_approver_role_ids}
                                onToggle={(roleId) => handleSoFApproverToggle(config.reason_id, roleId)}
                                placeholder="Select SoF Approvers"
                                disabledRoleIds={config.pssr_approver_role_ids}
                                disabledTooltip="Already assigned as PSSR Approver"
                              />
                            </TableCell>
                          </SortableRow>
                        ))}
                      </React.Fragment>
                    )}

                    {sortedConfigs.length === 0 && categories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
                          <p className="mb-4">No PSSR reasons configured yet.</p>
                          <Button 
                            onClick={() => setShowAddReasonWizard(true)}
                            className="fluent-button"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First PSSR Reason
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Save Configuration Changes?
            </DialogTitle>
            <DialogDescription className="pt-2">
              These changes will only apply to <strong>newly created PSSRs</strong>. Existing PSSRs will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You are about to update the configuration for {localConfigs.filter(c => c.isDirty).length} PSSR reason(s).
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reason Wizard */}
      <AddPSSRReasonWizard 
        open={showAddReasonWizard} 
        onOpenChange={setShowAddReasonWizard} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, reasonId: null, reasonName: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete PSSR Reason?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteDialog.reasonName}"</strong>? 
              This action cannot be undone and will also remove all associated configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReason}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit PSSR Reason Overlay */}
      {editOverlay.config && (
        <EditPSSRReasonOverlay
          open={editOverlay.open}
          onOpenChange={(open) => {
            if (!open) {
              setEditOverlay({ open: false, config: null });
              queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
            }
          }}
          reasonId={editOverlay.config.reason_id}
          reasonName={editOverlay.config.reason_name}
          categoryId={editOverlay.config.category_id}
          deliveryPartyId={editOverlay.config.delivery_party_id}
          status={editOverlay.config.status}
          reasonApproverRoleIds={editOverlay.config.reason_approver_role_ids}
          pssrApproverRoleIds={editOverlay.config.pssr_approver_role_ids}
          sofApproverRoleIds={editOverlay.config.sof_approver_role_ids}
          onDelete={() => {
            setDeleteDialog({
              open: true,
              reasonId: editOverlay.config?.reason_id || null,
              reasonName: editOverlay.config?.reason_name || ''
            });
            setEditOverlay({ open: false, config: null });
          }}
        />
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ ...categoryDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.mode === 'edit' ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              Configure the PSSR reason category settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-code">Code *</Label>
              <Input
                id="category-code"
                value={categoryDialog.data.code || ''}
                onChange={(e) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, code: e.target.value.toUpperCase() }
                })}
                placeholder="e.g., PROJECT_STARTUP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={categoryDialog.data.name || ''}
                onChange={(e) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, name: e.target.value }
                })}
                placeholder="e.g., Project Startup"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryDialog.data.description || ''}
                onChange={(e) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, description: e.target.value }
                })}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon</Label>
              <Select
                value={categoryDialog.data.icon || ''}
                onValueChange={(value) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, icon: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Building2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Building
                    </div>
                  </SelectItem>
                  <SelectItem value="AlertTriangle">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Alert
                    </div>
                  </SelectItem>
                  <SelectItem value="Wrench">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> Wrench
                    </div>
                  </SelectItem>
                  <SelectItem value="FileText">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Document
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Requires Delivery Party</Label>
                <p className="text-xs text-muted-foreground">
                  Users must select P&E or BFM
                </p>
              </div>
              <Switch
                checked={categoryDialog.data.requires_delivery_party || false}
                onCheckedChange={(checked) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, requires_delivery_party: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Allows Free Text</Label>
                <p className="text-xs text-muted-foreground">
                  Users can enter custom text
                </p>
              </div>
              <Switch
                checked={categoryDialog.data.allows_free_text || false}
                onCheckedChange={(checked) => setCategoryDialog({
                  ...categoryDialog,
                  data: { ...categoryDialog.data, allows_free_text: checked }
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode: 'create', data: {} })}>
              Cancel
            </Button>
            <Button 
              onClick={handleCategorySubmit}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {(createCategory.isPending || updateCategory.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {categoryDialog.mode === 'edit' ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirmation */}
      <AlertDialog open={categoryDeleteDialog.open} onOpenChange={(open) => !open && setCategoryDeleteDialog({ open: false, categoryId: null, categoryName: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Category?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{categoryDeleteDialog.categoryName}"</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delivery Party Dialog */}
      <Dialog open={partyDialog.open} onOpenChange={(open) => setPartyDialog({ ...partyDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {partyDialog.mode === 'edit' ? 'Edit Delivery Party' : 'Add Delivery Party'}
            </DialogTitle>
            <DialogDescription>
              Configure the delivery party options
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="party-code">Code *</Label>
              <Input
                id="party-code"
                value={partyDialog.data.code || ''}
                onChange={(e) => setPartyDialog({
                  ...partyDialog,
                  data: { ...partyDialog.data, code: e.target.value }
                })}
                placeholder="e.g., P&E"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-name">Name *</Label>
              <Input
                id="party-name"
                value={partyDialog.data.name || ''}
                onChange={(e) => setPartyDialog({
                  ...partyDialog,
                  data: { ...partyDialog.data, name: e.target.value }
                })}
                placeholder="e.g., P&E - Projects & Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="party-description">Description</Label>
              <Textarea
                id="party-description"
                value={partyDialog.data.description || ''}
                onChange={(e) => setPartyDialog({
                  ...partyDialog,
                  data: { ...partyDialog.data, description: e.target.value }
                })}
                placeholder="Brief description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartyDialog({ open: false, mode: 'create', data: {} })}>
              Cancel
            </Button>
            <Button 
              onClick={handlePartySubmit}
              disabled={createDeliveryParty.isPending || updateDeliveryParty.isPending}
            >
              {(createDeliveryParty.isPending || updateDeliveryParty.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {partyDialog.mode === 'edit' ? 'Save Changes' : 'Create Party'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

// Role Multi-Select Component
interface RoleMultiSelectProps {
  roles: Array<{ id: string; name: string }>;
  selectedRoleIds: string[];
  onToggle: (roleId: string) => void;
  placeholder: string;
  disabledRoleIds: string[];
  disabledTooltip?: string;
}

const RoleMultiSelect: React.FC<RoleMultiSelectProps> = ({
  roles,
  selectedRoleIds,
  onToggle,
  placeholder,
  disabledRoleIds,
  disabledTooltip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCount = selectedRoleIds.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="h-9 w-full justify-between text-left font-normal"
      >
        <span className={selectedCount === 0 ? 'text-muted-foreground' : ''}>
          {selectedCount === 0 ? placeholder : `${selectedCount} role(s) selected`}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg">
          <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
            {roles.map((role) => {
              const isDisabled = disabledRoleIds.includes(role.id);
              const isSelected = selectedRoleIds.includes(role.id);

              return (
                <Tooltip key={role.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        isDisabled 
                          ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !isDisabled && onToggle(role.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        className="pointer-events-none"
                      />
                      <span className="text-sm flex-1">{role.name}</span>
                      {isDisabled && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TooltipTrigger>
                  {isDisabled && disabledTooltip && (
                    <TooltipContent side="right">
                      <p>{disabledTooltip}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
            {roles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No roles available</p>
            )}
          </div>
        </div>
      )}

      {/* Display selected roles as badges */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedRoleIds.slice(0, 2).map((roleId) => {
            const role = roles.find(r => r.id === roleId);
            return (
              <Badge key={roleId} variant="secondary" className="text-xs">
                {role?.name || 'Unknown'}
              </Badge>
            );
          })}
          {selectedCount > 2 && (
            <Badge variant="outline" className="text-xs">
              +{selectedCount - 2} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default PSSRConfigurationMatrix;
