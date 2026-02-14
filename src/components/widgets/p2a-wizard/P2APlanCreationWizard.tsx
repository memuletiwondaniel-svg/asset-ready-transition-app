import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Key, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProgress, WizardStep } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';
import { ProjectOverviewStep } from './steps/ProjectOverviewStep';
import { SystemsImportStep, WizardSystem } from './steps/SystemsImportStep';
import { VCRCreationStep, WizardVCR } from './steps/VCRCreationStep';
import { SystemMappingStep } from './steps/SystemMappingStep';
import { PhasesStep, WizardPhase } from './steps/PhasesStep';
import { WorkspacePreviewStep } from './steps/WorkspacePreviewStep';
import { ApprovalSetupStep, WizardApprover } from './steps/ApprovalSetupStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { useP2APlanWizard } from '@/hooks/useP2APlanWizard';
import { useP2APlanByProject } from '@/hooks/useP2APlanByProject';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface P2APlanCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectCode: string;
  projectName?: string;
  plantName?: string;
  milestones?: Array<{ id: string; name: string; target_date?: string }>;
  onSuccess?: () => void;
  onOpenWorkspace?: () => void;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Overview', description: 'Project info and approach' },
  { id: 2, title: 'Select\nSystems', description: 'Import or create systems' },
  { id: 3, title: 'Create\nVCRs', description: 'Define Verification Certificate of Readiness' },
  { id: 4, title: 'Assign Systems', description: 'Map systems to VCRs' },
  { id: 5, title: 'Handover Phases', description: 'Define phases & assign VCRs' },
  { id: 6, title: 'Selected\nApprovers', description: 'Choose who approves the plan' },
  { id: 7, title: 'Review &\nSubmit', description: 'Review the plan layout' },
  { id: 8, title: 'Confirm', description: 'Submit for approval' },
];

