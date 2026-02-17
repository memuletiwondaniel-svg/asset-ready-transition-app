import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

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
    <div className="space-y-2">
      {sortedMilestones.map((milestone) => {
        const isCompleted = milestone.status === 'completed';

        return (
          <div key={milestone.id} className="flex items-center gap-2.5">
            {/* Minimal dot or check */}
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
              isCompleted
                ? "bg-muted-foreground/20 text-muted-foreground"
                : "border border-border"
            )}>
              {isCompleted && <Check className="h-2.5 w-2.5" />}
            </div>

            {/* Name + Date */}
            <span className={cn(
              "text-xs flex-1 truncate",
              isCompleted ? "text-muted-foreground" : "text-foreground"
            )}>
              {milestone.milestone_name}
            </span>
            {milestone.milestone_date && (
              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                {format(new Date(milestone.milestone_date), 'dd MMM yy')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
