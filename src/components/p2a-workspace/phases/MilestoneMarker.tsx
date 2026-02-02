import React from 'react';
import { cn } from '@/lib/utils';
import { P2AMilestone } from '../hooks/useP2APhases';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-1.5 cursor-default',
            isFirst && 'ml-0',
            isLast && 'mr-0'
          )}>
            {/* Diamond marker */}
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rotate-45 bg-amber-500 rounded-[2px] shadow-sm" />
              <div className="absolute w-1.5 h-1.5 rotate-45 bg-amber-200 rounded-[1px]" />
            </div>
            
            {/* Code/Name */}
            <span className="text-[10px] font-medium text-foreground whitespace-nowrap">
              {milestone.code || milestone.name}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="font-medium">{milestone.name}</div>
          {milestone.target_date && (
            <div className="text-muted-foreground">
              Target: {format(new Date(milestone.target_date), 'MMM dd, yyyy')}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
