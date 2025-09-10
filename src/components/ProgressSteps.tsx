
import React from 'react';

interface ProgressStepsProps {
  currentStep: number;
}

// Fluent-inspired horizontal stepper
const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep }) => {
  if (currentStep > 2) return null;

  const steps = [
    { id: 1, title: 'PSSR Information' },
    { id: 2, title: 'Confirmation' },
  ];

  const progressPercent = ((Math.min(currentStep, steps.length) - 1) / (steps.length - 1)) * 100;

  return (
    <div className="mb-10">
      <div className="relative max-w-3xl mx-auto">
        {/* Track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-[6px] rounded-full bg-gray-200" aria-hidden />
        {/* Progress */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-4 h-[6px] rounded-full bg-blue-600 transition-all"
          style={{ width: `calc(${progressPercent}% - 0.5rem)` }}
          aria-hidden
        />
        <ol className="relative flex justify-between">
          {steps.map((step) => {
            const active = currentStep >= step.id;
            return (
              <li key={step.id} className="flex flex-col items-center text-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors shadow-sm ${
                    active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600'
                  }`}
                  aria-current={currentStep === step.id ? 'step' : undefined}
                >
                  {step.id}
                </div>
                <span className="mt-2 text-xs font-medium text-gray-800">{step.title}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default ProgressSteps;
