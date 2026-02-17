import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_date: string | null;
  status: string;
}

interface MilestonesTimelineProps {
  milestones: Milestone[];
}

export const MilestonesTimeline: React.FC<MilestonesTimelineProps> = ({ milestones }) => {
  if (milestones.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-3">No milestones defined</p>
    );
  }

  const sortedMilestones = [...milestones].sort((a, b) => {
    if (!a.milestone_date) return 1;
    if (!b.milestone_date) return -1;
    return new Date(a.milestone_date).getTime() - new Date(b.milestone_date).getTime();
  });

  return (
    <div className="space-y-0">
      {sortedMilestones.map((milestone, index) => {
        const isCompleted = milestone.status === 'completed';
        const isLast = index === sortedMilestones.length - 1;

        return (
          <div key={milestone.id} className="flex items-center gap-3 py-1.5">
            {/* Simple dot / check */}
            <div className="flex flex-col items-center self-stretch">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                isCompleted
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "border-2 border-border bg-background"
              )}>
                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
              </div>
              {!isLast && (
                <div className={cn(
                  "w-px flex-1 min-h-[8px]",
                  isCompleted ? "bg-emerald-500/30" : "bg-border"
                )} />
              )}
            </div>

            {/* Name + Date inline */}
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className={cn(
                "text-xs truncate",
                isCompleted ? "text-muted-foreground line-through" : "text-foreground font-medium"
              )}>
                {milestone.milestone_name}
              </span>
              {milestone.milestone_date && (
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 ml-2">
                  {format(new Date(milestone.milestone_date), 'dd MMM yy')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
