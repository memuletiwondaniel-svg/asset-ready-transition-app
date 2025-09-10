import React from 'react';

interface ChecklistProgressStepsProps {
  currentStep: number;
}

const ChecklistProgressSteps: React.FC<ChecklistProgressStepsProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, title: "Step 1", subtitle: "Enter Checklist Information" },
    { number: 2, title: "Step 2", subtitle: "Create Checklist Items" },
    { number: 3, title: "Step 3", subtitle: "Review Checklist & Submit" }
  ];

  return (
    <div className="mt-4 mb-3">
      <div className="flex items-center justify-center max-w-2xl mx-auto">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex items-center">
               <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 aspect-square ${
                 currentStep >= step.number 
                   ? 'bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 text-white shadow-xl ring-4 ring-purple-500/30 shadow-purple-500/40' 
                   : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 border-2 border-gray-300/50 shadow-sm'
               }`}>
                <span className="font-semibold text-sm">{step.number}</span>
                 {currentStep >= step.number && (
                   <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/30 to-cyan-400/30 animate-pulse"></div>
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
               <div className={`flex-1 h-1 mx-8 rounded-full transition-all duration-500 min-w-[120px] ${
                 currentStep > step.number 
                   ? 'bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 shadow-sm' 
                   : 'bg-gradient-to-r from-gray-200 to-gray-300'
               }`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ChecklistProgressSteps;