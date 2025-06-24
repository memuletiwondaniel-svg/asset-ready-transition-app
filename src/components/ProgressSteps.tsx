
import React from 'react';

interface ProgressStepsProps {
  currentStep: number;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep }) => {
  if (currentStep > 2) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-center">
        <div className="flex items-center">
          <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            currentStep >= 1 ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
          }`}>
            <span className="font-bold">1</span>
            {currentStep >= 1 && (
              <div className="absolute inset-0 rounded-full bg-blue-600 animate-pulse opacity-30"></div>
            )}
          </div>
          <div className="ml-4 text-left">
            <span className="block text-sm font-medium text-gray-900">Step 1</span>
            <span className="block text-xs text-gray-500">PSSR Information</span>
          </div>
        </div>
        <div className={`flex-1 h-2 mx-8 rounded-full transition-all duration-500 ${
          currentStep >= 2 ? 'bg-gradient-to-r from-blue-600 to-green-500' : 'bg-gray-300'
        }`}></div>
        <div className="flex items-center">
          <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            currentStep >= 2 ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-300 text-gray-600'
          }`}>
            <span className="font-bold">2</span>
            {currentStep >= 2 && (
              <div className="absolute inset-0 rounded-full bg-green-600 animate-pulse opacity-30"></div>
            )}
          </div>
          <div className="ml-4 text-left">
            <span className="block text-sm font-medium text-gray-900">Step 2</span>
            <span className="block text-xs text-gray-500">Confirmation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressSteps;
