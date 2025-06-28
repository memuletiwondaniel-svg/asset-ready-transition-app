
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePSSRFormData } from '@/hooks/usePSSRFormData';
import { useProjectsData } from '@/hooks/useProjectsData';
import { usePSSRSteps } from '@/hooks/usePSSRSteps';
import CreatePSSRFlowHeader from './CreatePSSRFlowHeader';
import CreatePSSRFlowContent from './CreatePSSRFlowContent';
import CreatePSSRFlowFooter from './CreatePSSRFlowFooter';

interface CreatePSSRFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ isOpen, onClose, onComplete }) => {
  const { formData, updateFormData, resetFormData, handleFileUpload, removeFile } = usePSSRFormData();
  const { projects, handleNewProjectAdded, handleProjectDelete, handleProjectUpdate } = useProjectsData();
  const { 
    currentStep, 
    setCurrentStep, 
    isStepValid, 
    handleNext, 
    handleBack, 
    resetStep, 
    getStepTitle, 
    getStepDescription 
  } = usePSSRSteps(formData);

  console.log('CreatePSSRFlow - Current formData:', formData);
  console.log('CreatePSSRFlow - Current step:', currentStep);

  const handleClose = () => {
    console.log('HandleClose called');
    resetFormData();
    resetStep();
    onClose();
  };

  const handleComplete = () => {
    console.log('PSSR Created:', formData);
    resetFormData();
    resetStep();
    onComplete();
  };

  const handleReturnToList = () => {
    console.log('HandleReturnToList called');
    resetFormData();
    resetStep();
    onComplete();
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
