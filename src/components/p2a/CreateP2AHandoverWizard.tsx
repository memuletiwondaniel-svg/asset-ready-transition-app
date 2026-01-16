import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useP2AHandovers } from '@/hooks/useP2AHandovers';
import { WizardStepProjectSelection } from './wizard/WizardStepProjectSelection';
import { WizardStepPhaseSelection } from './wizard/WizardStepPhaseSelection';
import { WizardStepScope } from './wizard/WizardStepScope';
import { WizardStepTemplateRecommendation } from './wizard/WizardStepTemplateRecommendation';
import { WizardStepContacts, HandoverContact } from './wizard/WizardStepContacts';
import { WizardStepReview } from './wizard/WizardStepReview';
import { ChevronLeft, ChevronRight, Loader2, Check, Key, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CreateP2AHandoverWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 1, title: 'Project', description: 'Select project' },
  { id: 2, title: 'Phase', description: 'PAC or FAC' },
  { id: 3, title: 'Scope', description: 'Define scope' },
  { id: 4, title: 'Template', description: 'Select template' },
  { id: 5, title: 'Contacts', description: 'Key contacts' },
  { id: 6, title: 'Review', description: 'Confirm & create' },
];

const emptyContact: HandoverContact = { name: '', role: '', email: '' };

export const CreateP2AHandoverWizard: React.FC<CreateP2AHandoverWizardProps> = ({
  open,
  onOpenChange,
}) => {
  const { createHandover, isCreating } = useP2AHandovers();
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [projectId, setProjectId] = useState('');
  const [phase, setPhase] = useState<'PAC' | 'FAC'>('PAC');
  const [handoverScope, setHandoverScope] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [ignoreTemplates, setIgnoreTemplates] = useState(false);
  const [deliveringParty, setDeliveringParty] = useState<HandoverContact>(emptyContact);
  const [receivingParty, setReceivingParty] = useState<HandoverContact>(emptyContact);
  const [maintenanceParty, setMaintenanceParty] = useState<HandoverContact>(emptyContact);

  const resetForm = () => {
    setCurrentStep(1);
    setProjectId('');
    setPhase('PAC');
    setHandoverScope('');
    setSelectedTemplateId(null);
    setIgnoreTemplates(false);
    setDeliveringParty(emptyContact);
    setReceivingParty(emptyContact);
    setMaintenanceParty(emptyContact);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!projectId) {
          toast.error('Please select a project');
          return false;
        }
        return true;
      case 2:
        // Phase is always selected (default PAC)
        return true;
      case 3:
        // Scope is required for PAC
        if (phase === 'PAC' && !handoverScope.trim()) {
          toast.error('Please enter a scope description');
          return false;
        }
        return true;
      case 4:
        // Template selection is optional
        return true;
      case 5:
        // Contacts are optional
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSaveDraft = async () => {
    try {
      await createHandover({
        project_id: projectId,
        phase,
        handover_scope: handoverScope,
        status: 'DRAFT',
        created_by: '',
      });
      
      toast.success('Handover saved as draft');
      handleClose();
    } catch (error) {
      toast.error('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    try {
      await createHandover({
        project_id: projectId,
        phase,
        handover_scope: handoverScope,
        status: 'DRAFT',
        created_by: '',
      });
      
      toast.success('Handover created successfully');
      handleClose();
    } catch (error) {
      toast.error('Failed to create handover');
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WizardStepProjectSelection
            projectId={projectId}
            onProjectChange={setProjectId}
          />
        );
      case 2:
        return (
          <WizardStepPhaseSelection
            phase={phase}
            onPhaseChange={setPhase}
          />
        );
      case 3:
        return (
          <WizardStepScope
            scope={handoverScope}
            onScopeChange={setHandoverScope}
          />
        );
      case 4:
        return (
          <WizardStepTemplateRecommendation
            scope={handoverScope}
            selectedTemplateId={selectedTemplateId}
            ignoreTemplates={ignoreTemplates}
            onTemplateSelect={setSelectedTemplateId}
            onIgnoreTemplatesChange={setIgnoreTemplates}
          />
        );
      case 5:
        return (
          <WizardStepContacts
            deliveringParty={deliveringParty}
            receivingParty={receivingParty}
            maintenanceParty={maintenanceParty}
            onDeliveringPartyChange={setDeliveringParty}
            onReceivingPartyChange={setReceivingParty}
            onMaintenancePartyChange={setMaintenanceParty}
          />
        );
      case 6:
        return (
          <WizardStepReview
            projectId={projectId}
            phase={phase}
            pssrSignedDate={undefined}
            prerequisites={[]}
            handoverScope={handoverScope}
            selectedCategories={[]}
            deliveringParty={deliveringParty}
            receivingParty={receivingParty}
            maintenanceParty={maintenanceParty}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Initiate P2A Handover
              </DialogTitle>
              <DialogDescription>
                Create a new Project to Asset handover workflow
              </DialogDescription>
            </div>
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
                  <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[300px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handleBack}
              disabled={isCreating}
            >
              {currentStep === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>
            
            {/* Save Draft Button (visible from step 2 onwards) */}
            {currentStep > 1 && (
              <Button 
                variant="ghost" 
                onClick={handleSaveDraft}
                disabled={isCreating || !projectId}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Draft
              </Button>
            )}
          </div>
          
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Handover'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
