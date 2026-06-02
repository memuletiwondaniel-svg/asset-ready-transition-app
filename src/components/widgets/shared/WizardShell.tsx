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
  /** Branded header content (icon + title + subtitle) — shown in sidebar/mobile header when topHeader is not provided */
  header: React.ReactNode;
  /** Actions in header area (delete, close buttons) */
  headerActions?: React.ReactNode;
  /** Optional full-width top header band rendered above the sidebar+content row. When provided, replaces the sidebar/mobile compact header. */
  topHeader?: React.ReactNode;
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
  topHeader,
  banners,
  pinnedFooterContent,
  children,
  navigation,
  customFooter,
  showStepCount = true,
}) => {
  const isMobile = useIsMobile();
  const isLastStep = currentStep === steps.length - 1;
  const showStepList = steps.length > 0;
  const hasTopHeader = !!topHeader;

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

        <div className="flex flex-col h-full overflow-hidden">
          {hasTopHeader && (
            <div className="shrink-0 border-b border-border/60 bg-card/40">
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-1 sm:py-1">
                <div className="min-w-0 flex-1">{topHeader}</div>
                <div className="flex items-center gap-1 shrink-0">
                  {headerActions}
                </div>
              </div>
            </div>
          )}
        <div className={cn("flex flex-1 min-h-0 overflow-hidden", isMobile ? "flex-col" : "")}>
          {/* ─── Mobile: Header + Pill Tabs ─── */}
          {isMobile ? (
            <div className="shrink-0 border-b border-border/60">
              {!hasTopHeader && (
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
              )}
              {showStepList && (
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
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all border',
                          isActive
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : isComplete
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : isWarning
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                                : 'bg-muted text-muted-foreground border-transparent'
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
              )}
            </div>
          ) : (
            /* ─── Desktop: Vertical Sidebar ─── */
            <div className="w-60 shrink-0 bg-muted/20 border-r border-border/60 flex flex-col">
              {!hasTopHeader && (
                <div className="p-4 border-b border-border/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">{header}</div>
                    <div className="flex items-center gap-0.5 shrink-0">{headerActions}</div>
                  </div>
                </div>
              )}

              {showStepList ? (
                <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                  {showStepList && (
                    <div className="px-2 pt-1 pb-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Navigate</p>
                    </div>
                  )}
                  {steps.map((step, idx) => {
                    const isActive = idx === currentStep;
                    const isComplete = isStepComplete(idx);
                    const isWarning = isStepWarning?.(idx) ?? false;

                    return (
                      <button
                        key={step.id}
                        onClick={() => onStepChange(idx)}
                        className={cn(
                          'group relative w-full flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-md text-left transition-all text-sm border-l-2',
                          isActive
                            ? 'bg-primary/[0.08] text-foreground border-primary'
                            : isComplete
                              ? 'border-transparent hover:bg-muted/60 text-foreground'
                              : isWarning
                                ? 'border-transparent hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                                : 'border-transparent hover:bg-muted/40 text-muted-foreground'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold transition-colors',
                          isComplete && !isActive
                            ? 'bg-emerald-500 text-white border border-emerald-500'
                            : isActive
                              ? 'bg-primary text-primary-foreground border border-primary'
                              : isWarning
                                ? 'bg-background border border-amber-400 text-amber-700 dark:text-amber-400'
                                : 'bg-background border border-border text-muted-foreground'
                        )}>
                          {isComplete && !isActive ? (
                            <Check className="w-3 h-3" strokeWidth={3} />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span className={cn(
                          'truncate text-xs',
                          isActive ? 'font-semibold' : 'font-medium'
                        )}>
                          {step.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {showStepCount && showStepList && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
