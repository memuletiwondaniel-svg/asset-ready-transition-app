
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
          />

          <CreatePSSRFlowFooter
            currentStep={currentStep}
            isStepValid={true}
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
