import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import WizardStepCategory, { CategoryType, SubCategoryType } from './wizard/WizardStepCategory';
import WizardStepItems, { ItemConfiguration } from './wizard/WizardStepItems';
import WizardStepApprovers from './wizard/WizardStepApprovers';

interface AddPSSRReasonWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WizardState {
  // Step 1
  category: CategoryType | null;
  subCategory: SubCategoryType;
  reasonName: string;
  
  // Step 2
  itemConfigurations: ItemConfiguration[];
  
  // Step 3 - Reason Approvers (who approves the reason for use)
  reasonApproverRoleIds: string[];
  
  // Step 4
  pssrApproverRoleIds: string[];
  
  // Step 5
  sofApproverRoleIds: string[];
}

const STEPS = [
  { id: 1, title: 'Category & Reason', description: 'Select category and enter reason name' },
  { id: 2, title: 'PSSR Items', description: 'Configure applicable checklist items' },
  { id: 3, title: 'Reason Approvers', description: 'Select who approves the PSSR reason for use' },
  { id: 4, title: 'PSSR Approvers', description: 'Select PSSR approver roles' },
  { id: 5, title: 'SoF Approvers', description: 'Select Statement of Fitness approver roles' },
];

const AddPSSRReasonWizard: React.FC<AddPSSRReasonWizardProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [wizardState, setWizardState] = useState<WizardState>({
    category: null,
    subCategory: null,
    reasonName: '',
    itemConfigurations: [],
    reasonApproverRoleIds: [],
    pssrApproverRoleIds: [],
    sofApproverRoleIds: [],
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardState({
      category: null,
      subCategory: null,
      reasonName: '',
      itemConfigurations: [],
      reasonApproverRoleIds: [],
      pssrApproverRoleIds: [],
      sofApproverRoleIds: [],
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!wizardState.category) {
          toast.error('Please select a category');
          return false;
        }
        if (wizardState.category === 'Project' && !wizardState.subCategory) {
          toast.error('Please select a project type (P&E or BFM)');
          return false;
        }
        if (!wizardState.reasonName.trim()) {
          toast.error('Please enter a reason name');
          return false;
        }
        if (wizardState.reasonName.length > 100) {
          toast.error('Reason name must be less than 100 characters');
          return false;
        }
        return true;
      case 2:
        // Items configuration is optional but warn if empty
        return true;
      case 3:
        // Reason approvers - who can approve this reason for use
        if (wizardState.reasonApproverRoleIds.length === 0) {
          toast.error('Please select at least one reason approver role');
          return false;
        }
        return true;
      case 4:
        if (wizardState.pssrApproverRoleIds.length === 0) {
          toast.error('Please select at least one PSSR approver role');
          return false;
        }
        return true;
      case 5:
        if (wizardState.sofApproverRoleIds.length === 0) {
          toast.error('Please select at least one SoF approver role');
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

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

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
          category: wizardState.category,
          sub_category: wizardState.subCategory,
          is_active: true,
          display_order: nextDisplayOrder,
          status: 'draft',
          reason_approver_role_ids: wizardState.reasonApproverRoleIds,
        })
        .select()
        .single();

      if (reasonError) throw reasonError;

      // 2. Create the configuration
      const { error: configError } = await supabase
        .from('pssr_reason_configuration')
        .insert({
          reason_id: newReason.id,
          checklist_id: null, // Will be configured separately
          pssr_approver_role_ids: wizardState.pssrApproverRoleIds,
          sof_approver_role_ids: wizardState.sofApproverRoleIds,
        });

      if (configError) throw configError;

      // 3. Save item discipline assignments (if any)
      const itemsWithDisciplines = wizardState.itemConfigurations.filter(c => c.disciplineIds.length > 0);
      if (itemsWithDisciplines.length > 0) {
        const disciplineInserts = itemsWithDisciplines.flatMap(config =>
          config.disciplineIds.map(disciplineId => ({
            checklist_item_id: config.checklistItemId,
            discipline_id: disciplineId,
          }))
        );

        // Delete existing and insert new (for each item)
        for (const config of itemsWithDisciplines) {
          await supabase
            .from('checklist_item_approving_disciplines')
            .delete()
            .eq('checklist_item_id', config.checklistItemId);
        }

        const { error: disciplineError } = await supabase
          .from('checklist_item_approving_disciplines')
          .insert(disciplineInserts);

        if (disciplineError) {
          console.error('Failed to save discipline assignments:', disciplineError);
        }
      }

      // 4. Save item delivering party assignments (if any)
      const itemsWithPositions = wizardState.itemConfigurations.filter(c => c.positionId);
      if (itemsWithPositions.length > 0) {
        for (const config of itemsWithPositions) {
          await supabase
            .from('checklist_item_delivering_parties')
            .delete()
            .eq('checklist_item_id', config.checklistItemId);

          if (config.positionId) {
            await supabase
              .from('checklist_item_delivering_parties')
              .insert({
                checklist_item_id: config.checklistItemId,
                position_id: config.positionId,
              });
          }
        }
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-item-disciplines'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-item-delivering-parties'] });

      toast.success('PSSR Reason created successfully!');
      handleClose();
    } catch (error: any) {
      console.error('Failed to create PSSR reason:', error);
      toast.error(error.message || 'Failed to create PSSR reason');
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
              Add New PSSR Reason
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
              category={wizardState.category}
              subCategory={wizardState.subCategory}
              reasonName={wizardState.reasonName}
              onCategoryChange={(category) => setWizardState(prev => ({ ...prev, category }))}
              onSubCategoryChange={(subCategory) => setWizardState(prev => ({ ...prev, subCategory }))}
              onReasonNameChange={(reasonName) => setWizardState(prev => ({ ...prev, reasonName }))}
            />
          )}

          {currentStep === 2 && (
            <WizardStepItems
              itemConfigurations={wizardState.itemConfigurations}
              onItemConfigurationsChange={(itemConfigurations) => 
                setWizardState(prev => ({ ...prev, itemConfigurations }))
              }
            />
          )}

          {currentStep === 3 && (
            <WizardStepApprovers
              type="reason"
              selectedRoleIds={wizardState.reasonApproverRoleIds}
              onRoleToggle={(roleId) => {
                setWizardState(prev => {
                  const current = prev.reasonApproverRoleIds;
                  const newRoles = current.includes(roleId)
                    ? current.filter(id => id !== roleId)
                    : [...current, roleId];
                  return { ...prev, reasonApproverRoleIds: newRoles };
                });
              }}
            />
          )}

          {currentStep === 4 && (
            <WizardStepApprovers
              type="pssr"
              selectedRoleIds={wizardState.pssrApproverRoleIds}
              onRoleToggle={(roleId) => {
                setWizardState(prev => {
                  const current = prev.pssrApproverRoleIds;
                  const newRoles = current.includes(roleId)
                    ? current.filter(id => id !== roleId)
                    : [...current, roleId];
                  // Remove from SoF if added to PSSR
                  const newSofRoles = prev.sofApproverRoleIds.filter(id => !newRoles.includes(id));
                  return { ...prev, pssrApproverRoleIds: newRoles, sofApproverRoleIds: newSofRoles };
                });
              }}
            />
          )}

          {currentStep === 5 && (
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
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create PSSR Reason
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPSSRReasonWizard;
