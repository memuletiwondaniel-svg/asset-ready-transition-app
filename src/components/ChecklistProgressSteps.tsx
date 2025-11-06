import React from 'react';
import { Check } from 'lucide-react';

interface ChecklistProgressStepsProps {
  currentStep: number;
}

const ChecklistProgressSteps: React.FC<ChecklistProgressStepsProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: "Checklist Information", subtitle: "Basic details and reason" },
    { number: 2, title: "Select Items", subtitle: "Choose checklist items" },
    { number: 3, title: "Review Checklist", subtitle: "Review and submit" }
  ];

  return (
    <div className="py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between relative">
          {/* Progress Line Background */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border/30" />
          
          {/* Active Progress Line */}
          <div 
            className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all duration-700 ease-out"
            style={{ 
              width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%'
            }}
          />

        {steps.map((step) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;
          
          return (
            <div 
              key={step.number} 
              className="flex flex-col items-center relative"
              style={{ width: `${100 / steps.length}%` }}
            >
              {/* Step Circle */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center 
                transition-all duration-300 border-2
                ${isCompleted 
                  ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30' 
                  : isActive
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg scale-110'
                    : 'bg-background border-border text-muted-foreground'
                }
              `}>
                {isCompleted ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <span className="font-semibold text-sm">
                    {step.number}
                  </span>
                )}
              </div>
              
              {/* Step Text */}
              <div className="mt-3 text-center max-w-[120px]">
                <div className={`
                  text-sm font-semibold transition-colors duration-300
                  ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                `}>
                  {step.title}
                </div>
                <div className={`
                  text-xs mt-0.5 transition-colors duration-300
                  ${isActive || isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/60'}
                `}>
                  {step.subtitle}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

export default ChecklistProgressSteps;