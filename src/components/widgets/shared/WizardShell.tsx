import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Check, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { WizardNavigation } from '../p2a-wizard/WizardNavigation';

export interface WizardShellStep {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}

export interface WizardShellNavigationProps {
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
  lastSavedAt?: Date | null;
}

interface WizardShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible dialog title (hidden visually) */
  dialogTitle: string;
  /** Steps definition */
  steps: WizardShellStep[];
  /** Zero-indexed current step */
  currentStep: number;
  onStepChange: (idx: number) => void;
  /** Data-driven completion check */
  isStepComplete: (idx: number) => boolean;
  /** Visited but incomplete = amber warning */
  isStepWarning?: (idx: number) => boolean;
  /** Branded header content (icon + title + subtitle) */
  header: React.ReactNode;
  /** Actions in header area (delete, close buttons) */
  headerActions?: React.ReactNode;
  /** Banners between header and content (rejection, review, read-only) */
  banners?: React.ReactNode;
  /** Content pinned above footer (notes textarea, etc.) */
  pinnedFooterContent?: React.ReactNode;
  /** Step content */
  children: React.ReactNode;
  /** Navigation props — if omitted, no footer is rendered */
  navigation?: WizardShellNavigationProps;
  /** Override the footer entirely */
  customFooter?: React.ReactNode;
  /** Show sidebar step count at bottom */
  showStepCount?: boolean;
}

export const WizardShell: React.FC<WizardShellProps> = ({
  open,
  onOpenChange,
  dialogTitle,
  steps,
  currentStep,
  onStepChange,
  isStepComplete,
  isStepWarning,
  header,
  headerActions,
  banners,
  pinnedFooterContent,
  children,
  navigation,
  customFooter,
  showStepCount = true,
}) => {
  const isMobile = useIsMobile();
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "flex flex-col p-0 gap-0 [&>button]:hidden z-[100]",
        isMobile
          ? "!inset-0 !max-w-full !max-h-full !translate-x-0 !translate-y-0 !rounded-none border-0 h-[100dvh] w-full"
          : "sm:max-w-6xl sm:w-[95vw] sm:h-[min(88vh,800px)] sm:!max-h-[88vh]"
      )}>
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>Step-by-step wizard</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        <div className={cn("flex h-full overflow-hidden", isMobile ? "flex-col" : "")}>
          {/* ─── Mobile: Header + Pill Tabs ─── */}
          {isMobile ? (
            <div className="shrink-0 border-b border-border/60">
              {/* Header row */}
              <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {header}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {headerActions}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {/* Step pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 px-3 scrollbar-none">
                {steps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isComplete = isStepComplete(idx);
                  const isWarning = isStepWarning?.(idx) ?? false;
                  return (
                    <button
                      key={step.id}
                      onClick={() => onStepChange(idx)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : isComplete
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : isWarning
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isComplete && !isActive ? (
                        <Check className="w-3 h-3" />
                      ) : isWarning && !isActive ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : (
                        <span className="text-[10px]">{idx + 1}</span>
                      )}
                      {isActive && step.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ─── Desktop: Vertical Sidebar ─── */
            <div className="w-56 shrink-0 bg-muted/30 border-r border-border/60 flex flex-col">
              {/* Header in sidebar */}
              <div className="p-4 pb-2 border-b border-border/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">{header}</div>
                  <div className="flex items-center gap-0.5 shrink-0">{headerActions}</div>
                </div>
              </div>

              {/* Step list */}
              <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                {steps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isComplete = isStepComplete(idx);
                  const isWarning = isStepWarning?.(idx) ?? false;
                  const StepIcon = step.icon;

                  return (
                    <button
                      key={step.id}
                      onClick={() => onStepChange(idx)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : isComplete
                            ? 'hover:bg-muted/60 text-foreground'
                            : isWarning
                              ? 'hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                              : 'hover:bg-muted/40 text-muted-foreground'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium',
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : isComplete
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : isWarning
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                      )}>
                        {isComplete && !isActive ? (
                          <Check className="w-3 h-3" />
                        ) : isWarning && !isActive ? (
                          <AlertCircle className="w-3 h-3" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className="truncate text-xs font-medium">{step.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sidebar footer */}
              {showStepCount && (
                <div className="px-4 py-3 border-t border-border/40">
                  <p className="text-[10px] text-muted-foreground">
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ─── Content Area ─── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Banners */}
            {banners}

            {/* Step content header (desktop only — shows step name + description) */}
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
              {children}
            </div>

            {/* Pinned footer content (notes, etc.) */}
            {pinnedFooterContent}

            {/* Footer Navigation */}
            {customFooter ? customFooter : navigation ? (
              <WizardNavigation
                currentStep={currentStep + 1}
                totalSteps={steps.length}
                onBack={navigation.onBack}
                onNext={navigation.onNext}
                onSaveAndExit={navigation.onSaveAndExit}
                onSave={navigation.onSave}
                onSubmit={navigation.onSubmit}
                onApprove={navigation.onApprove}
                onReject={navigation.onReject}
                isSubmitting={navigation.isSubmitting}
                isSaving={navigation.isSaving}
                canProceed={navigation.canProceed}
                canGoBack={navigation.canGoBack}
                submitLabel={navigation.submitLabel}
                saveAndExitLabel={navigation.saveAndExitLabel}
                isReviewMode={navigation.isReviewMode}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
