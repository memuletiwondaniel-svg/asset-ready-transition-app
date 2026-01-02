import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Check, Loader2, X, Users, FileCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import WizardStepCategory, { SubCategoryType } from './wizard/WizardStepCategory';
import WizardStepApprovers from './wizard/WizardStepApprovers';
import { useActivePSSRReasonCategories } from '@/hooks/usePSSRReasonCategories';
import { useRoles } from '@/hooks/useRoles';

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
}

const STEPS = [
  { id: 1, title: 'Category & Reason', description: 'Select category and enter reason name' },
  { id: 2, title: 'PSSR Approvers', description: 'Select PSSR approver roles' },
  { id: 3, title: 'SoF Approvers', description: 'Select Statement of Fitness approver roles' },
];

const AddPSSRReasonWizard: React.FC<AddPSSRReasonWizardProps> = ({ open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: categories } = useActivePSSRReasonCategories();
  const { roles = [] } = useRoles();
  
  const [wizardState, setWizardState] = useState<WizardState>({
    categoryId: null,
    subCategory: null,
    reasonName: '',
    description: '',
    pssrApproverRoleIds: [],
    sofApproverRoleIds: [],
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
        if (selectedCategory?.code === 'PROJECT_STARTUP' && !wizardState.subCategory) {
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
          description: wizardState.description.trim() || null,
          category_id: wizardState.categoryId,
          sub_category: wizardState.subCategory,
          is_active: true,
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
          checklist_id: null, // Will be configured separately
          pssr_approver_role_ids: wizardState.pssrApproverRoleIds,
          sof_approver_role_ids: wizardState.sofApproverRoleIds,
        });

      if (configError) throw configError;

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['pssr-reason-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pssr-reasons'] });

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
              categoryId={wizardState.categoryId}
              subCategory={wizardState.subCategory}
              reasonName={wizardState.reasonName}
              description={wizardState.description}
              onCategoryChange={(categoryId) => setWizardState(prev => ({ ...prev, categoryId }))}
              onSubCategoryChange={(subCategory) => setWizardState(prev => ({ ...prev, subCategory }))}
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
        </div>

        {/* Selection Summary Bar - Always visible */}
        {(wizardState.pssrApproverRoleIds.length > 0 || wizardState.sofApproverRoleIds.length > 0) && (
          <div className="border-t bg-muted/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {wizardState.pssrApproverRoleIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground font-medium">PSSR:</span>
                  <div className="flex flex-wrap gap-1">
                    {wizardState.pssrApproverRoleIds.slice(0, 2).map((roleId) => {
                      const role = roles.find(r => r.id === roleId);
                      return (
                        <Badge key={roleId} variant="secondary" className="text-xs py-0">
                          {role?.name || 'Unknown'}
                        </Badge>
                      );
                    })}
                    {wizardState.pssrApproverRoleIds.length > 2 && (
                      <Badge variant="outline" className="text-xs py-0">
                        +{wizardState.pssrApproverRoleIds.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {wizardState.sofApproverRoleIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground font-medium">SoF:</span>
                  <div className="flex flex-wrap gap-1">
                    {wizardState.sofApproverRoleIds.slice(0, 2).map((roleId) => {
                      const role = roles.find(r => r.id === roleId);
                      return (
                        <Badge key={roleId} variant="secondary" className="text-xs py-0 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                          {role?.name || 'Unknown'}
                        </Badge>
                      );
                    })}
                    {wizardState.sofApproverRoleIds.length > 2 && (
                      <Badge variant="outline" className="text-xs py-0">
                        +{wizardState.sofApproverRoleIds.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
