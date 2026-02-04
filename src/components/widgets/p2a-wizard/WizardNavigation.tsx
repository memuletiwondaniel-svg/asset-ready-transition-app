import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Save, Loader2, Send } from 'lucide-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSave?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isSaving?: boolean;
  canProceed?: boolean;
  submitLabel?: string;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSave,
  onSubmit,
  isSubmitting = false,
  isSaving = false,
  canProceed = true,
  submitLabel = 'Submit',
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t bg-background">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={isFirstStep || isSubmitting}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving || isSubmitting}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Draft
          </Button>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground">
        Step {currentStep} of {totalSteps}
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
            disabled={isSubmitting || !canProceed}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
