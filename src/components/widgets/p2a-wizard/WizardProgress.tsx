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
    <div className="flex items-start justify-between px-6 py-4 bg-muted/20 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
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
                "flex flex-col items-center gap-1.5 transition-all duration-200 min-w-0",
                isClickable && "cursor-pointer hover:scale-105",
                !isClickable && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 shrink-0",
                  isCompleted && !isCurrent && "bg-transparent text-emerald-600 border-2 border-emerald-600 dark:text-emerald-400 dark:border-emerald-400",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/15 shadow-sm shadow-primary/20 scale-105",
                  isVisitedButIncomplete && "bg-amber-100 text-amber-700 border border-amber-300 shadow-sm shadow-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-600",
                  !isCompleted && !isCurrent && !isVisitedButIncomplete && "bg-muted/80 text-muted-foreground border border-border/50"
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
                  "text-[11px] font-medium leading-tight text-center max-w-[72px] whitespace-pre-line transition-opacity duration-200",
                  isCurrent && "text-foreground",
                  isCompleted && !isCurrent && "text-muted-foreground",
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
                    "flex-1 h-[3px] rounded-full min-w-3 max-w-16 mt-4 transition-colors duration-200",
                    connectorDone ? "bg-emerald-300 dark:bg-emerald-700" : connectorInProgress ? "bg-amber-200 dark:bg-amber-700" : "bg-muted"
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
