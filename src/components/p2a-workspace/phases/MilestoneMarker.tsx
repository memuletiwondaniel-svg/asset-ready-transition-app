import React from 'react';
import { cn } from '@/lib/utils';
import { P2AMilestone } from '../hooks/useP2APhases';
import { format } from 'date-fns';
import { Flag } from 'lucide-react';

interface MilestoneMarkerProps {
  milestone: P2AMilestone;
  isFirst?: boolean;
  isLast?: boolean;
}

export const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({
  milestone,
  isFirst,
  isLast,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20',
      isFirst && 'ml-0',
      isLast && 'mr-0'
    )}>
      {/* Flag Icon */}
      <Flag className="w-2.5 h-2.5 text-primary fill-primary/30" />

      {/* Milestone Info - Inline */}
      <span className="text-[9px] font-medium text-primary whitespace-nowrap">
        {milestone.code || milestone.name}
      </span>
      {milestone.target_date && (
        <span className="text-[8px] text-muted-foreground whitespace-nowrap">
          {format(new Date(milestone.target_date), 'MMM yy')}
        </span>
      )}
    </div>
  );
};
