import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Send, LogOut, CheckCircle, XCircle } from 'lucide-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSaveAndExit?: () => void;
  onSave?: () => void;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
  isSaving?: boolean;
  canProceed?: boolean;
  canGoBack?: boolean;
  submitLabel?: string;
  saveAndExitLabel?: string;
  isReviewMode?: boolean;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSaveAndExit,
  onSave,
  onSubmit,
  onApprove,
  onReject,
  isSubmitting = false,
  isSaving = false,
  canProceed = true,
  canGoBack = true,
  submitLabel = 'Submit',
  saveAndExitLabel,
  isReviewMode = false,
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
        {onSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSaving || isSubmitting}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : null}
            Save
          </Button>
        )}
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
            {saveAndExitLabel || 'Save & Exit'}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Review mode: show Approve/Reject on last step */}
        {isReviewMode && isLastStep && onApprove && onReject ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={onReject}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isSubmitting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve
            </Button>
          </>
        ) : isLastStep && onSubmit ? (
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
