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
import { AlertTriangle, Save, X, Lock, CheckCircle2, Info, Loader2, Plus, Trash2, FileText, Clock, AlertCircle } from 'lucide-react';
import { InlineEditableCell } from '@/components/ui/InlineEditableCell';
import { usePSSRReasonConfigurations, useUpsertPSSRReasonConfiguration, ConfigurationWithDetails } from '@/hooks/usePSSRReasonConfiguration';
import { useChecklists } from '@/hooks/useChecklists';
import { useRoles } from '@/hooks/useRoles';
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
  checklist_id: string | null;
  pssr_approver_role_ids: string[];
  sof_approver_role_ids: string[];
  isDirty: boolean;
  is_active: boolean;
  display_order: number;
  category: string | null;
  sub_category: string | null;
  status: PSSRReasonStatus;
  reason_approver_role_ids: string[];
}

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
        transition-all duration-200 hover:bg-accent/30
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
  const { data: checklists = [], isLoading: isLoadingChecklists } = useChecklists();
  const { roles = [], isLoading: isLoadingRoles } = useRoles();
  const upsertMutation = useUpsertPSSRReasonConfiguration();

  const [localConfigs, setLocalConfigs] = useState<LocalConfiguration[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Add Reason Wizard State
  const [showAddReasonWizard, setShowAddReasonWizard] = useState(false);

  // Delete Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; reasonId: string | null; reasonName: string }>({
    open: false,
    reasonId: null,
    reasonName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Reason Details Overlay State
  const [editOverlay, setEditOverlay] = useState<{
    open: boolean;
    config: LocalConfiguration | null;
  }>({ open: false, config: null });

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);

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
        checklist_id: config.checklist_id,
        pssr_approver_role_ids: config.pssr_approver_role_ids || [],
        sof_approver_role_ids: config.sof_approver_role_ids || [],
        isDirty: false,
        is_active: config.reason?.is_active ?? true,
        display_order: config.reason?.display_order ?? 0,
        category: (config.reason as any)?.category || null,
        sub_category: (config.reason as any)?.sub_category || null,
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

  const handleChecklistChange = (reasonId: string, checklistId: string | null) => {
    setLocalConfigs(prev => prev.map(config => 
      config.reason_id === reasonId 
        ? { ...config, checklist_id: checklistId === 'none' ? null : checklistId, isDirty: true }
        : config
    ));
  };

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
        checklist_id: c.checklist_id,
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
      checklist_id: config.checklist_id,
      pssr_approver_role_ids: config.pssr_approver_role_ids || [],
      sof_approver_role_ids: config.sof_approver_role_ids || [],
      isDirty: false,
      is_active: config.reason?.is_active ?? true,
      display_order: config.reason?.display_order ?? 0,
      category: (config.reason as any)?.category || null,
      sub_category: (config.reason as any)?.sub_category || null,
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

  const isLoading = isLoadingConfigs || isLoadingChecklists || isLoadingRoles;

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
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold">PSSR Reason</CardTitle>
              <CardDescription className="text-base">
                Manage PSSR reasons and configure checklist, PSSR approvers, and SoF approvers for each
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowAddReasonWizard(true)}
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
              <Button 
                onClick={() => setShowSaveDialog(true)}
                disabled={!hasUnsavedChanges || upsertMutation.isPending}
                className="fluent-button shadow-fluent-sm hover:shadow-fluent-md"
              >
                {upsertMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Configuration
              </Button>
            </div>
          </div>

          {/* Warning Banner */}
          <Alert className="mt-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Changes to this configuration will only apply to newly created PSSRs. Existing PSSRs will not be affected.
            </AlertDescription>
          </Alert>
        </CardHeader>

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
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[18%]">
                        Checklist
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
                    {sortedConfigs.map((config, index) => (
                      <SortableRow 
                        key={config.reason_id} 
                        id={config.reason_id}
                        isDirty={config.isDirty}
                      >
                        {/* Reason Name with Order Number - Clickable to open details */}
                        <TableCell className="font-medium overflow-hidden">
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

                        {/* Checklist Selection */}
                        <TableCell>
                          <Select
                            value={config.checklist_id || 'none'}
                            onValueChange={(value) => handleChecklistChange(config.reason_id, value)}
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue placeholder="Select checklist" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">Not configured</span>
                              </SelectItem>
                              {checklists.map((checklist) => (
                                <SelectItem key={checklist.id} value={checklist.id}>
                                  {checklist.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* PSSR Approver Roles */}
                        <TableCell>
                          <RoleMultiSelect
                            roles={roles}
                            selectedRoleIds={config.pssr_approver_role_ids}
                            onToggle={(roleId) => handlePSSRApproverToggle(config.reason_id, roleId)}
                            placeholder="Select PSSR Approvers"
                            disabledRoleIds={[]}
                          />
                        </TableCell>

                        {/* SoF Approver Roles */}
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

                    {/* Inline Add Row */}
                    <TableRow 
                      className="hover:bg-accent/30 cursor-pointer border-dashed border-t"
                      onClick={() => setShowAddReasonWizard(true)}
                    >
                      <TableCell colSpan={5} className="py-4">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                          <Plus className="h-4 w-4" />
                          <span className="text-sm font-medium">Add new PSSR reason...</span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {sortedConfigs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
          category={editOverlay.config.category}
          subCategory={editOverlay.config.sub_category}
          status={editOverlay.config.status}
          reasonApproverRoleIds={editOverlay.config.reason_approver_role_ids}
          checklistId={editOverlay.config.checklist_id}
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
                          : 'hover:bg-accent'
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
