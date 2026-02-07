import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, PackageOpen } from 'lucide-react';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { DraggableHandoverPointCard } from '../handover-points/HandoverPointCard';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface UnassignedVCRPanelProps {
  handoverPoints: P2AHandoverPoint[];
  onOpenVCR: (point: P2AHandoverPoint) => void;
  onCreateHandoverPoint?: () => void;
}

/**
 * A vertical right-side panel for VCRs not assigned to any phase.
 * Mirrors the SystemsPanel layout on the left side.
 */
export const UnassignedVCRPanel: React.FC<UnassignedVCRPanelProps> = ({
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
        "w-48 flex flex-col border-l border-border bg-card overflow-hidden min-h-0 flex-shrink-0 transition-colors",
        showHighlight && "bg-primary/5"
      )}
    >
      {/* Header */}
      <div className="p-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <PackageOpen className="w-4 h-4 text-muted-foreground shrink-0" />
          <h3 className="font-semibold text-sm flex-1">VCRs</h3>
          {sortedPoints.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {sortedPoints.length}
            </span>
          )}
        </div>
      </div>

      {/* VCR Cards - vertical scroll */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-3 space-y-2">
          {sortedPoints.length === 0 ? (
            <div className="text-center py-6">
              <PackageOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-[10px] text-muted-foreground">
                No unassigned VCRs
              </p>
              <p className="text-[9px] text-muted-foreground/60 mt-1">
                Drop VCRs here to unassign
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedPoints.map((point) => (
                <DraggableHandoverPointCard
                  key={point.id}
                  handoverPoint={point}
                  onClick={() => onOpenVCR(point)}
                />
              ))}
            </div>
          )}

          {/* Add VCR button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 px-2 gap-1 text-xs border border-dashed border-border/50 hover:border-primary/50"
            onClick={onCreateHandoverPoint}
            disabled={!onCreateHandoverPoint}
          >
            <Plus className="w-3 h-3" />
            Add VCR
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};
