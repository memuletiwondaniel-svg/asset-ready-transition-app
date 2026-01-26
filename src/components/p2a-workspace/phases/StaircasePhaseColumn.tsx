import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Trash2, Edit, ArrowDown, CheckCircle2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { P2APhase } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { DraggableHandoverPointCard } from '../handover-points/HandoverPointCard';
import { useDroppable } from '@dnd-kit/core';
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
  const { isOver, setNodeRef } = useDroppable({
    id: `phase-${phase.id}`,
    data: {
      type: 'phase',
      phase,
    },
  });

  // Sort VCRs by position for consistent ordering
  const sortedPoints = [...handoverPoints].sort((a, b) => a.position_y - b.position_y);

  return (
    <div 
      ref={setNodeRef}
      className="flex-shrink-0 w-72 flex flex-col"
      style={{ paddingTop: staircaseOffset }}
    >
      {/* Phase Header Card */}
      <div 
        className={cn(
          "rounded-t-xl border border-b-0 p-3 transition-colors",
          isOver ? 'border-primary bg-primary/10' : 'border-border bg-card'
        )}
        style={{ 
          borderTopColor: phase.color,
          borderTopWidth: '4px',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {phaseIndex + 1}
            </div>
            <h3 className="font-semibold text-sm truncate">{phase.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
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

        {/* Milestone badges */}
        <div className="flex flex-wrap gap-1 text-[10px]">
          {phase.start_milestone && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              From: {phase.start_milestone.code || phase.start_milestone.name}
            </Badge>
          )}
          {phase.end_milestone && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              To: {phase.end_milestone.code || phase.end_milestone.name}
            </Badge>
          )}
        </div>

        {phase.description && (
          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
            {phase.description}
          </p>
        )}

        {/* Phase stats */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" />
            <span>{handoverPoints.length} VCR{handoverPoints.length !== 1 ? 's' : ''}</span>
          </div>
          {isFirstPhase && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Start
            </Badge>
          )}
          {isLastPhase && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              Handover
            </Badge>
          )}
        </div>
      </div>

      {/* VCRs Container */}
      <div 
        className={cn(
          "border border-t-0 rounded-b-xl p-3 space-y-2 h-[280px] overflow-y-auto transition-colors",
          isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
        )}
      >
        {sortedPoints.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-4">
              <ArrowDown className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
              <div className="text-xs text-muted-foreground mb-2">
                Drop systems here or
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={onCreateHandoverPoint}
              >
                <Plus className="w-3 h-3" />
                Add VCR
              </Button>
            </div>
          </div>
        ) : (
          <>
            {sortedPoints.map((point) => (
              <DraggableHandoverPointCard
                key={point.id}
                handoverPoint={point}
                onClick={() => onOpenVCR(point)}
              />
            ))}
            
            {/* Add VCR Button at bottom */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full gap-1 text-xs border border-dashed border-border/50 hover:border-primary/50"
              onClick={onCreateHandoverPoint}
            >
              <Plus className="w-3 h-3" />
              Add VCR
            </Button>
          </>
        )}
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
