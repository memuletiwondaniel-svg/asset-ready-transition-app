import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Loader2, Send, LogOut, CheckCircle, XCircle, Trash2 } from 'lucide-react';

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
  onDelete?: () => void;
  isSubmitting?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
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
  onDelete,
  isSubmitting = false,
  isSaving = false,
  isDeleting = false,
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              disabled={!canGoBack || isSubmitting || isSaving}
              aria-label="Back"
              className="h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Back</TooltipContent>
        </Tooltip>
        {onSaveAndExit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSaveAndExit}
                disabled={isSaving || isSubmitting}
                aria-label="Close & Exit"
                className="h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Close & Exit</TooltipContent>
          </Tooltip>
        )}
        {onDelete && (
          <>
            <div className="w-px h-5 bg-border/60 mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  disabled={isDeleting}
                  aria-label="Delete P2A Plan"
                  className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Delete</TooltipContent>
            </Tooltip>
          </>
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
