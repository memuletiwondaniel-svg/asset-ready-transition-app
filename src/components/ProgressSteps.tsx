
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
    <div className="mb-10 animate-fade-in">
      <div className="relative max-w-3xl mx-auto">
        {/* Track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-[6px] rounded-full bg-muted transition-all duration-300" aria-hidden />
        {/* Progress */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-4 h-[6px] rounded-full bg-primary transition-all duration-700 ease-out shadow-sm"
          style={{ width: `calc(${progressPercent}% - 0.5rem)` }}
          aria-hidden
        />
        <ol className="relative flex justify-between">
          {steps.map((step, index) => {
            const active = currentStep >= step.id;
            const isCurrent = currentStep === step.id;
            return (
              <li 
                key={step.id} 
                className="flex flex-col items-center text-center"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-500 ease-out ${
                    active 
                      ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg' 
                      : 'bg-background border-muted-foreground/30 text-muted-foreground scale-100 shadow-sm'
                  } ${isCurrent ? 'animate-pulse ring-4 ring-primary/20' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className={`transition-all duration-300 ${active ? 'scale-110 font-semibold' : 'scale-100'}`}>
                    {step.id}
                  </span>
                </div>
                <span className={`mt-2 text-xs font-medium transition-all duration-300 ${
                  active ? 'text-foreground scale-105' : 'text-muted-foreground scale-100'
                }`}>
                  {step.title}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default ProgressSteps;
