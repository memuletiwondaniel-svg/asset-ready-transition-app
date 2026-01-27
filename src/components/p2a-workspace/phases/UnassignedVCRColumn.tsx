import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowDown } from 'lucide-react';
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
 * A dedicated column for VCRs that are not currently in any phase (orphaned / unassigned).
 * This prevents "invisible" VCRs from continuing to own system assignments/colors.
 */
export const UnassignedVCRColumn: React.FC<UnassignedVCRColumnProps> = ({
  handoverPoints,
  onOpenVCR,
  onCreateHandoverPoint,
}) => {
  // Keep cards discoverable even if older data has out-of-range coordinates.
  const VCR_CANVAS_MAX_X = 72; // px
  const VCR_CANVAS_MAX_Y = 320; // px

  const { isOver, setNodeRef } = useDroppable({
    id: 'phase-unassigned',
    data: {
      type: 'phase',
      phaseId: null,
    },
  });

  const sortedPoints = [...handoverPoints].sort((a, b) => a.position_y - b.position_y);

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div
        className={cn(
          'rounded-t-xl border border-b-0 p-3',
          isOver ? 'border-primary bg-primary/10' : 'border-border bg-card'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">
              ∅
            </div>
            <h3 className="font-semibold text-sm truncate">Unassigned VCRs</h3>
          </div>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'border border-t-0 border-b-0 p-3 h-[360px] overflow-hidden transition-colors relative',
          isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
        )}
      >
        {sortedPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center py-4">
              <ArrowDown className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
              <div className="text-xs text-muted-foreground">Drop VCRs here</div>
            </div>
          </div>
        )}

        {sortedPoints.map((point) => (
          <div
            key={point.id}
            className="absolute"
            style={{
              left: `${Math.max(0, Math.min(VCR_CANVAS_MAX_X, point.position_x))}px`,
              top: `${Math.max(0, Math.min(VCR_CANVAS_MAX_Y, point.position_y))}px`,
            }}
          >
            <DraggableHandoverPointCard
              handoverPoint={point}
              onClick={() => onOpenVCR(point)}
            />
          </div>
        ))}
      </div>

      <div
        className={cn(
          'border border-t-0 rounded-b-xl p-2 transition-colors',
          isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-1 text-xs border border-dashed border-border/50 hover:border-primary/50"
          onClick={onCreateHandoverPoint}
          disabled={!onCreateHandoverPoint}
          title={onCreateHandoverPoint ? 'Create a VCR without a phase' : 'Create VCR is not available'}
        >
          <Plus className="w-3 h-3" />
          Add VCR (unassigned)
        </Button>
      </div>
    </div>
  );
};
