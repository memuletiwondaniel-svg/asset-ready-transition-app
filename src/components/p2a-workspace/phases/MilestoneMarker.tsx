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
      'flex flex-col items-center justify-center px-2',
      isFirst && 'pl-0',
      isLast && 'pr-0'
    )}>
      {/* Milestone Diamond */}
      <div className="relative">
        <div className="w-4 h-4 bg-primary rotate-45 rounded-sm" />
        <div className="absolute inset-0.5 bg-background rotate-45 rounded-sm" />
        <div className="absolute inset-1 bg-primary rotate-45 rounded-sm" />
      </div>

      {/* Milestone Info */}
      <div className="mt-2 text-center min-w-[60px]">
        <div className="text-[10px] font-semibold text-foreground truncate max-w-[80px]">
          {milestone.code || milestone.name}
        </div>
        {milestone.target_date && (
          <div className="text-[9px] text-muted-foreground">
            {format(new Date(milestone.target_date), 'MMM yyyy')}
          </div>
        )}
      </div>
    </div>
  );
};
