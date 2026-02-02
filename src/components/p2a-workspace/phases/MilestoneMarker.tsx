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
            'relative flex flex-col items-center cursor-default',
            isFirst && 'ml-0',
            isLast && 'mr-0'
          )}>
            {/* Marker row */}
            <div className="flex items-center gap-1.5">
              {/* Circular marker */}
              <div className="relative flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500 shadow-sm ring-2 ring-slate-300/50 dark:ring-slate-600/50" />
                <div className="absolute w-1.5 h-1.5 rounded-full bg-white/80" />
              </div>
              
              {/* Code/Name */}
              <span className="text-[10px] font-medium text-foreground whitespace-nowrap">
                {milestone.code || milestone.name}
              </span>
            </div>
            
            {/* Vertical divider line extending down */}
            <div 
              className="absolute top-full left-1.5 w-px bg-border/30 pointer-events-none"
              style={{ height: 'calc(100vh - 100px)' }}
            />
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
