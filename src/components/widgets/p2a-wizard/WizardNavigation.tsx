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
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-t bg-background shrink-0 gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={!canGoBack || isSubmitting || isSaving}
          className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
          <span className="hidden xs:inline">Back</span>
        </Button>
        {onSaveAndExit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveAndExit}
            disabled={isSaving || isSubmitting}
            className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
            )}
            <span className="hidden sm:inline">{saveAndExitLabel || 'Save & Exit'}</span>
            <span className="sm:hidden">{saveAndExitLabel === 'Close' ? 'Close' : 'Exit'}</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Review mode: show Approve/Reject only on last step */}
        {isReviewMode && isLastStep && onApprove && onReject ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={onReject}
              disabled={isSubmitting}
              className="gap-1 sm:gap-1.5 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
            >
              <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Reject</span>
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isSubmitting}
              className="gap-1 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span className="hidden xs:inline">Approve</span>
            </Button>
          </>
        ) : isLastStep && onSubmit ? (
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting || !canProceed}
            className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
            )}
            {submitLabel}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onNext}
            disabled={isSubmitting || isSaving || !canProceed}
            className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1 animate-spin" />
            ) : null}
            Next
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};
