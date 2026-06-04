import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepCircleState = 'pending' | 'current' | 'completed' | 'skipped';

interface StepCircleProps {
  state: StepCircleState;
  number: number;
  size?: 'default' | 'small';
  className?: string;
}

/**
 * Canonical step-circle primitive used by every wizard shell / sub-stepper in ORSH.
 *
 * RULE (do not regress): Completed state must ALWAYS show the step digit. The
 * check is a SECONDARY indicator rendered as a small corner badge — it is
 * never a replacement for the digit. If at a given size the corner badge
 * would crowd the digit, the badge is dropped and the emerald fill alone
 * signals completion.
 *
 * States:
 *  - PENDING    : outline circle, muted digit visible.
 *  - CURRENT    : filled primary circle, white digit visible.
 *  - COMPLETED  : filled emerald circle, white digit visible (always),
 *                 small white-on-emerald check as a corner badge sitting on
 *                 the top-right perimeter — `default` size only. At `small`
 *                 size the badge is omitted; the emerald fill is the cue.
 *  - SKIPPED    : amber outline ring, amber digit visible.
 */
export const StepCircle: React.FC<StepCircleProps> = ({
  state,
  number,
  size = 'default',
  className,
}) => {
  const isSmall = size === 'small';
  // Main circle: ~32px (default) / ~24px (small)
  const dim = isSmall ? 'w-6 h-6 text-[11px]' : 'w-8 h-8 text-[13px]';
  // Corner badge: ~12px on the default circle (≈38%), pushed outward so it
  // sits on the perimeter without intruding on the digit.
  // At `small`, the badge is intentionally omitted (see rule above).
  const badgeSize = 'w-3 h-3 -top-1 -right-1';
  const checkIconSize = 'w-2 h-2';
  const showCornerBadge = state === 'completed' && !isSmall;

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold leading-none transition-colors border',
          dim,
          state === 'current' && 'bg-primary text-primary-foreground border-primary',
          state === 'completed' && 'bg-emerald-500 text-white border-emerald-500',
          state === 'skipped' && 'bg-transparent border-2 border-amber-500 text-amber-600 dark:text-amber-400',
          state === 'pending' && 'bg-background border-border text-muted-foreground',
        )}
      >
        {/* Digit MUST always render in completed state — do not replace with Check. */}
        {number}
      </div>
      {showCornerBadge && (
        <div
          className={cn(
            'absolute rounded-full bg-emerald-600 ring-2 ring-background flex items-center justify-center pointer-events-none',
            badgeSize,
          )}
        >
          <Check className={cn('text-white', checkIconSize)} strokeWidth={3.5} />
        </div>
      )}
    </div>
  );
};
