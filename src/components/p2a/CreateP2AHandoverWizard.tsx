import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useP2AHandovers } from '@/hooks/useP2AHandovers';
import { useP2AHandoverPrerequisites } from '@/hooks/useP2AHandoverPrerequisites';
import { useP2AHandoverApprovers } from '@/hooks/useP2AHandoverApprovers';
import { usePACPrerequisites, usePACCategories } from '@/hooks/useHandoverPrerequisites';
import { useDefaultHandoverApprovers } from '@/hooks/useDefaultHandoverApprovers';
import { WizardStepProjectSelection } from './wizard/WizardStepProjectSelection';
import { WizardStepPhaseSelection } from './wizard/WizardStepPhaseSelection';
import { WizardStepScope } from './wizard/WizardStepScope';
import { WizardStepTemplateRecommendation } from './wizard/WizardStepTemplateRecommendation';
import { WizardStepOperationalControl, PrerequisiteLocalState } from './wizard/WizardStepOperationalControl';
import { WizardStepCare } from './wizard/WizardStepCare';
import { WizardStepApproversConfig, ApproverConfig } from './wizard/WizardStepApproversConfig';
import { WizardStepReview } from './wizard/WizardStepReview';
import { ChevronLeft, ChevronRight, Loader2, Check, Key, Save } from 'lucide-react';
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
  { id: 5, title: 'Control', description: 'Operational control' },
  { id: 6, title: 'Care', description: 'Handover of care' },
  { id: 7, title: 'Approvers', description: 'Configure approvers' },
  { id: 8, title: 'Review', description: 'Confirm & create' },
];

// Fallback default approvers in case admin hasn't configured any
const FALLBACK_APPROVERS: ApproverConfig[] = [
  { id: 'temp-1', roleName: 'Project Team Lead', userId: null, displayOrder: 1 },
  { id: 'temp-2', roleName: 'Asset Team Lead', userId: null, displayOrder: 2 },
  { id: 'temp-3', roleName: 'Operations Manager', userId: null, displayOrder: 3 },
  { id: 'temp-4', roleName: 'Plant Director', userId: null, displayOrder: 4 },
];

export const CreateP2AHandoverWizard: React.FC<CreateP2AHandoverWizardProps> = ({
  open,
  onOpenChange,
}) => {
  const { createHandover, isCreating } = useP2AHandovers();
  const { initializePrerequisites, isInitializing } = useP2AHandoverPrerequisites(null);
  const { initializeApprovers } = useP2AHandoverApprovers(null);
  const { data: allPrerequisites } = usePACPrerequisites();
  const { data: categories } = usePACCategories();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [projectId, setProjectId] = useState('');
  const [phase, setPhase] = useState<'PAC' | 'FAC'>('PAC');
  const [handoverScope, setHandoverScope] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [ignoreTemplates, setIgnoreTemplates] = useState(false);
  
  // Prerequisites local state (before saving to DB)
  const [prerequisiteStates, setPrerequisiteStates] = useState<Map<string, PrerequisiteLocalState>>(new Map());
  
  // Approvers local state
  const [approvers, setApprovers] = useState<ApproverConfig[]>(FALLBACK_APPROVERS);
  const [approversInitialized, setApproversInitialized] = useState(false);
  
  // Fetch default approvers from admin settings based on selected phase
  const { approvers: adminApprovers, isLoading: isLoadingApprovers } = useDefaultHandoverApprovers(phase);

  // Update approvers when phase changes or admin approvers load
  useEffect(() => {
    if (adminApprovers && adminApprovers.length > 0 && !approversInitialized) {
      const mappedApprovers: ApproverConfig[] = adminApprovers.map((a, index) => ({
        id: `temp-${index + 1}`,
        roleName: a.role_name,
        userId: null,
        displayOrder: a.display_order,
      }));
      setApprovers(mappedApprovers);
      setApproversInitialized(true);
    }
  }, [adminApprovers, approversInitialized]);

  // Reset approvers initialization when phase changes
  useEffect(() => {
    setApproversInitialized(false);
  }, [phase]);

  const resetForm = () => {
    setCurrentStep(1);
    setProjectId('');
    setPhase('PAC');
    setHandoverScope('');
    setSelectedTemplateId(null);
    setIgnoreTemplates(false);
    setPrerequisiteStates(new Map());
    setApprovers(FALLBACK_APPROVERS);
    setApproversInitialized(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Handler for prerequisite state changes
  const handlePrerequisiteChange = useCallback((prereqId: string, state: PrerequisiteLocalState) => {
    setPrerequisiteStates(prev => {
      const next = new Map(prev);
      next.set(prereqId, state);
      return next;
    });
  }, []);

  // Calculate progress for prerequisites
  const getPrerequisiteProgress = (categoryName: 'OPERATIONAL_CONTROL' | 'CARE') => {
    const category = categories?.find(c => c.name === categoryName);
    if (!category || !allPrerequisites) return { completed: 0, total: 0 };

    const categoryPrereqs = allPrerequisites.filter(p => p.category_id === category.id);
    const completed = categoryPrereqs.filter(p => {
      const state = prerequisiteStates.get(p.id);
      return state?.status === 'COMPLETED' || state?.status === 'NOT_APPLICABLE';
    }).length;

    return { completed, total: categoryPrereqs.length };
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
        // Operational Control - allow proceed but could warn
        return true;
      case 6:
        // Care - allow proceed but could warn
        return true;
      case 7:
        // Approvers - at least one required
        if (approvers.length === 0) {
          toast.error('Please add at least one approver');
          return false;
        }
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
      setIsSubmitting(true);
      
      // Create handover record with DRAFT status
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Create handover record with IN_PROGRESS status
      await createHandover({
        project_id: projectId,
        phase,
        handover_scope: handoverScope,
        status: 'IN_PROGRESS',
        created_by: '',
      });
      
      toast.success('Handover created successfully');
      handleClose();
    } catch (error) {
      toast.error('Failed to create handover');
    } finally {
      setIsSubmitting(false);
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
          <WizardStepOperationalControl
            selectedTemplateId={selectedTemplateId}
            ignoreTemplates={ignoreTemplates}
            prerequisiteStates={prerequisiteStates}
            onPrerequisiteChange={handlePrerequisiteChange}
          />
        );
      case 6:
        return (
          <WizardStepCare
            selectedTemplateId={selectedTemplateId}
            ignoreTemplates={ignoreTemplates}
            prerequisiteStates={prerequisiteStates}
            onPrerequisiteChange={handlePrerequisiteChange}
          />
        );
      case 7:
        return (
          <WizardStepApproversConfig
            approvers={approvers}
            onApproversChange={setApprovers}
          />
        );
      case 8:
        return (
          <WizardStepReview
            projectId={projectId}
            phase={phase}
            handoverScope={handoverScope}
            selectedTemplateId={selectedTemplateId}
            ignoreTemplates={ignoreTemplates}
            prerequisiteStates={prerequisiteStates}
            approvers={approvers}
            operationalControlProgress={getPrerequisiteProgress('OPERATIONAL_CONTROL')}
            careProgress={getPrerequisiteProgress('CARE')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors ${
                      step.id === currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : step.id < currentStep
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/30 bg-muted/30'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-[10px] mt-1 hidden lg:block text-center">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[350px] px-1">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handleBack}
              disabled={isSubmitting}
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
                disabled={isSubmitting || !projectId}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Draft
              </Button>
            )}
          </div>
          
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
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
