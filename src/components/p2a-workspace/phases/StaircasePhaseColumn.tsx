import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Trash2, Edit, ArrowDown, CheckCircle2, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { P2APhase } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { DraggableHandoverPointCard } from '../handover-points/HandoverPointCard';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface StaircasePhaseColumnProps {
  phase: P2APhase;
  phaseIndex: number;
  handoverPoints: P2AHandoverPoint[];
  staircaseOffset: number;
  onCreateHandoverPoint: () => void;
  onEditPhase: () => void;
  onDeletePhase: () => void;
  onOpenVCR: (point: P2AHandoverPoint) => void;
  projectCode?: string;
  isFirstPhase: boolean;
  isLastPhase: boolean;
}

export const StaircasePhaseColumn: React.FC<StaircasePhaseColumnProps> = ({
  phase,
  phaseIndex,
  handoverPoints,
  staircaseOffset,
  onCreateHandoverPoint,
  onEditPhase,
  onDeletePhase,
  onOpenVCR,
  projectCode,
  isFirstPhase,
  isLastPhase,
}) => {
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `phase-${phase.id}`,
    data: {
      type: 'phase',
      phase,
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
   setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: phase.id,
    data: {
      type: 'phase-column',
      phase,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingTop: staircaseOffset,
  };

  // Combine refs
  const setNodeRef = (node: HTMLDivElement | null) => {
    setDroppableRef(node);
    setSortableRef(node);
  };

  // Sort VCRs by position for consistent ordering
  const sortedPoints = [...handoverPoints].sort((a, b) => a.position_y - b.position_y);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-72 flex flex-col",
        isDragging && "opacity-50 z-50"
      )}
      style={style}
    >
      {/* Phase Header Card */}
      <div 
        className={cn(
          "group rounded-t-xl border border-b-0 p-3 transition-all duration-200 hover:shadow-md hover:bg-accent/50",
          isOver ? 'border-primary bg-primary/10' : 'border-border bg-card'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {/* Drag handle for phase reordering */}
            <button 
              ref={setActivatorNodeRef}
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
              type="button"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {phaseIndex + 1}
            </div>
            <h3 className="font-semibold text-sm truncate">{phase.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem onClick={onEditPhase}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Phase
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeletePhase} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Phase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* VCRs Container - Free-form positioning */}
      <div 
        className={cn(
          "border border-t-0 rounded-b-xl p-3 h-[400px] overflow-hidden transition-colors relative",
          isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
        )}
      >
        {sortedPoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pb-12">
            <div className="text-center py-4">
              <ArrowDown className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
              <div className="text-xs text-muted-foreground">
                Drop VCRs here
              </div>
            </div>
          </div>
        )}
        
        {sortedPoints.map((point) => (
          <div 
            key={point.id} 
            className="absolute"
            style={{
              left: `${point.position_x}px`,
              top: `${point.position_y}px`,
            }}
          >
            <DraggableHandoverPointCard
              handoverPoint={point}
              onClick={() => onOpenVCR(point)}
            />
          </div>
        ))}
        
        {/* Add VCR Button at bottom - always on top */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[200px] gap-1 text-xs border border-dashed border-border/50 hover:border-primary/50 z-20 bg-card/90 backdrop-blur-sm"
          onClick={onCreateHandoverPoint}
        >
          <Plus className="w-3 h-3" />
          Add VCR
        </Button>
      </div>

      {/* Flow indicator to next phase */}
      {!isLastPhase && (
        <div className="flex justify-center py-2">
          <ArrowDown className="w-4 h-4 text-muted-foreground/30" />
        </div>
      )}
    </div>
  );
};
