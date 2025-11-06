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
    <div className="mt-4 mb-3 animate-fade-in">
      <div className="flex items-center justify-center max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isActive = currentStep >= step.number;
          const isCurrent = currentStep === step.number;
          
          return (
            <div 
              key={step.number} 
              className="flex items-center animate-smooth-in"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center">
                <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ease-out aspect-square ${
                  isActive 
                    ? 'bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-2xl ring-4 ring-primary/30 scale-110' 
                    : 'bg-gradient-to-br from-muted/60 to-muted/40 text-muted-foreground border-2 border-border/30 shadow-sm scale-100'
                } ${isCurrent ? 'animate-pulse' : ''}`}>
                  <span className={`font-semibold text-sm z-10 transition-all duration-300 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}>
                    {step.number}
                  </span>
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 animate-pulse"></div>
                  )}
                </div>
                <div className="ml-4 text-left transition-all duration-300">
                  <span className={`block text-sm font-bold tracking-wide transition-all duration-300 ${
                    isActive 
                      ? 'text-foreground scale-105' 
                      : 'text-muted-foreground/90 scale-100'
                  }`}>
                    {step.title}
                  </span>
                  <span className={`block text-xs font-medium mt-0.5 transition-all duration-300 ${
                    isActive 
                      ? 'text-foreground/80 opacity-100' 
                      : 'text-muted-foreground/70 opacity-80'
                  }`}>
                    {step.subtitle}
                  </span>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="relative mx-8 min-w-[120px]">
                  <div className="h-1.5 rounded-full bg-muted transition-all duration-300"></div>
                  <div 
                    className={`absolute top-0 left-0 h-1.5 rounded-full transition-all duration-700 ease-out ${
                      currentStep > step.number 
                        ? 'bg-gradient-to-r from-primary via-primary/90 to-primary/80 shadow-lg shadow-primary/20 w-full' 
                        : 'w-0'
                    }`}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChecklistProgressSteps;