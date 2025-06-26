
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PSSRStepOne from './PSSRStepOne';
import PSSRStepTwo from './PSSRStepTwo';
import PSSRChecklist from './PSSRChecklist';
import { PSSRData } from '@/hooks/usePSSRFormData';

interface CreatePSSRFlowContentProps {
  currentStep: number;
  formData: PSSRData;
  updateFormData: (updates: Partial<PSSRData>) => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  onReturnToList: () => void;
  onContinueToChecklist: () => void;
  onComplete: () => void;
  getStepTitle: () => string;
  getStepDescription: () => string;
}

const CreatePSSRFlowContent: React.FC<CreatePSSRFlowContentProps> = ({
  currentStep,
  formData,
  updateFormData,
  handleFileUpload,
  removeFile,
  onReturnToList,
  onContinueToChecklist,
  onComplete,
  getStepTitle,
  getStepDescription
}) => {
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
            onBack={onReturnToList}
            onContinueToChecklist={onContinueToChecklist}
          />
        );
      case 3:
        return (
          <PSSRChecklist 
            onSaveDraft={onComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
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
        <div className="h-full overflow-y-auto">
          {renderStepContent()}
        </div>
      )}
    </div>
  );
};

export default CreatePSSRFlowContent;
