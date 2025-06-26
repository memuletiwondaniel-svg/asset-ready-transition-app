import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';
import PSSRChecklist from './PSSRChecklist';
import ProgressSteps from './ProgressSteps';
import { usePSSRFormData, PSSRFormData } from '@/hooks/usePSSRFormData';

interface CreatePSSRFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const CreatePSSRFlow: React.FC<CreatePSSRFlowProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { formData, updateFormData, resetFormData, handleFileUpload, removeFile } = usePSSRFormData();

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
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
    resetFormData();
    setCurrentStep(1);
    onComplete();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PSSRStepOne 
            formData={formData} 
            setFormData={updateFormData}
            onFileUpload={handleFileUpload}
            onRemoveFile={removeFile}
          />
        );
      case 2:
        return (
          <PSSRStepTwo 
            formData={formData} 
            onBack={handleReturnToList}
            onContinueToChecklist={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <PSSRChecklist 
            onSaveDraft={handleComplete}
          />
        );
      default:
        return null;
    }
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
    switch (currentStep) {
      case 1:
        return formData.assetName && formData.reason && formData.projectId;
      case 2:
        return formData.coreTeam.projectManager.name && formData.coreTeam.projectManager.email;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleClose()}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Create New PSSR
                </DialogTitle>
                <p className="text-gray-600 mt-1">{getStepDescription()}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Step {currentStep} of 3
                </div>
                <Progress value={(currentStep / 3) * 100} className="w-24" />
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="mt-4">
              <ProgressSteps currentStep={currentStep} />
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {currentStep < 3 ? (
              <div className="h-full overflow-y-auto p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{getStepTitle()}</CardTitle>
                    <CardDescription>{getStepDescription()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderStepContent()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full">
                {renderStepContent()}
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {currentStep < 3 && (
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? handleClose : handleBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
              </Button>

              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePSSRFlow;
