
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PSSRFlowNavigationProps {
  currentStep: number;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

const PSSRFlowNavigation: React.FC<PSSRFlowNavigationProps> = ({
  currentStep,
  onBack,
  onContinue,
  canContinue
}) => {
  if (currentStep !== 1) return null;

  return (
    <div className="flex justify-between mt-12">
      <Button 
        variant="outline" 
        onClick={onBack}
        className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3"
      >
        Cancel
      </Button>
      
      <Button 
        onClick={onContinue} 
        disabled={!canContinue}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};

export default PSSRFlowNavigation;
