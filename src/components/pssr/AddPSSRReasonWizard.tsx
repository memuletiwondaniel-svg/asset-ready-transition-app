import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Check, Loader2, X, Save, Zap, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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


interface AddPSSRReasonWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WizardState {
  reasonName: string;
  description: string;
  pssrApproverRoleIds: string[];
  sofApproverRoleIds: string[];
  checklistItemIds: string[];
  checklistItemOverrides: ChecklistItemOverrides;
}

const STEPS = [
  { id: 1, title: 'PSSR Reason', description: 'Select PSSR reason' },
  { id: 2, title: 'PSSR Approvers', description: 'Select PSSR approver roles' },
  { id: 3, title: 'SoF Approvers', description: 'Select Statement of Fitness approver roles' },
  { id: 4, title: 'Checklist Items', description: 'Select applicable checklist items' },
  { id: 5, title: 'Finalize', description: 'Review and activate template' },
];

const AddPSSRReasonWizard: React.FC<AddPSSRReasonWizardProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activationChoice, setActivationChoice] = useState<'activate' | 'draft'>('draft');
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);
  
  const [wizardState, setWizardState] = useState<WizardState>({
    reasonName: '',
    description: '',
    pssrApproverRoleIds: [],
    sofApproverRoleIds: [],
    checklistItemIds: [],
    checklistItemOverrides: {},
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setActivationChoice('draft');
    setWizardState({
      reasonName: '',
      description: '',
      pssrApproverRoleIds: [],
      sofApproverRoleIds: [],
      checklistItemIds: [],
      checklistItemOverrides: {},
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!wizardState.reasonName.trim()) {
          toast.error('Please select a PSSR reason');
          return false;
        }
        return true;
      case 2:
        if (wizardState.pssrApproverRoleIds.length === 0) {
          toast.error('Please select at least one PSSR approver role');
          return false;
        }
        return true;
      case 3:
        if (wizardState.sofApproverRoleIds.length === 0) {
          toast.error('Please select at least one SoF approver role');
          return false;
        }
        return true;
      case 4:
        if (wizardState.checklistItemIds.length === 0) {
          toast.error('Please select at least one checklist item');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (shouldActivate: boolean = false) => {
    setIsSubmitting(true);
    try {
      // Get the next display order
      const { data: existingReasons } = await supabase
        .from('pssr_reasons')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      
      const nextDisplayOrder = (existingReasons?.[0]?.display_order || 0) + 1;

      // 1. Create the PSSR Reason
      const { data: newReason, error: reasonError } = await supabase
        .from('pssr_reasons')
        .insert({
          name: wizardState.reasonName.trim(),
          description: wizardState.description.trim() || null,
          category_id: null,
          sub_category: null,
          is_active: shouldActivate,
          display_order: nextDisplayOrder,
          status: shouldActivate ? 'active' : 'draft',
        })
        .select()
        .single();

      if (reasonError) throw reasonError;

      // 2. Create the configuration
      const { error: configError } = await supabase
        .from('pssr_reason_configuration')
        .insert({
          reason_id: newReason.id,
          pssr_approver_role_ids: wizardState.pssrApproverRoleIds,
          sof_approver_role_ids: wizardState.sofApproverRoleIds,
          checklist_item_ids: wizardState.checklistItemIds,
          checklist_item_overrides: wizardState.checklistItemOverrides as Json,
        });

      if (configError) throw configError;

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });

      toast.success(
        shouldActivate 
          ? 'PSSR Template created and activated! It is now available for use.' 
          : 'PSSR Template saved as draft!'
      );
      handleClose();
    } catch (error: any) {
      console.error('Failed to create PSSR template:', error);
      toast.error(error.message || 'Failed to create PSSR template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    if (activationChoice === 'activate') {
      setShowActivationConfirm(true);
    } else {
      handleSubmit(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold">
            Add PSSR Template
          </DialogTitle>
          
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
                  className={`flex flex-col items-center flex-1 ${
                    step.id === currentStep 
                      ? 'text-primary' 
                      : step.id < currentStep 
                        ? 'text-primary/60' 
                        : 'text-muted-foreground'
                  }`}
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
              reasonName={wizardState.reasonName}
              description={wizardState.description}
              onReasonNameChange={(reasonName) => setWizardState(prev => ({ ...prev, reasonName }))}
              onDescriptionChange={(description) => setWizardState(prev => ({ ...prev, description }))}
            />
          )}

          {currentStep === 2 && (
            <WizardStepApprovers
              type="pssr"
              selectedRoleIds={wizardState.pssrApproverRoleIds}
              onRoleToggle={(roleId) => {
                setWizardState(prev => {
                  const current = prev.pssrApproverRoleIds;
                  const newRoles = current.includes(roleId)
                    ? current.filter(id => id !== roleId)
                    : [...current, roleId];
                  const newSofRoles = prev.sofApproverRoleIds.filter(id => !newRoles.includes(id));
                  return { ...prev, pssrApproverRoleIds: newRoles, sofApproverRoleIds: newSofRoles };
                });
              }}
            />
          )}

          {currentStep === 3 && (
            <WizardStepApprovers
              type="sof"
              selectedRoleIds={wizardState.sofApproverRoleIds}
              disabledRoleIds={wizardState.pssrApproverRoleIds}
              onRoleToggle={(roleId) => {
                if (wizardState.pssrApproverRoleIds.includes(roleId)) {
                  toast.error('This role is already assigned as a PSSR Approver');
                  return;
                }
                setWizardState(prev => {
                  const current = prev.sofApproverRoleIds;
                  const newRoles = current.includes(roleId)
                    ? current.filter(id => id !== roleId)
                    : [...current, roleId];
                  return { ...prev, sofApproverRoleIds: newRoles };
                });
              }}
            />
          )}

          {currentStep === 4 && (
            <WizardStepChecklistItems
              selectedItemIds={wizardState.checklistItemIds}
              itemOverrides={wizardState.checklistItemOverrides}
              onItemToggle={(itemId) => {
                setWizardState(prev => {
                  const current = prev.checklistItemIds;
                  const newItems = current.includes(itemId)
                    ? current.filter(id => id !== itemId)
                    : [...current, itemId];
                  return { ...prev, checklistItemIds: newItems };
                });
              }}
              onSelectAllItems={(allItemIds) => {
                setWizardState(prev => ({ ...prev, checklistItemIds: allItemIds }));
              }}
              onDeselectAll={() => {
                setWizardState(prev => ({ ...prev, checklistItemIds: [] }));
              }}
              onItemOverrideChange={(itemId: string, override: ChecklistItemOverride) => {
                setWizardState(prev => ({
                  ...prev,
                  checklistItemOverrides: {
                    ...prev.checklistItemOverrides,
                    [itemId]: override,
                  },
                }));
              }}
              onItemOverrideReset={(itemId: string) => {
                setWizardState(prev => {
                  const newOverrides = { ...prev.checklistItemOverrides };
                  delete newOverrides[itemId];
                  return { ...prev, checklistItemOverrides: newOverrides };
                });
              }}
            />
          )}

          {/* Step 5: Finalize - Activation Choice */}
          {currentStep === 5 && (
            <div className="space-y-6 py-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Template Configuration Complete</h3>
                <p className="text-muted-foreground mt-1">
                  Your PSSR template "<span className="font-medium text-foreground">{wizardState.reasonName}</span>" is ready.
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 border border-border/50">
                <h4 className="text-sm font-semibold mb-4">What would you like to do?</h4>
                <RadioGroup 
                  value={activationChoice} 
                  onValueChange={(value) => setActivationChoice(value as 'activate' | 'draft')}
                  className="space-y-3"
                >
                  <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    activationChoice === 'activate' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                      : 'border-border hover:border-muted-foreground/30'
                  }`}>
                    <RadioGroupItem value="activate" id="activate" className="mt-1" />
                    <Label htmlFor="activate" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">Activate immediately</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This template will be available for creating new PSSRs right away.
                      </p>
                    </Label>
                  </div>

                  <div className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    activationChoice === 'draft' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/30'
                  }`}>
                    <RadioGroupItem value="draft" id="draft" className="mt-1" />
                    <Label htmlFor="draft" className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">Save as draft</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Save for later. You can activate it from the template settings when ready.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Summary */}
              <div className="bg-muted/20 rounded-lg p-4 border border-border/30">
                <h4 className="text-sm font-semibold mb-3">Template Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Reason:</span>{' '}
                    <span className="font-medium">{wizardState.reasonName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PSSR Approvers:</span>{' '}
                    <span className="font-medium">{wizardState.pssrApproverRoleIds.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SoF Approvers:</span>{' '}
                    <span className="font-medium">{wizardState.sofApproverRoleIds.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Checklist Items:</span>{' '}
                    <span className="font-medium">{wizardState.checklistItemIds.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {activationChoice === 'activate' ? 'Activating...' : 'Saving...'}
                  </>
                ) : activationChoice === 'activate' ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Activate Template
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Activation Confirmation Dialog */}
    <AlertDialog open={showActivationConfirm} onOpenChange={setShowActivationConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600" />
            Activate PSSR Template?
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2 space-y-3">
            <p>
              You are about to activate the template "<strong>{wizardState.reasonName}</strong>".
            </p>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
              <p className="text-green-800 dark:text-green-200">
                <strong>This means:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 text-green-700 dark:text-green-300 space-y-1">
                <li>The template will be immediately available for use</li>
                <li>Users can select this template when initiating a new PSSR</li>
                <li>You can deactivate it later from the template settings</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowActivationConfirm(false);
              handleSubmit(true);
            }}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Activate Template
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};

export default AddPSSRReasonWizard;
