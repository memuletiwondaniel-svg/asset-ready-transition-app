
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePSSRFormData } from '@/hooks/usePSSRFormData';
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

  console.log('CreatePSSRFlow - Current formData:', formData);
  console.log('CreatePSSRFlow - Current step:', currentStep);

  const handleNext = () => {
    console.log('HandleNext called, current step:', currentStep);
    if (currentStep < 3) {
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

  const isStepValid = () => {
    console.log('Checking step validity for step:', currentStep);
    console.log('Current formData for validation:', formData);
    
    switch (currentStep) {
      case 1:
        const isValid1 = formData.assetName && formData.reason && formData.projectId;
        console.log('Step 1 validation:', { 
          assetName: formData.assetName, 
          reason: formData.reason, 
          projectId: formData.projectId,
          isValid: isValid1 
        });
        return isValid1;
      case 2:
        const isValid2 = formData.coreTeam.projectManager.name && formData.coreTeam.projectManager.email;
        console.log('Step 2 validation:', { 
          pmName: formData.coreTeam.projectManager.name,
          pmEmail: formData.coreTeam.projectManager.email,
          isValid: isValid2 
        });
        return isValid2;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => {
      // Ensure we only handle boolean false to close
      if (open === false) {
        handleClose();
      }
    }}>
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
