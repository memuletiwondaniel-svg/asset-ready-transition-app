
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface CreatePSSRFlowFooterProps {
  currentStep: number;
  isStepValid: boolean;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}

const CreatePSSRFlowFooter: React.FC<CreatePSSRFlowFooterProps> = ({
  currentStep,
  isStepValid,
  onBack,
  onNext,
  onClose
}) => {
  if (currentStep >= 3) return null;

  return (
    <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
      <Button
        variant="outline"
        onClick={currentStep === 1 ? onClose : onBack}
        className="flex items-center space-x-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
      </Button>

      <Button
        onClick={onNext}
        disabled={!isStepValid}
        className="flex items-center space-x-2"
      >
        <span>Next</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default CreatePSSRFlowFooter;
