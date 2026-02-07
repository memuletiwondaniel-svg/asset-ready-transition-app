import React, { useState, useRef, useEffect } from 'react';
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
  showMapping?: boolean;
  vcrAlignmentTargets?: Record<string, number>;
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
  showMapping = false,
  vcrAlignmentTargets = {},
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const vcrContainerRef = useRef<HTMLDivElement>(null);
  const [containerTop, setContainerTop] = useState(0);

  // Measure the VCR container's top position relative to the workspace
  useEffect(() => {
    if (!showMapping || !vcrContainerRef.current) return;
    const measure = () => {
      const el = vcrContainerRef.current;
      if (!el) return;
      // Get position relative to the workspace container (closest relative/abs parent)
      const workspaceEl = el.closest('[data-workspace-container]') || el.offsetParent;
      if (!workspaceEl) return;
      const containerRect = (workspaceEl as HTMLElement).getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setContainerTop(elRect.top - containerRect.top);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [showMapping, handoverPoints]);

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

  // When mapping is active, sort VCRs by vcr_code to match system panel order (minimizes crossings)
  // Otherwise sort by position for free-form layout
  const sortedPoints = showMapping
    ? [...handoverPoints].sort((a, b) => (a.vcr_code || '').localeCompare(b.vcr_code || ''))
    : [...handoverPoints].sort((a, b) => a.position_y - b.position_y);

  // Check if we have alignment targets for absolute positioning
  const hasAlignmentTargets = showMapping && Object.keys(vcrAlignmentTargets).length > 0;

  // Compute min-height for the container when using absolute positioning
  const CARD_HEIGHT = 42;
  const computedMinHeight = hasAlignmentTargets
    ? Math.max(400, ...sortedPoints.map((p) => {
        const targetY = vcrAlignmentTargets[p.id];
        if (targetY === undefined) return 0;
        return targetY - containerTop + CARD_HEIGHT + 12; // 12px bottom padding
      }))
    : undefined;

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
        {/* Phase Header Card - sticky at top when scrolling */}
        <div 
          className={cn(
            "group rounded-t-xl border border-b-0 p-3 transition-all duration-200 hover:shadow-md sticky z-10",
            headerColorClass,
            showPhaseHighlight ? 'border-primary' : 'border-border'
          )}
          style={{ top: staircaseOffset }}
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

        {/* VCRs Container - Expand vertically when mapping is active */}
        <div 
          ref={vcrContainerRef}
          className={cn(
            "border border-t-0 rounded-b-xl p-3 transition-colors",
            showMapping ? 'min-h-[400px]' : 'min-h-[200px]',
            showPhaseHighlight ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
          )}
          style={showMapping && hasAlignmentTargets ? { position: 'relative', minHeight: computedMinHeight } : undefined}
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
          ) : showMapping && hasAlignmentTargets ? (
            /* Absolute positioning mode: each VCR placed at its system group's Y */
            <>
              {sortedPoints.map((point) => {
                const targetY = vcrAlignmentTargets[point.id];
                // Card height is ~42px (p-1.5 + content); estimate half-height for centering
                const CARD_HALF_HEIGHT = 21;
                const topOffset = targetY !== undefined
                  ? Math.max(0, targetY - containerTop - CARD_HALF_HEIGHT)
                  : undefined;

                return (
                  <div
                    key={point.id}
                    style={topOffset !== undefined ? {
                      position: 'absolute',
                      top: topOffset,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      transition: 'top 0.3s ease',
                    } : {
                      marginBottom: 8,
                    }}
                  >
                    <DraggableHandoverPointCard
                      handoverPoint={point}
                      onClick={() => onOpenVCR(point)}
                    />
                  </div>
                );
              })}
            </>
          ) : (
            <div className={cn(
              "flex flex-col items-center content-start",
              showMapping ? 'gap-6' : 'gap-2',
              !showMapping && 'flex-wrap flex-row justify-center'
            )}>
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
