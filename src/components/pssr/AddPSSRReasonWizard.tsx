import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Loader2, X, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import WizardStepCategory, { SubCategoryType } from './wizard/WizardStepCategory';
import WizardStepReasonDetails from './wizard/WizardStepReasonDetails';
import WizardStepApprovers from './wizard/WizardStepApprovers';
import WizardStepChecklistItems, { ChecklistItemOverrides } from './wizard/WizardStepChecklistItems';
import { ChecklistItemOverride } from './wizard/ChecklistItemEditDialog';
import { useActivePSSRReasonCategories } from '@/hooks/usePSSRReasonCategories';
import { usePSSRChecklistItems } from '@/hooks/usePSSRChecklistLibrary';
import type { Json } from '@/integrations/supabase/types';


interface AddPSSRReasonWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WizardState {
  // Step 1
  categoryId: string | null;
  subCategory: SubCategoryType;
  reasonName: string;
  description: string;
  
  // Step 2
  pssrApproverRoleIds: string[];
  
  // Step 3
  sofApproverRoleIds: string[];
  
  // Step 4
  checklistItemIds: string[];
  checklistItemOverrides: ChecklistItemOverrides;
}

const STEPS = [
  { id: 1, title: 'Category', description: 'Select PSSR category' },
  { id: 2, title: 'PSSR Reason', description: 'Enter reason name and description' },
  { id: 3, title: 'PSSR Approvers', description: 'Select PSSR approver roles' },
  { id: 4, title: 'SoF Approvers', description: 'Select Statement of Fitness approver roles' },
  { id: 5, title: 'Checklist Items', description: 'Select applicable checklist items' },
];

const AddPSSRReasonWizard: React.FC<AddPSSRReasonWizardProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: categories } = useActivePSSRReasonCategories();
  
  
  const [wizardState, setWizardState] = useState<WizardState>({
    categoryId: null,
    subCategory: null,
    reasonName: '',
    description: '',
    pssrApproverRoleIds: [],
    sofApproverRoleIds: [],
    checklistItemIds: [],
    checklistItemOverrides: {},
  });

  const selectedCategory = categories?.find(c => c.id === wizardState.categoryId);

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardState({
      categoryId: null,
      subCategory: null,
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
        if (!wizardState.categoryId) {
          toast.error('Please select a category');
          return false;
        }
        return true;
      case 2:
        if (!wizardState.reasonName.trim()) {
          toast.error('Please enter a reason name');
          return false;
        }
        if (wizardState.reasonName.length > 100) {
          toast.error('Reason name must be less than 100 characters');
          return false;
        }
        return true;
      case 3:
        if (wizardState.pssrApproverRoleIds.length === 0) {
          toast.error('Please select at least one PSSR approver role');
          return false;
        }
        return true;
      case 4:
        if (wizardState.sofApproverRoleIds.length === 0) {
          toast.error('Please select at least one SoF approver role');
          return false;
        }
        return true;
      case 5:
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

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    // Only validate step if not saving as draft
    if (!saveAsDraft && !validateStep(currentStep)) return;
    
    // For draft, only validate step 1 (category and reason name are required)
    if (saveAsDraft && !validateStep(1)) return;

    setIsSubmitting(true);
    try {
      // Get the next display order
      const { data: existingReasons } = await supabase
        .from('pssr_reasons')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
      
      const nextDisplayOrder = (existingReasons?.[0]?.display_order || 0) + 1;

      // 1. Create the PSSR Reason with draft status
      const { data: newReason, error: reasonError } = await supabase
        .from('pssr_reasons')
        .insert({
          name: wizardState.reasonName.trim(),
          description: wizardState.description.trim() || null,
          category_id: wizardState.categoryId,
          sub_category: wizardState.subCategory,
          is_active: saveAsDraft ? false : true,
          display_order: nextDisplayOrder,
          status: 'draft',
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

      toast.success(saveAsDraft ? 'PSSR Template saved as draft!' : 'PSSR Template created successfully!');
      handleClose();
    } catch (error: any) {
      console.error('Failed to create PSSR template:', error);
      toast.error(error.message || 'Failed to create PSSR template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Add PSSR Template
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
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
            <WizardStepCategory
              categoryId={wizardState.categoryId}
              subCategory={wizardState.subCategory}
              onCategoryChange={(categoryId) => setWizardState(prev => ({ ...prev, categoryId }))}
              onSubCategoryChange={(subCategory) => setWizardState(prev => ({ ...prev, subCategory }))}
            />
          )}

          {currentStep === 2 && (
            <WizardStepReasonDetails
              reasonName={wizardState.reasonName}
              description={wizardState.description}
              onReasonNameChange={(reasonName) => setWizardState(prev => ({ ...prev, reasonName }))}
              onDescriptionChange={(description) => setWizardState(prev => ({ ...prev, description }))}
            />
          )}

          {currentStep === 3 && (
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

          {currentStep === 4 && (
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

          {currentStep === 5 && (
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
              <>
                <Button 
                  variant="outline" 
                  onClick={() => handleSubmit(true)} 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save as Draft
                    </>
                  )}
                </Button>
                <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create PSSR Template
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPSSRReasonWizard;
