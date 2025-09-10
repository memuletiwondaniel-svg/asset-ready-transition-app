import React from 'react';

interface ChecklistProgressStepsProps {
  currentStep: number;
}

const ChecklistProgressSteps: React.FC<ChecklistProgressStepsProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: "Step 1", subtitle: "Enter Checklist Information" },
    { number: 2, title: "Step 2", subtitle: "Select Checklist Items" }
  ];

  return (
    <div className="mt-16 mb-3">
      <div className="flex items-center justify-center max-w-2xl mx-auto">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex items-center">
              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                currentStep >= step.number 
                  ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20' 
                  : 'bg-muted text-muted-foreground border-2 border-border'
              }`}>
                <span className="font-semibold text-sm">{step.number}</span>
                {currentStep >= step.number && (
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
                )}
              </div>
              <div className="ml-4 text-left">
                <span className={`block text-sm font-medium ${
                  currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
                <span className={`block text-xs ${
                  currentStep >= step.number ? 'text-muted-foreground' : 'text-muted-foreground/70'
                }`}>
                  {step.subtitle}
                </span>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-8 rounded-full transition-all duration-500 min-w-[120px] ${
                currentStep > step.number 
                  ? 'bg-gradient-to-r from-primary to-primary' 
                  : 'bg-border'
              }`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ChecklistProgressSteps;