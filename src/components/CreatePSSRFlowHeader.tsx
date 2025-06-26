
import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import ProgressSteps from './ProgressSteps';

interface CreatePSSRFlowHeaderProps {
  currentStep: number;
  getStepDescription: () => string;
}

const CreatePSSRFlowHeader: React.FC<CreatePSSRFlowHeaderProps> = ({
  currentStep,
  getStepDescription
}) => {
  return (
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
      
      <div className="mt-4">
        <ProgressSteps currentStep={currentStep} />
      </div>
    </DialogHeader>
  );
};

export default CreatePSSRFlowHeader;
