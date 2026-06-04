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
 * Rules:
 *  - PENDING    : outline circle, muted number visible.
 *  - CURRENT    : filled primary circle, number visible in white.
 *  - COMPLETED  : filled emerald circle, NUMBER REMAINS VISIBLE in white,
 *                 small white check shown as a top-right corner badge.
 *  - SKIPPED    : amber outline ring, number visible in amber.
 */
export const StepCircle: React.FC<StepCircleProps> = ({
  state,
  number,
  size = 'default',
  className,
}) => {
  const isSmall = size === 'small';
  const dim = isSmall ? 'w-6 h-6 text-[11px]' : 'w-8 h-8 text-xs';
  const checkBadge = isSmall ? 'w-3 h-3 -top-0.5 -right-0.5' : 'w-3.5 h-3.5 -top-1 -right-1';
  const checkIcon = isSmall ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold transition-colors border',
          dim,
          state === 'current' && 'bg-primary text-primary-foreground border-primary',
          state === 'completed' && 'bg-emerald-500 text-white border-emerald-500',
          state === 'skipped' && 'bg-transparent border-2 border-amber-500 text-amber-600 dark:text-amber-400',
          state === 'pending' && 'bg-background border-border text-muted-foreground',
        )}
      >
        {number}
      </div>
      {state === 'completed' && (
        <div
          className={cn(
            'absolute rounded-full bg-emerald-600 border border-background flex items-center justify-center',
            checkBadge,
          )}
        >
          <Check className={cn('text-white', checkIcon)} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};
