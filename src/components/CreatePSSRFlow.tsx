import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePSSRFormData } from '@/hooks/usePSSRFormData';
import { useProjectsData } from '@/hooks/useProjectsData';
import CreatePSSRFlowHeader from './CreatePSSRFlowHeader';
import CreatePSSRFlowContent from './CreatePSSRFlowContent';
import CreatePSSRFlowFooter from './CreatePSSRFlowFooter';

interface CreatePSSRFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { formData, updateFormData, resetFormData, handleFileUpload, removeFile } = usePSSRFormData();
  const { projects, handleNewProjectAdded, handleProjectDelete, handleProjectUpdate } = useProjectsData();

  console.log('CreatePSSRFlow - Current formData:', formData);
  console.log('CreatePSSRFlow - Current step:', currentStep);

  const isStepValid = (): boolean => {
    console.log('Checking step validity for step:', currentStep);
    console.log('Current formData for validation:', formData);
    
    switch (currentStep) {
      case 1:
        const hasReason = Boolean(formData.reason);
        const hasScope = Boolean(formData.scope);
        
        if (formData.reason === 'Start-up or Commissioning of a new Asset') {
          const hasProject = Boolean(formData.projectId && formData.projectName);
          return hasReason && hasScope && hasProject;
        } else {
          const hasAsset = Boolean(formData.asset);
          return hasReason && hasScope && hasAsset;
        }
        
      case 2:
        const hasHubLead = Boolean(formData.projectHubLead?.name && formData.projectHubLead?.email);
        const hasCommissioningLead = Boolean(formData.commissioningLead?.name && formData.commissioningLead?.email);
        const hasConstructionLead = Boolean(formData.constructionLead?.name && formData.constructionLead?.email);
        
        return hasHubLead && hasCommissioningLead && hasConstructionLead;
        
      case 3:
        return true;
        
      default:
        return false;
    }
  };

  const handleNext = () => {
    console.log('HandleNext called, current step:', currentStep);
    if (currentStep < 3 && isStepValid()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    console.log('HandleBack called, current step:', currentStep);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    console.log('HandleClose called');
    resetFormData();
    setCurrentStep(1);
    onClose();
  };

  const handleComplete = () => {
    console.log('PSSR Created:', formData);
    resetFormData();
    setCurrentStep(1);
    onComplete();
  };

  const handleReturnToList = () => {
    console.log('HandleReturnToList called');
    resetFormData();
    setCurrentStep(1);
    onComplete();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Project Information';
      case 2:
        return 'Team Members & Documents';
      case 3:
        return 'PSSR Checklist';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return 'Provide basic project details and information';
      case 2:
        return 'Add team members and upload required documents';
      case 3:
        return 'Complete the PSSR checklist items';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <CreatePSSRFlowHeader 
            currentStep={currentStep}
            getStepDescription={getStepDescription}
          />

          <CreatePSSRFlowContent
            currentStep={currentStep}
            formData={formData}
            updateFormData={updateFormData}
            handleFileUpload={handleFileUpload}
            removeFile={removeFile}
            onReturnToList={handleReturnToList}
            onContinueToChecklist={() => setCurrentStep(3)}
            onComplete={handleComplete}
            getStepTitle={getStepTitle}
            getStepDescription={getStepDescription}
            projects={projects}
            onNewProjectAdded={handleNewProjectAdded}
            onProjectUpdate={handleProjectUpdate}
            onProjectDelete={handleProjectDelete}
          />

          <CreatePSSRFlowFooter
            currentStep={currentStep}
            isStepValid={isStepValid()}
            onBack={handleBack}
            onNext={handleNext}
            onClose={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePSSRFlow;
