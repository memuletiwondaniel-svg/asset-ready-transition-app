import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Trash2, FileText, CheckCircle, AlertCircle, Clock, Send, Info, X, Users, Shield, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import { usePSSRReasonCategories, usePSSRDeliveryParties } from '@/hooks/usePSSRReasonCategories';
import { PSSRReasonStatus } from '@/hooks/usePSSRReasons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditPSSRReasonOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reasonId: string;
  reasonName: string;
  categoryId: string | null;
  deliveryPartyId: string | null;
  status: PSSRReasonStatus;
  reasonApproverRoleIds: string[];
  pssrApproverRoleIds: string[];
  sofApproverRoleIds: string[];
  onDelete: () => void;
}

// Allowed roles for PSSR Approvers dropdown
const ALLOWED_PSSR_APPROVER_ROLES = [
  'ORA Lead',
  'Engr. Manager (Asset)',
  'Engr. Manager (P&E)',
  'Dep. Plant Director',
  'Project Manager',
  'TSE Manager',
  'HSE Manager',
];

// Allowed roles for SoF Approvers dropdown
const ALLOWED_SOF_APPROVER_ROLES = [
  'Plant Director',
  'HSE Director',
  'P&E Director',
  'P&M Director',
];

const STATUS_CONFIG: Record<PSSRReasonStatus, { label: string; icon: React.ElementType; className: string }> = {
  draft: { label: 'Draft', icon: FileText, className: 'bg-muted text-muted-foreground' },
  awaiting_approval: { label: 'Awaiting Approval', icon: Clock, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', icon: CheckCircle, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  in_use: { label: 'In Use', icon: AlertCircle, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

const EditPSSRReasonOverlay: React.FC<EditPSSRReasonOverlayProps> = ({
  open,
  onOpenChange,
  reasonId,
  reasonName: initialReasonName,
  categoryId: initialCategoryId,
  deliveryPartyId: initialDeliveryPartyId,
  status: initialStatus,
  reasonApproverRoleIds: initialReasonApproverRoleIds,
  pssrApproverRoleIds: initialPssrApproverRoleIds,
  sofApproverRoleIds: initialSofApproverRoleIds,
  onDelete,
}) => {
  const queryClient = useQueryClient();
  const { roles = [] } = useRoles();
  const { data: categories = [] } = usePSSRReasonCategories();
  const { data: deliveryParties = [] } = usePSSRDeliveryParties();

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Form state
  const [reasonName, setReasonName] = useState(initialReasonName);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const [deliveryPartyId, setDeliveryPartyId] = useState<string | null>(initialDeliveryPartyId);
  const [status, setStatus] = useState<PSSRReasonStatus>(initialStatus);
  const [reasonApproverRoleIds, setReasonApproverRoleIds] = useState<string[]>(initialReasonApproverRoleIds);
  const [pssrApproverRoleIds, setPssrApproverRoleIds] = useState<string[]>(initialPssrApproverRoleIds);
  const [sofApproverRoleIds, setSofApproverRoleIds] = useState<string[]>(initialSofApproverRoleIds);

  // Get current category to check if it requires delivery party
  const currentCategory = categories.find(c => c.id === categoryId);

  // Reset form when props change
  useEffect(() => {
    setReasonName(initialReasonName);
    setCategoryId(initialCategoryId);
    setDeliveryPartyId(initialDeliveryPartyId);
    setStatus(initialStatus);
    setReasonApproverRoleIds(initialReasonApproverRoleIds);
    setPssrApproverRoleIds(initialPssrApproverRoleIds);
    setSofApproverRoleIds(initialSofApproverRoleIds);
  }, [initialReasonName, initialCategoryId, initialDeliveryPartyId, initialStatus, initialReasonApproverRoleIds, initialPssrApproverRoleIds, initialSofApproverRoleIds]);

  const handleSave = async () => {
    if (!reasonName.trim()) {
      toast.error('Reason name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { error: reasonError } = await supabase
        .from('pssr_reasons')
        .update({
          name: reasonName.trim(),
          category_id: categoryId,
          delivery_party_id: deliveryPartyId,
          status,
          reason_approver_role_ids: reasonApproverRoleIds,
        })
        .eq('id', reasonId);

      if (reasonError) throw reasonError;

      const { error: configError } = await supabase
        .from('pssr_reason_configuration')
        .update({
          pssr_approver_role_ids: pssrApproverRoleIds,
          sof_approver_role_ids: sofApproverRoleIds,
        })
        .eq('reason_id', reasonId);

      if (configError) throw configError;

      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      
      toast.success('PSSR Reason updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pssr_reasons')
        .update({ status: 'awaiting_approval' })
        .eq('id', reasonId);

      if (error) throw error;

      setStatus('awaiting_approval');
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      toast.success('Submitted for approval');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit for approval');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pssr_reasons')
        .update({ status: 'approved' })
        .eq('id', reasonId);

      if (error) throw error;

      setStatus('approved');
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      toast.success('PSSR Reason approved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  const addApprover = (roleId: string, list: string[], setList: (ids: string[]) => void) => {
    if (!list.includes(roleId)) {
      setList([...list, roleId]);
    }
  };

  const removeApprover = (roleId: string, list: string[], setList: (ids: string[]) => void) => {
    setList(list.filter(id => id !== roleId));
  };

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.name || roleId;
  };

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold">
                Edit PSSR Reason
              </DialogTitle>
              <Badge className={statusConfig.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Configure reason details and approver assignments
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5 space-y-6">
              {/* Basic Details Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Reason Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={reasonName}
                    onChange={(e) => setReasonName(e.target.value)}
                    placeholder="Enter reason name"
                    className="bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Category
                    </label>
                    <Select 
                      value={categoryId || 'none'} 
                      onValueChange={(v) => {
                        const newCategoryId = v === 'none' ? null : v;
                        setCategoryId(newCategoryId);
                        const selectedCategory = categories.find(c => c.id === newCategoryId);
                        if (!selectedCategory?.requires_delivery_party) {
                          setDeliveryPartyId(null);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {categories
                          .filter(cat => cat.is_active)
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </label>
                    <Select value={status} onValueChange={(v) => setStatus(v as PSSRReasonStatus)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentCategory?.requires_delivery_party && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Delivery Party
                    </label>
                    <Select 
                      value={deliveryPartyId || 'none'} 
                      onValueChange={(v) => setDeliveryPartyId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select delivery party" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        {deliveryParties
                          .filter(dp => dp.is_active)
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((dp) => (
                            <SelectItem key={dp.id} value={dp.id}>
                              {dp.code} - {dp.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              {status === 'draft' && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Send className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium mb-1">Ready to submit?</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        This PSSR Reason will be reviewed by designated approvers before use.
                      </p>
                      <Button size="sm" onClick={handleSubmitForApproval} disabled={isSaving}>
                        Submit for Approval
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {status === 'awaiting_approval' && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Awaiting Approval</h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                        This PSSR Reason is pending approval.
                      </p>
                      <Button size="sm" onClick={handleApprove} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* PSSR Approvers Section */}
              <div className="border-t border-border/40 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    PSSR Approvers
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Roles that can approve the PSSR document</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {pssrApproverRoleIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
                    {pssrApproverRoleIds.map((roleId) => (
                      <Badge key={roleId} variant="secondary" className="flex items-center gap-1 px-3 py-1.5 bg-blue-100/50 dark:bg-blue-900/30 border-blue-200/50 dark:border-blue-700/30 transition-colors hover:bg-blue-200/50 dark:hover:bg-blue-800/40">
                        {getRoleName(roleId)}
                        <button
                          type="button"
                          className="ml-1 rounded-full p-0.5 text-destructive hover:bg-destructive/20 transition-colors"
                          onClick={() => removeApprover(roleId, pssrApproverRoleIds, setPssrApproverRoleIds)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {roles.filter(role => !pssrApproverRoleIds.includes(role.id) && ALLOWED_PSSR_APPROVER_ROLES.includes(role.name)).length > 0 && (
                  <Select
                    value=""
                    onValueChange={(value) => addApprover(value, pssrApproverRoleIds, setPssrApproverRoleIds)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Add PSSR approver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter(role => !pssrApproverRoleIds.includes(role.id) && ALLOWED_PSSR_APPROVER_ROLES.includes(role.name))
                        .map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* SoF Approvers Section */}
              <div className="border-t border-border/40 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    SoF Approvers
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Roles that can approve the Statement of Fitness</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {sofApproverRoleIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/50 dark:border-emerald-800/30">
                    {sofApproverRoleIds.map((roleId) => (
                      <Badge key={roleId} variant="secondary" className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-200/50 dark:border-emerald-700/30 transition-colors hover:bg-emerald-200/50 dark:hover:bg-emerald-800/40">
                        {getRoleName(roleId)}
                        <button
                          type="button"
                          className="ml-1 rounded-full p-0.5 text-destructive hover:bg-destructive/20 transition-colors"
                          onClick={() => removeApprover(roleId, sofApproverRoleIds, setSofApproverRoleIds)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {roles.filter(role => !sofApproverRoleIds.includes(role.id) && !pssrApproverRoleIds.includes(role.id) && ALLOWED_SOF_APPROVER_ROLES.includes(role.name)).length > 0 && (
                  <Select
                    value=""
                    onValueChange={(value) => addApprover(value, sofApproverRoleIds, setSofApproverRoleIds)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Add SoF approver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter(role => !sofApproverRoleIds.includes(role.id) && !pssrApproverRoleIds.includes(role.id) && ALLOWED_SOF_APPROVER_ROLES.includes(role.name))
                        .map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t flex-row justify-between shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!reasonName.trim() || isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PSSR Reason</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{reasonName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditPSSRReasonOverlay;
