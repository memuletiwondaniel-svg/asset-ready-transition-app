import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_date: string | null;
  status: string;
  is_scorecard_project?: boolean;
}

interface MilestonesTimelineProps {
  milestones: Milestone[];
}

/**
 * Milestones — 3-column grid: name / date / state.
 *
 * State column:
 *   • achieved (status === 'completed') → green "Achieved"
 *   • next (first non-completed by date) → bold "Next"
 *   • future → muted em-dash
 *
 * Checkbox circles and the SCORECARD chip have been removed per the
 * 2026-07-18 Project-Page deviation batch.
 */
export const MilestonesTimeline: React.FC<MilestonesTimelineProps> = ({ milestones }) => {
  if (milestones.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground italic">No milestones defined.</p>
    );
  }

  const sorted = [...milestones].sort((a, b) => {
    if (!a.milestone_date) return 1;
    if (!b.milestone_date) return -1;
    return new Date(a.milestone_date).getTime() - new Date(b.milestone_date).getTime();
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // NEXT = first non-completed milestone whose date is today or in the future.
  // Past-dated non-completed milestones are treated as "Overdue" (never NEXT).
  const firstUpcomingIdx = sorted.findIndex(m => {
    if (m.status === 'completed') return false;
    if (!m.milestone_date) return false;
    return new Date(m.milestone_date).getTime() >= startOfToday.getTime();
  });

  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-[12px] items-center">
      {sorted.map((m, i) => {
        const isCompleted = m.status === 'completed';
        const dateMs = m.milestone_date ? new Date(m.milestone_date).getTime() : null;
        const isOverdue = !isCompleted && dateMs !== null && dateMs < startOfToday.getTime();
        const isNext = !isCompleted && i === firstUpcomingIdx;
        return (
          <React.Fragment key={m.id}>
            <span
              className={cn(
                'truncate leading-snug',
                isCompleted && 'text-muted-foreground',
                isNext && 'font-semibold text-foreground',
                isOverdue && 'text-foreground/85',
                !isCompleted && !isNext && !isOverdue && 'text-foreground/85',
              )}
            >
              {m.milestone_name}
            </span>
            <span className={cn('text-[11px] tabular-nums shrink-0', isOverdue ? 'text-amber-600' : 'text-muted-foreground')}>
              {m.milestone_date ? format(new Date(m.milestone_date), 'dd MMM yy') : '—'}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider tabular-nums shrink-0 min-w-[62px] text-right">
              {isCompleted ? (
                <span className="text-emerald-600">Achieved</span>
              ) : isOverdue ? (
                <span className="text-amber-600 font-semibold">Overdue</span>
              ) : isNext ? (
                <span className="text-foreground font-semibold">Next</span>
              ) : (
                <span className="text-muted-foreground/50">—</span>
              )}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

