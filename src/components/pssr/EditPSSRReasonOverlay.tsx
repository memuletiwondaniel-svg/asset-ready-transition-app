import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Loader2, Save, Trash2, FileText, CheckCircle, AlertCircle, Clock, Send, X, ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRoles } from '@/hooks/useRoles';
import { usePSSRReasonCategories, usePSSRDeliveryParties } from '@/hooks/usePSSRReasonCategories';
import { PSSRReasonStatus } from '@/hooks/usePSSRReasons';
import WizardStepReasonDetails from './wizard/WizardStepReasonDetails';
import WizardStepApprovers from './wizard/WizardStepApprovers';
import WizardStepChecklistItems, { ChecklistItemOverrides } from './wizard/WizardStepChecklistItems';
import { ChecklistItemOverride } from './wizard/ChecklistItemEditDialog';
import type { Json } from '@/integrations/supabase/types';
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

const STATUS_CONFIG: Record<PSSRReasonStatus, { label: string; icon: React.ElementType; className: string }> = {
  draft: { label: 'Draft', icon: FileText, className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', icon: CheckCircle, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  inactive: { label: 'Inactive', icon: AlertCircle, className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const STEPS = [
  { id: 1, title: 'PSSR Reason', description: 'Edit reason name and description' },
  { id: 2, title: 'PSSR Approvers', description: 'Select PSSR approver roles' },
  { id: 3, title: 'SoF Approvers', description: 'Select Statement of Fitness approver roles' },
  { id: 4, title: 'Checklist Items', description: 'Select applicable checklist items' },
];

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

  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  // Form state
  const [formCategoryId, setFormCategoryId] = useState<string | null>(initialCategoryId);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [formReasonName, setFormReasonName] = useState(initialReasonName);
  const [description, setDescription] = useState('');
  const [pssrLeadId, setPssrLeadId] = useState('');
  const [status, setStatus] = useState<PSSRReasonStatus>(initialStatus);
  const [pssrApproverRoleIds, setPssrApproverRoleIds] = useState<string[]>(initialPssrApproverRoleIds);
  const [sofApproverRoleIds, setSofApproverRoleIds] = useState<string[]>(initialSofApproverRoleIds);
  const [checklistItemIds, setChecklistItemIds] = useState<string[]>([]);
  const [checklistItemOverrides, setChecklistItemOverrides] = useState<ChecklistItemOverrides>({});
  const [naItemIds, setNaItemIds] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<import('@/hooks/usePSSRChecklistLibrary').ChecklistItem[]>([]);

  // Load full configuration including checklist items
  useEffect(() => {
    const loadConfiguration = async () => {
      if (!open || !reasonId) return;
      
      setIsLoadingConfig(true);
      try {
        // Load reason details
        const { data: reason, error: reasonError } = await supabase
          .from('pssr_reasons')
          .select('*')
          .eq('id', reasonId)
          .single();

        if (reasonError) throw reasonError;

        // Load configuration
        const { data: config, error: configError } = await supabase
          .from('pssr_reason_configuration')
          .select('*')
          .eq('reason_id', reasonId)
          .single();

        if (configError && configError.code !== 'PGRST116') throw configError;

        // Update form state
        setFormCategoryId(reason.category_id);
        setSubCategory(reason.sub_category as string | null);
        setFormReasonName(reason.name);
        setDescription(reason.description || '');
        setStatus(reason.status as PSSRReasonStatus);
        
        if (config) {
          setPssrApproverRoleIds(config.pssr_approver_role_ids || []);
          setSofApproverRoleIds(config.sof_approver_role_ids || []);
          setChecklistItemIds(config.checklist_item_ids || []);
          setChecklistItemOverrides((config.checklist_item_overrides as ChecklistItemOverrides) || {});
          setPssrLeadId((config as any).default_pssr_lead_id || '');
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
        toast.error('Failed to load template configuration');
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfiguration();
  }, [open, reasonId]);

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open]);

  const handleClose = () => {
    setCurrentStep(1);
    onOpenChange(false);
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!formReasonName.trim()) {
      toast.error('Reason name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Update reason
      const { error: reasonError } = await supabase
        .from('pssr_reasons')
        .update({
          name: formReasonName.trim(),
          category_id: formCategoryId,
          sub_category: subCategory,
          description: description.trim() || null,
          status,
        })
        .eq('id', reasonId);

      if (reasonError) throw reasonError;

      // Update configuration
      const { error: configError } = await supabase
        .from('pssr_reason_configuration')
        .update({
          pssr_approver_role_ids: pssrApproverRoleIds,
          sof_approver_role_ids: sofApproverRoleIds,
          checklist_item_ids: checklistItemIds,
          checklist_item_overrides: checklistItemOverrides as Json,
          default_pssr_lead_id: pssrLeadId || null,
        } as any)
        .eq('reason_id', reasonId);

      if (configError) throw configError;

      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      
      toast.success('PSSR Template updated successfully');
      handleClose();
    } catch (error: any) {
      console.error('Failed to save:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateTemplate = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pssr_reasons')
        .update({ status: 'active', is_active: true })
        .eq('id', reasonId);

      if (error) throw error;

      setStatus('active');
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      toast.success('PSSR Template is now active and available for use');
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateTemplate = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pssr_reasons')
        .update({ status: 'inactive', is_active: false })
        .eq('id', reasonId);

      if (error) throw error;

      setStatus('inactive');
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      toast.success('PSSR Template has been deactivated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate template');
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  if (isLoadingConfig) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-semibold">
                  Edit PSSR Template
                </DialogTitle>
                <Badge className={statusConfig.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
              </div>
            
            {/* Progress Indicator */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Step {currentStep} of {STEPS.length}</span>
                <span className="text-muted-foreground">{STEPS[currentStep - 1].title}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              
              {/* Step Indicators */}
              <div className="flex justify-between mt-2">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center flex-1 cursor-pointer ${
                      step.id === currentStep 
                        ? 'text-primary' 
                        : step.id < currentStep 
                          ? 'text-primary/60' 
                          : 'text-muted-foreground'
                    }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                        step.id === currentStep
                          ? 'border-primary bg-primary text-primary-foreground'
                          : step.id < currentStep
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-muted-foreground/30 bg-muted/30'
                      }`}
                    >
                      {step.id < currentStep ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center hidden sm:block">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </DialogHeader>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto py-6 px-1">
            {currentStep === 1 && (
              <WizardStepReasonDetails
                reasonName={formReasonName}
                description={description}
                pssrLeadId={pssrLeadId}
                onReasonNameChange={setFormReasonName}
                onDescriptionChange={setDescription}
                onPssrLeadChange={setPssrLeadId}
              />
            )}

            {currentStep === 2 && (
              <WizardStepApprovers
                type="pssr"
                selectedRoleIds={pssrApproverRoleIds}
                onRoleToggle={(roleId) => {
                  setPssrApproverRoleIds(prev => 
                    prev.includes(roleId) 
                      ? prev.filter(id => id !== roleId)
                      : [...prev, roleId]
                  );
                }}
              />
            )}

            {currentStep === 3 && (
              <WizardStepApprovers
                type="sof"
                selectedRoleIds={sofApproverRoleIds}
                onRoleToggle={(roleId) => {
                  setSofApproverRoleIds(prev =>
                    prev.includes(roleId)
                      ? prev.filter(id => id !== roleId)
                      : [...prev, roleId]
                  );
                }}
              />
            )}

            {currentStep === 4 && (
              <WizardStepChecklistItems
                selectedItemIds={checklistItemIds}
                itemOverrides={checklistItemOverrides}
                onItemToggle={(itemId) => {
                  setChecklistItemIds(prev =>
                    prev.includes(itemId)
                      ? prev.filter(id => id !== itemId)
                      : [...prev, itemId]
                  );
                }}
                onSelectAllItems={(allItemIds) => {
                  setChecklistItemIds(allItemIds);
                }}
                onDeselectAll={() => {
                  setChecklistItemIds([]);
                }}
                onItemOverrideChange={(itemId: string, override: ChecklistItemOverride) => {
                  setChecklistItemOverrides(prev => ({
                    ...prev,
                    [itemId]: override,
                  }));
                }}
                onItemOverrideReset={(itemId: string) => {
                  setChecklistItemOverrides(prev => {
                    const newOverrides = { ...prev };
                    delete newOverrides[itemId];
                    return newOverrides;
                  });
                }}
                naItemIds={naItemIds}
                onMarkNA={(itemId) => {
                  setNaItemIds(prev => [...prev, itemId]);
                  setChecklistItemIds(prev => prev.filter(id => id !== itemId));
                }}
                onRestoreNA={(itemId) => {
                  setNaItemIds(prev => prev.filter(id => id !== itemId));
                  setChecklistItemIds(prev => [...prev, itemId]);
                }}
                customItems={customItems}
                onAddExistingItems={(itemIds) => {
                  setChecklistItemIds(prev => [...new Set([...prev, ...itemIds])]);
                }}
                onAddCustomItem={(item) => {
                  const customId = `custom-${Date.now()}`;
                  const newItem = {
                    id: customId,
                    category: item.category,
                    topic: item.topic || null,
                    description: item.description,
                    supporting_evidence: item.supporting_evidence || null,
                    approvers: null,
                    responsible: null,
                    sequence_number: 999,
                    is_active: true,
                    version: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  setCustomItems(prev => [...prev, newItem]);
                  setChecklistItemIds(prev => [...prev, customId]);
                }}
              />
            )}
          </div>

          {/* Status Actions (shown on step 1) */}
          {currentStep === 1 && (
            <div className="px-1 pb-4">
              {status === 'draft' && (
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium mb-1">Ready to activate?</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Activating this template will make it available for creating new PSSRs.
                      </p>
                      <Button size="sm" onClick={handleActivateTemplate} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activate Template
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {status === 'active' && (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Template is Active</h4>
                      <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                        This template is currently available for creating new PSSRs.
                      </p>
                      <Button size="sm" variant="outline" onClick={handleDeactivateTemplate} disabled={isSaving} className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Deactivate Template
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {status === 'inactive' && (
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Template is Inactive</h4>
                      <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                        This template is deactivated and not available for creating new PSSRs.
                      </p>
                      <Button size="sm" onClick={handleActivateTemplate} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Reactivate Template
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="border-t pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSaving}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              
              <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
                Cancel
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowSaveConfirm(true)} 
                disabled={!formReasonName.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>

              {currentStep < STEPS.length && (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Save Changes?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              <strong>Note:</strong> Changes to this configuration will only apply to <strong>newly created PSSRs</strong>. Existing PSSRs will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSaveConfirm(false);
                handleSave();
              }}
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditPSSRReasonOverlay;
