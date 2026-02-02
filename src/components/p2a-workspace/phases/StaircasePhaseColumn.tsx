import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Trash2, Edit, ArrowDown, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { P2APhase } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { DraggableHandoverPointCard } from '../handover-points/HandoverPointCard';
import { DeletePhaseDialog } from './DeletePhaseDialog';
import { useDroppable, useDndContext } from '@dnd-kit/core';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { active: dndActive } = useDndContext();
  const isSystemDragging = dndActive?.data.current?.type === 'system';

  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `phase-${phase.id}`,
    data: {
      type: 'phase',
      phase,
    },
  });

  // Only show phase highlight when dragging VCRs, not systems
  const showPhaseHighlight = isOver && !isSystemDragging;

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

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      onDeletePhase();
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Subtle background colors for phase headers - cycle through muted palette
  const phaseHeaderColors = [
    'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/30',
    'bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-900/30',
    'bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-900/20 dark:to-slate-900/30',
    'bg-gradient-to-r from-amber-50 to-slate-50 dark:from-amber-900/20 dark:to-slate-900/30',
    'bg-gradient-to-r from-violet-50 to-slate-50 dark:from-violet-900/20 dark:to-slate-900/30',
    'bg-gradient-to-r from-rose-50 to-slate-50 dark:from-rose-900/20 dark:to-slate-900/30',
    'bg-gradient-to-r from-cyan-50 to-slate-50 dark:from-cyan-900/20 dark:to-slate-900/30',
  ];
  const headerColorClass = phaseHeaderColors[phaseIndex % phaseHeaderColors.length];

  return (
    <>
      <div 
        ref={setNodeRef}
        className={cn(
          "flex-shrink-0 w-56 flex flex-col",
          isDragging && "opacity-50 z-50"
        )}
        style={style}
      >
        {/* Phase Header Card */}
        <div 
          className={cn(
            "group rounded-t-xl border border-b-0 p-3 transition-all duration-200 hover:shadow-md",
            headerColorClass,
            showPhaseHighlight ? 'border-primary' : 'border-border'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            {/* Drag handle for phase reordering */}
            <button 
              ref={setActivatorNodeRef}
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
              type="button"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-1 flex-1 justify-center">
              <h3 className="font-semibold text-sm truncate">
                Phase {phaseIndex + 1}: {phase.name}
              </h3>
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
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Phase
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* VCRs Container - Horizontal row layout, dynamic height */}
        <div 
          className={cn(
            "border border-t-0 rounded-b-xl p-3 min-h-[120px] max-h-[280px] overflow-y-auto transition-colors",
            showPhaseHighlight ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
          )}
        >
          {sortedPoints.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[100px]">
              <div className="text-center py-4">
                <ArrowDown className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                <div className="text-xs text-muted-foreground">
                  Drop VCRs here
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center content-start">
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

      <DeletePhaseDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        phase={phase}
        vcrCount={handoverPoints.length}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
};
