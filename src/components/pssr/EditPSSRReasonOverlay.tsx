import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, Trash2, FileText, Settings, Users, CheckCircle, AlertCircle, Clock, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { usePSSRReasonCategories, usePSSRDeliveryParties } from '@/hooks/usePSSRReasonCategories';
import { PSSRReasonStatus } from '@/hooks/usePSSRReasons';

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

const STATUS_CONFIG: Record<PSSRReasonStatus, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  draft: { label: 'Draft', icon: FileText, variant: 'secondary', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  awaiting_approval: { label: 'Awaiting Approval', icon: Clock, variant: 'outline', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', icon: CheckCircle, variant: 'default', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  in_use: { label: 'In Use', icon: AlertCircle, variant: 'default', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
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
  const { disciplines = [] } = useDisciplines();
  const { data: categories = [] } = usePSSRReasonCategories();
  const { data: deliveryParties = [] } = usePSSRDeliveryParties();

  const [activeTab, setActiveTab] = useState('details');
  const [isSaving, setIsSaving] = useState(false);
  
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
      // Update PSSR Reason
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

      // Update configuration
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

  const toggleRoleSelection = (roleId: string, list: string[], setList: (ids: string[]) => void) => {
    if (list.includes(roleId)) {
      setList(list.filter(id => id !== roleId));
    } else {
      setList([...list, roleId]);
    }
  };

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold">
                Edit PSSR Reason
              </DialogTitle>
              <Badge className={statusConfig.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            Manage PSSR reason details and approver configuration.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="approvers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Approvers
            </TabsTrigger>
            <TabsTrigger value="reason-approvers" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Reason Approvers
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-1">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reason Name</Label>
                  <Input
                    value={reasonName}
                    onChange={(e) => setReasonName(e.target.value)}
                    placeholder="Enter reason name"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as PSSRReasonStatus)}>
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={categoryId || 'none'} 
                    onValueChange={(v) => {
                      const newCategoryId = v === 'none' ? null : v;
                      setCategoryId(newCategoryId);
                      // Reset delivery party if new category doesn't require it
                      const selectedCategory = categories.find(c => c.id === newCategoryId);
                      if (!selectedCategory?.requires_delivery_party) {
                        setDeliveryPartyId(null);
                      }
                    }}
                  >
                    <SelectTrigger>
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

                {currentCategory?.requires_delivery_party && (
                  <div className="space-y-2">
                    <Label>Delivery Party</Label>
                    <Select 
                      value={deliveryPartyId || 'none'} 
                      onValueChange={(v) => setDeliveryPartyId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
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
                <div className="bg-muted/30 rounded-lg p-4 border">
                  <h4 className="font-medium mb-2">Ready to submit?</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Once submitted, this PSSR Reason will be reviewed by the designated approvers before it can be used.
                  </p>
                  <Button onClick={handleSubmitForApproval} disabled={isSaving}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </Button>
                </div>
              )}

              {status === 'awaiting_approval' && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium mb-2 text-amber-800 dark:text-amber-200">Awaiting Approval</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    This PSSR Reason is pending approval from the designated approvers.
                  </p>
                  <Button onClick={handleApprove} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Approvers Tab */}
            <TabsContent value="approvers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">PSSR Approvers</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select roles that can approve the PSSR.
                  </p>
                  <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleRoleSelection(role.id, pssrApproverRoleIds, setPssrApproverRoleIds)}
                      >
                        <Checkbox checked={pssrApproverRoleIds.includes(role.id)} />
                        <span className="text-sm">{role.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">SoF Approvers</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select roles that can approve the Statement of Fitness.
                  </p>
                  <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                    {roles.map((role) => {
                      const isDisabled = pssrApproverRoleIds.includes(role.id);
                      return (
                        <div
                          key={role.id}
                          className={`flex items-center gap-2 p-2 rounded transition-colors ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'
                          }`}
                          onClick={() => !isDisabled && toggleRoleSelection(role.id, sofApproverRoleIds, setSofApproverRoleIds)}
                        >
                          <Checkbox checked={sofApproverRoleIds.includes(role.id)} disabled={isDisabled} />
                          <span className="text-sm">{role.name}</span>
                          {isDisabled && <Badge variant="outline" className="text-xs ml-auto">PSSR Approver</Badge>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Reason Approvers Tab */}
            <TabsContent value="reason-approvers" className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium mb-3">PSSR Reason Approvers</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Select roles that can approve this PSSR Reason for use (e.g., TSE Manager, ORA Lead, P&M Director). 
                  This is different from the PSSR/SoF approvers who approve individual PSSRs.
                </p>
                <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => toggleRoleSelection(role.id, reasonApproverRoleIds, setReasonApproverRoleIds)}
                    >
                      <Checkbox checked={reasonApproverRoleIds.includes(role.id)} />
                      <span className="text-sm">{role.name}</span>
                    </div>
                  ))}
                </div>
                {reasonApproverRoleIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reasonApproverRoleIds.map((roleId) => {
                      const role = roles.find(r => r.id === roleId);
                      return (
                        <Badge key={roleId} variant="secondary">
                          {role?.name || 'Unknown'}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="border-t pt-4 gap-2 sm:justify-between">
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Reason
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPSSRReasonOverlay;
