import React from 'react';

interface ChecklistProgressStepsProps {
  currentStep: number;
}

const ChecklistProgressSteps: React.FC<ChecklistProgressStepsProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: "Step 1", subtitle: "Enter Checklist Information" },
    { number: 2, title: "Step 2", subtitle: "Select Checklist Items" },
    { number: 3, title: "Step 3", subtitle: "Review Checklist & Submit" }
  ];

  return (
    <div className="mt-4 mb-3">
      <div className="flex items-center justify-center max-w-2xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center">
               <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 aspect-square ${
                 currentStep >= step.number 
                   ? 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white shadow-2xl ring-4 ring-blue-400/40 shadow-blue-500/50 hover-scale animate-fade-in' 
                   : 'bg-gradient-to-br from-card/60 to-card/40 text-muted-foreground border-2 border-border/30 shadow-sm backdrop-blur-sm'
               }`}>
                <span className="font-semibold text-sm">{step.number}</span>
                 {currentStep >= step.number && (
                   <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/50 to-purple-500/50 animate-pulse"></div>
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
               <div className={`flex-1 h-1.5 mx-8 rounded-full transition-all duration-700 min-w-[120px] ${
                 currentStep > step.number 
                   ? 'bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/30 animate-fade-in' 
                   : 'bg-gradient-to-r from-border/40 to-border/20 backdrop-blur-sm'
               }`}></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChecklistProgressSteps;