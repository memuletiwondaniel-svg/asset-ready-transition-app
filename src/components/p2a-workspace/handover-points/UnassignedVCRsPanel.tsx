import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileCheck, MoreHorizontal, MoveRight, Eye } from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { P2APhase } from '../hooks/useP2APhases';
import { cn } from '@/lib/utils';

interface UnassignedVCRsPanelProps {
  vcrs: P2AHandoverPoint[];
  phases: P2APhase[];
  onOpenVCR: (vcr: P2AHandoverPoint) => void;
  onAssignToPhase: (vcrId: string, phaseId: string | null) => void;
}

export const UnassignedVCRsPanel: React.FC<UnassignedVCRsPanelProps> = ({
  vcrs,
  phases,
  onOpenVCR,
  onAssignToPhase,
}) => {
  if (vcrs.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-border bg-amber-500/5">
      <div className="flex items-center gap-2 mb-2">
        <FileCheck className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Unassigned VCRs ({vcrs.length})
        </span>
        <span className="text-xs text-muted-foreground">
          — Assign these to a phase to include them in the timeline
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {vcrs.map(vcr => (
          <div
            key={vcr.id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
              "bg-card hover:bg-accent/50 transition-colors",
              "border-amber-200 dark:border-amber-800/50"
            )}
          >
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
              {vcr.vcr_code}
            </span>
            <span className="text-sm truncate max-w-[150px]" title={vcr.name}>
              {vcr.name}
            </span>
            
            <div className="flex items-center gap-1 ml-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onOpenVCR(vcr)}
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  {phases.length > 0 ? (
                    <>
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        Assign to Phase
                      </div>
                      {phases.map(phase => (
                        <DropdownMenuItem
                          key={phase.id}
                          onClick={() => onAssignToPhase(vcr.id, phase.id)}
                          className="gap-2"
                        >
                          <MoveRight className="w-3.5 h-3.5" />
                          {phase.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      Create a phase first to assign VCRs
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
