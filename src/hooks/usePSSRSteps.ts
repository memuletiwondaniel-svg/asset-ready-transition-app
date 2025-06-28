
import { useState } from 'react';
import { validateStep } from '@/utils/pssrValidation';
import { PSSRData } from './usePSSRFormData';

export const usePSSRSteps = (formData: PSSRData) => {
  const [currentStep, setCurrentStep] = useState(1);

  const isStepValid = (): boolean => {
    return validateStep(currentStep, formData);
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

  const resetStep = () => {
    setCurrentStep(1);
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

  return {
    currentStep,
    setCurrentStep,
    isStepValid,
    handleNext,
    handleBack,
    resetStep,
    getStepTitle,
    getStepDescription
  };
};