export const P2APlanCreationWizard: React.FC<P2APlanCreationWizardProps> = ({
  open,
  onOpenChange,
  projectId,
  projectCode,
  projectName,
  plantName,
  milestones = [],
  onSuccess,
  onOpenWorkspace,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [useWizard, setUseWizard] = useState<boolean | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  
  const { data: existingPlan } = useP2APlanByProject(projectId);

  const {
    state,
    updateState,
    resetState,
    loadDraft,
    draftLoaded,
    saveDraft,
    submitForApproval,
    deleteDraft,
    isSaving,
    isSubmitting,
    isDeleting,
  } = useP2APlanWizard(projectId, projectCode);

  // When the wizard opens and a draft plan exists, auto-load and resume
  useEffect(() => {
    if (open && existingPlan && !draftLoaded && !isLoadingDraft) {
      setIsLoadingDraft(true);
      loadDraft().then((hasDraft) => {
        if (hasDraft) {
          setUseWizard(true);
          setCurrentStep(2);
        }
        setIsLoadingDraft(false);
      });
    }
  }, [open, existingPlan, draftLoaded, isLoadingDraft, loadDraft]);

  const handleClose = () => {
    resetState();
    setCurrentStep(1);
    setUseWizard(null);
    setCompletedSteps(new Set());
    onOpenChange(false);
  };

  const isStepComplete = (displayStep: number): boolean => {
    const hasVisitedPast = (currentStep - 1) > displayStep;
    switch (displayStep) {
      case 1: return state.systems.length > 0;
      case 2: return state.vcrs.length > 0;
      case 3: return Object.values(state.mappings).some(arr => arr.length > 0);
      case 4: return state.phases.length > 0;
      case 5: return state.approvers.length > 0;
      case 6: return hasVisitedPast;
      case 7: return hasVisitedPast;
      default: return false;
    }
  };

  const recalculateCompletedSteps = () => {
    const newCompleted = new Set<number>();
    for (let i = 1; i <= WIZARD_STEPS.length - 1; i++) {
      // A step is only complete if its own validation passes AND all prior steps are complete
      const priorStepsComplete = i === 1 || Array.from({ length: i - 1 }, (_, k) => k + 1).every(s => isStepComplete(s));
      if (isStepComplete(i) && priorStepsComplete) {
        newCompleted.add(i);
      }
    }
    setCompletedSteps(newCompleted);
  };

  useEffect(() => {
    if (draftLoaded && useWizard) {
      recalculateCompletedSteps();
    }
  }, [draftLoaded, useWizard, state]);

  const handleChooseWizard = () => {
    setUseWizard(true);
    setCurrentStep(2);
  };

  const handleChooseWorkspace = async () => {
    try {
      await saveDraft();
    } catch (error) {
      // Continue even if save fails — user can still view workspace
    }
    handleClose();
    onOpenWorkspace?.();
  };

  const handleBack = () => {
    recalculateCompletedSteps();
    if (currentStep === 2 && useWizard) {
      setUseWizard(null);
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  // Auto-save when clicking Next
  const handleNext = async () => {
    recalculateCompletedSteps();
    try {
      await saveDraft();
    } catch (error) {
      // Continue navigation even if save fails silently
    }
    setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
  };

  const handleSaveAndExit = async () => {
    try {
      await saveDraft();
      handleClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteDraft = async () => {
    try {
      await deleteDraft();
      handleClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSubmit = async () => {
    try {
      await submitForApproval();
      handleClose();
      onSuccess?.();
      toast.success('P2A Handover Plan submitted for approval!');
    } catch (error) {
      // Error handled in hook
    }
  };

  const canProceed = () => true;

  const renderStepContent = () => {
    if (isLoadingDraft) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading your saved draft...</p>
          </div>
        </div>
      );
    }

    if (currentStep === 1 || useWizard === null) {
      return (
        <ProjectOverviewStep
          projectId={projectId}
          projectCode={projectCode}
          projectName={projectName}
          plantName={plantName}
          milestones={milestones}
          onChooseWizard={handleChooseWizard}
          onChooseWorkspace={handleChooseWorkspace}
        />
      );
    }

    switch (currentStep) {
      case 2:
        return (
          <SystemsImportStep
            systems={state.systems}
            onSystemsChange={(systems) => updateState('systems', systems)}
            projectCode={projectCode}
          />
        );
      case 3:
        return (
          <VCRCreationStep
            vcrs={state.vcrs}
            projectCode={projectCode}
            onVCRsChange={(vcrs) => updateState('vcrs', vcrs)}
          />
        );
      case 4:
        return (
          <SystemMappingStep
            systems={state.systems}
            vcrs={state.vcrs}
            mappings={state.mappings}
            onMappingsChange={(mappings) => updateState('mappings', mappings)}
          />
        );
      case 5:
        return (
          <PhasesStep
            vcrs={state.vcrs}
            phases={state.phases}
            systems={state.systems}
            vcrPhaseAssignments={state.vcrPhaseAssignments}
            mappings={state.mappings}
            milestones={milestones}
            onPhasesChange={(phases) => updateState('phases', phases)}
            onVCRPhaseAssignmentsChange={(assignments) => updateState('vcrPhaseAssignments', assignments)}
            onVCRsChange={(vcrs) => updateState('vcrs', vcrs)}
            onMappingsChange={(mappings) => updateState('mappings', mappings)}
            onOpenFullWorkspace={handleChooseWorkspace}
          />
        );
      case 6:
        return (
          <ApprovalSetupStep
            approvers={state.approvers}
            projectId={projectId}
            plantName={plantName}
            onApproversChange={(approvers) => updateState('approvers', approvers)}
          />
        );
      case 7:
        return (
          <WorkspacePreviewStep
            systems={state.systems}
            vcrs={state.vcrs}
            phases={state.phases}
            mappings={state.mappings}
            vcrPhaseAssignments={state.vcrPhaseAssignments}
            approvers={state.approvers}
          />
        );
      case 8:
        return (
          <ConfirmationStep
            projectCode={projectCode}
            projectName={projectName}
            systems={state.systems}
            vcrs={state.vcrs}
            phases={state.phases}
            approvers={state.approvers}
            mappings={state.mappings}
            vcrPhaseAssignments={state.vcrPhaseAssignments}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 h-[min(85vh,720px)] flex flex-col overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-xl blur-sm" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                <Key className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Create P2A Plan
              </h2>
              <p className="text-xs text-muted-foreground">
                {projectName && projectName !== projectCode 
                  ? `${projectCode}: ${projectName}` 
                  : projectCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Delete draft button - only for existing drafts */}
            {existingPlan && existingPlan.status === 'DRAFT' && useWizard && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Draft Plan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the P2A Handover Plan draft including all systems, VCRs, phases, and approvers. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteDraft}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Draft
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        {useWizard && currentStep > 1 && !isLoadingDraft && (
          <WizardProgress
            steps={WIZARD_STEPS.slice(1)}
            currentStep={currentStep - 1}
            completedSteps={completedSteps}
            onStepClick={(step) => {
              recalculateCompletedSteps();
              setCurrentStep(step + 1);
            }}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {useWizard && currentStep > 1 && !isLoadingDraft && (
          <WizardNavigation
            currentStep={currentStep - 1}
            totalSteps={WIZARD_STEPS.length - 1}
            onBack={handleBack}
            onNext={handleNext}
            onSaveAndExit={handleSaveAndExit}
            onSubmit={currentStep === WIZARD_STEPS.length ? handleSubmit : undefined}
            isSubmitting={isSubmitting}
            isSaving={isSaving}
            canProceed={canProceed()}
            submitLabel="Submit for Approval"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
