import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Inbox } from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { DraggableHandoverPointCard } from '../handover-points/HandoverPointCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface UnassignedVCRColumnProps {
  handoverPoints: P2AHandoverPoint[];
  onOpenVCR: (point: P2AHandoverPoint) => void;
  onCreateHandoverPoint?: () => void;
}

/**
 * A horizontal bar for VCRs that are not currently in any phase (orphaned / unassigned).
 * Positioned at the bottom of the workspace.
 */
export const UnassignedVCRColumn: React.FC<UnassignedVCRColumnProps> = ({
  handoverPoints,
  onOpenVCR,
  onCreateHandoverPoint,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'phase-unassigned',
    data: {
      type: 'phase',
      phaseId: null,
    },
  });

  const sortedPoints = [...handoverPoints].sort((a, b) => a.position_y - b.position_y);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "w-full border-t pt-3 transition-colors",
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/30'
      )}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Unassigned VCRs
          </span>
          {sortedPoints.length > 0 && (
            <span className="text-xs text-muted-foreground/70">
              ({sortedPoints.length})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs border border-dashed border-border/50 hover:border-primary/50"
          onClick={onCreateHandoverPoint}
          disabled={!onCreateHandoverPoint}
        >
          <Plus className="w-3 h-3" />
          Add VCR
        </Button>
      </div>

      {/* VCR Cards Container - Horizontal wrap */}
      <div className="px-2 pb-2 min-h-[60px]">
        {sortedPoints.length === 0 ? (
          <div className="flex items-center justify-center h-[60px] rounded-lg border border-dashed border-border/50 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Drop VCRs here or they'll appear here when phases are deleted
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sortedPoints.map((point) => (
              <DraggableHandoverPointCard
                key={point.id}
                handoverPoint={point}
                onClick={() => onOpenVCR(point)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
