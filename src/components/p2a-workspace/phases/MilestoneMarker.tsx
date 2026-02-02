import React from 'react';
import { cn } from '@/lib/utils';
import { P2AMilestone } from '../hooks/useP2APhases';
import { format } from 'date-fns';

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
      'flex flex-col items-center justify-center px-1.5',
      isFirst && 'pl-0',
      isLast && 'pr-0'
    )}>
      {/* Milestone Diamond */}
      <div className="relative">
        <div className="w-2.5 h-2.5 bg-primary rotate-45 rounded-[2px]" />
        <div className="absolute inset-[2px] bg-background rotate-45 rounded-[1px]" />
        <div className="absolute inset-[3px] bg-primary rotate-45 rounded-[1px]" />
      </div>

      {/* Milestone Info */}
      <div className="mt-1 text-center min-w-[50px]">
        <div className="text-[9px] font-medium text-foreground truncate max-w-[60px]">
          {milestone.code || milestone.name}
        </div>
        {milestone.target_date && (
          <div className="text-[8px] text-muted-foreground">
            {format(new Date(milestone.target_date), 'MMM yy')}
          </div>
        )}
      </div>
    </div>
  );
};
