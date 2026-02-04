import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProgress, WizardStep } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';
import { ProjectOverviewStep } from './steps/ProjectOverviewStep';
import { SystemsImportStep, WizardSystem } from './steps/SystemsImportStep';
import { VCRCreationStep, WizardVCR } from './steps/VCRCreationStep';
import { SystemMappingStep } from './steps/SystemMappingStep';
import { VCRSequencingStep, WizardPhase } from './steps/VCRSequencingStep';
import { WorkspacePreviewStep } from './steps/WorkspacePreviewStep';
import { ApprovalSetupStep, WizardApprover } from './steps/ApprovalSetupStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { useP2APlanWizard } from '@/hooks/useP2APlanWizard';
import { toast } from 'sonner';

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
  { id: 2, title: 'Systems', description: 'Import or create systems' },
  { id: 3, title: 'VCRs', description: 'Define verification checkpoints' },
  { id: 4, title: 'Mapping', description: 'Map systems to VCRs' },
  { id: 5, title: 'Sequence', description: 'Assign phases to VCRs' },
  { id: 6, title: 'Preview', description: 'Review the plan layout' },
  { id: 7, title: 'Approval', description: 'Configure approvers' },
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
  
  const {
    state,
    updateState,
    resetState,
    saveDraft,
    submitForApproval,
    isSaving,
    isSubmitting,
  } = useP2APlanWizard(projectId, projectCode);

  const handleClose = () => {
    resetState();
    setCurrentStep(1);
    setUseWizard(null);
    onOpenChange(false);
  };

  const handleChooseWizard = () => {
    setUseWizard(true);
    setCurrentStep(2);
  };

  const handleChooseWorkspace = () => {
    handleClose();
    onOpenWorkspace?.();
  };

  const handleBack = () => {
    if (currentStep === 2 && useWizard) {
      setUseWizard(null);
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
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

  const canProceed = () => {
    switch (currentStep) {
      case 2:
        // Systems step - optional but show warning
        return true;
      case 3:
        // VCRs step - at least one VCR recommended
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
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
          />
        );
      case 3:
        return (
          <VCRCreationStep
            vcrs={state.vcrs}
            milestones={milestones}
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
          <VCRSequencingStep
            vcrs={state.vcrs}
            phases={state.phases}
            vcrPhaseAssignments={state.vcrPhaseAssignments}
            vcrOrder={state.vcrOrder}
            onPhasesChange={(phases) => updateState('phases', phases)}
            onVCRPhaseAssignmentsChange={(assignments) => updateState('vcrPhaseAssignments', assignments)}
            onVCROrderChange={(order) => updateState('vcrOrder', order)}
          />
        );
      case 6:
        return (
          <WorkspacePreviewStep
            systems={state.systems}
            vcrs={state.vcrs}
            phases={state.phases}
            mappings={state.mappings}
            vcrPhaseAssignments={state.vcrPhaseAssignments}
            onOpenFullWorkspace={handleChooseWorkspace}
          />
        );
      case 7:
        return (
          <ApprovalSetupStep
            approvers={state.approvers}
            onApproversChange={(approvers) => updateState('approvers', approvers)}
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
      <DialogContent className="max-w-2xl p-0 gap-0 h-[80vh] flex flex-col overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-lg blur-sm" />
              <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                <Key className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Create P2A Handover Plan</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {projectName && projectName !== projectCode 
                  ? `${projectCode}: ${projectName}` 
                  : projectCode}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Indicator - show only after choosing wizard */}
        {useWizard && currentStep > 1 && (
          <WizardProgress
            steps={WIZARD_STEPS.slice(1)} // Skip overview step
            currentStep={currentStep - 1} // Adjust for display
            onStepClick={(step) => setCurrentStep(step + 1)}
          />
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          {renderStepContent()}
        </ScrollArea>

        {/* Navigation - show only after choosing wizard and not on overview */}
        {useWizard && currentStep > 1 && (
          <WizardNavigation
            currentStep={currentStep - 1}
            totalSteps={WIZARD_STEPS.length - 1}
            onBack={handleBack}
            onNext={handleNext}
            onSave={handleSaveDraft}
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
