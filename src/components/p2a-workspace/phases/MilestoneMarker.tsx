import React from 'react';
import { cn } from '@/lib/utils';
import { P2AMilestone } from '../hooks/useP2APhases';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MilestoneMarkerProps {
  milestone: P2AMilestone;
}

export const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({
  milestone,
}) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-shrink-0 w-8 flex flex-col items-center pt-4 pointer-events-auto">
            {/* Milestone icon */}
            <div className="relative flex items-center justify-center mb-1">
              <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500 shadow-sm ring-2 ring-slate-300/50 dark:ring-slate-600/50" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white/80" />
            </div>
            
            {/* Milestone code - small text */}
            <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap mb-2">
              {milestone.code || milestone.name?.slice(0, 2).toUpperCase()}
            </span>
            
            {/* Dotted vertical line - extends down and stops above unassigned section */}
            <div 
              className="flex-1 w-px border-l border-dashed border-border/40 pointer-events-none"
              style={{ minHeight: '200px' }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
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
