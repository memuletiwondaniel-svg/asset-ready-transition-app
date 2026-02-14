import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: number;
  title: string;
  description: string;
}

interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps?: Set<number>;
  onStepClick?: (step: number) => void;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStep,
  completedSteps = new Set(),
  onStepClick,
}) => {
  return (
    <div className="flex items-start justify-between px-6 py-3 border-b bg-muted/30">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = completedSteps.has(stepNumber);
        const isCurrent = currentStep === stepNumber;
        const isPast = currentStep > stepNumber;
        const isVisitedButIncomplete = isPast && !isCompleted;
        const isClickable = !!onStepClick;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => isClickable && onStepClick?.(stepNumber)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all min-w-0",
                isClickable && "cursor-pointer hover:opacity-80",
                !isClickable && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0",
                  isCompleted && !isCurrent && "bg-emerald-500 text-white",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isVisitedButIncomplete && "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600",
                  !isCompleted && !isCurrent && !isVisitedButIncomplete && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isVisitedButIncomplete ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight text-center max-w-[60px] whitespace-pre-line",
                  isCurrent && "text-foreground",
                  isCompleted && !isCurrent && "text-emerald-600 dark:text-emerald-400",
                  isVisitedButIncomplete && "text-amber-600 dark:text-amber-400",
                  !isCurrent && !isCompleted && !isVisitedButIncomplete && "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </button>
            {index < steps.length - 1 && (() => {
              const nextStepNumber = stepNumber + 1;
              const nextIsCompleted = completedSteps.has(nextStepNumber);
              const nextIsVisited = currentStep >= nextStepNumber;
              const connectorDone = isCompleted && nextIsCompleted;
              const connectorInProgress = isCompleted && nextIsVisited && !nextIsCompleted;
              return (
                <div
                  className={cn(
                    "flex-1 h-0.5 min-w-3 max-w-16 mt-3.5 transition-colors",
                    connectorDone ? "bg-emerald-500" : connectorInProgress ? "bg-amber-300 dark:bg-amber-600" : "bg-muted"
                  )}
                />
              );
            })()}
          </React.Fragment>
        );
      })}
    </div>
  );
};
