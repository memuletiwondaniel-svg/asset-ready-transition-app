import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Send, LogOut } from 'lucide-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSaveAndExit?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isSaving?: boolean;
  canProceed?: boolean;
  canGoBack?: boolean;
  submitLabel?: string;
  saveAndExitLabel?: string;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSaveAndExit,
  onSubmit,
  isSubmitting = false,
  isSaving = false,
  canProceed = true,
  canGoBack = true,
  submitLabel = 'Submit',
  saveAndExitLabel,
}) => {
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t bg-background">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={!canGoBack || isSubmitting || isSaving}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {onSaveAndExit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveAndExit}
            disabled={isSaving || isSubmitting}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-1" />
            )}
            Save & Exit
          </Button>
        )}
      </div>

      <div>
        {isLastStep && onSubmit ? (
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting || !canProceed}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            {submitLabel}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onNext}
            disabled={isSubmitting || isSaving || !canProceed}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : null}
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
