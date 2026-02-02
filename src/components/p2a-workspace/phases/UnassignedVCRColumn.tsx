import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Inbox } from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { DraggableHandoverPointCard } from '../handover-points/HandoverPointCard';
import { useDroppable, useDndContext } from '@dnd-kit/core';
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
  const { active: dndActive } = useDndContext();
  const isSystemDragging = dndActive?.data.current?.type === 'system';

  const { isOver, setNodeRef } = useDroppable({
    id: 'phase-unassigned',
    data: {
      type: 'phase',
      phaseId: null,
    },
  });

  // Only show highlight when dragging VCRs, not systems
  const showHighlight = isOver && !isSystemDragging;

  const sortedPoints = [...handoverPoints].sort((a, b) => a.position_y - b.position_y);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "w-full pt-2 transition-colors",
        showHighlight ? 'bg-primary/5' : 'bg-card/30'
      )}
    >
      {/* Compact Header */}
      <div className="flex items-center gap-2 px-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Unassigned VCRs
        </span>
        {sortedPoints.length > 0 && (
          <span className="text-xs text-muted-foreground/70">
            ({sortedPoints.length})
          </span>
        )}
      </div>

      {/* VCR Cards Container - Horizontal wrap with Add button inline */}
      <div className="px-2 pb-1 min-h-[50px]">
        <div className="flex flex-wrap gap-2 items-center">
          {sortedPoints.map((point) => (
            <DraggableHandoverPointCard
              key={point.id}
              handoverPoint={point}
              onClick={() => onOpenVCR(point)}
            />
          ))}
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
      </div>
    </div>
  );
};
