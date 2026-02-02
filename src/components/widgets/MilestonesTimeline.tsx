import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast, isToday } from 'date-fns';

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_date: string | null;
  status: string;
}

interface MilestonesTimelineProps {
  milestones: Milestone[];
}

// Generate milestone code from name (e.g., "RFSU" -> "SD-01", "PAC Handover" -> "SD-02")
const getMilestoneCode = (name: string, index: number): string => {
  const prefix = 'SD';
  const num = String(index + 1).padStart(2, '0');
  return `${prefix}-${num}`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'in_progress':
      return <Clock className="h-4 w-4" />;
    default:
      return <Circle className="h-4 w-4" />;
  }
};

const getStatusColors = (status: string, date: string | null) => {
  const isOverdue = date && isPast(new Date(date)) && status !== 'completed';
  
  if (status === 'completed') {
    return {
      bg: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500',
      badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    };
  }
  if (isOverdue) {
    return {
      bg: 'bg-red-500',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500',
      badge: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
    };
  }
  if (status === 'in_progress') {
    return {
      bg: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500',
      badge: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
    };
  }
  return {
    bg: 'bg-muted-foreground/40',
    text: 'text-muted-foreground',
    border: 'border-muted-foreground/40',
    badge: 'bg-muted border-border text-muted-foreground',
  };
};

export const MilestonesTimeline: React.FC<MilestonesTimelineProps> = ({ milestones }) => {
  if (milestones.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border/30 text-center">
        <p className="text-sm text-muted-foreground">No milestones defined</p>
      </div>
    );
  }

  // Sort milestones by date
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (!a.milestone_date) return 1;
    if (!b.milestone_date) return -1;
    return new Date(a.milestone_date).getTime() - new Date(b.milestone_date).getTime();
  });

  return (
    <div className="space-y-1">
      {sortedMilestones.map((milestone, index) => {
        const colors = getStatusColors(milestone.status, milestone.milestone_date);
        const code = getMilestoneCode(milestone.milestone_name, index);
        const isLast = index === sortedMilestones.length - 1;
        
        return (
          <div key={milestone.id} className="relative flex gap-3">
            {/* Timeline line and node */}
            <div className="flex flex-col items-center">
              {/* Node */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm",
                colors.bg
              )}>
                {getStatusIcon(milestone.status)}
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div className={cn(
                  "w-0.5 flex-1 min-h-[24px]",
                  milestone.status === 'completed' ? 'bg-emerald-500/50' : 'bg-border'
                )} />
              )}
            </div>
            
            {/* Content */}
            <div className={cn(
              "flex-1 pb-4",
              isLast && "pb-0"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  {/* Milestone code badge */}
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px] font-mono px-1.5 py-0", colors.badge)}
                  >
                    {code}
                  </Badge>
                  {/* Milestone name */}
                  <p className="text-sm font-medium">{milestone.milestone_name}</p>
                </div>
                
                {/* Date */}
                {milestone.milestone_date && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs shrink-0",
                    colors.text
                  )}>
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">
                      {format(new Date(milestone.milestone_date), 'dd MMM yyyy')}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Status text for non-completed */}
              {milestone.status !== 'completed' && milestone.milestone_date && (
                <p className={cn("text-xs mt-1", colors.text)}>
                  {isPast(new Date(milestone.milestone_date)) 
                    ? `Overdue by ${Math.abs(differenceInDays(new Date(), new Date(milestone.milestone_date)))} days`
                    : isToday(new Date(milestone.milestone_date))
                      ? 'Due today'
                      : `${differenceInDays(new Date(milestone.milestone_date), new Date())} days remaining`
                  }
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
