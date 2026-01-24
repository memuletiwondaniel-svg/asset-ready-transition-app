import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Trash2, Edit, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { P2APhase } from '../hooks/useP2APhases';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { HandoverPointCard, DroppableHandoverPointCard } from '../handover-points/HandoverPointCard';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface PhaseColumnProps {
  phase: P2APhase;
  handoverPoints: P2AHandoverPoint[];
  onCreateHandoverPoint: () => void;
  onEditPhase: () => void;
  onDeletePhase: () => void;
  onOpenVCR: (point: P2AHandoverPoint) => void;
  projectCode?: string;
}

export const PhaseColumn: React.FC<PhaseColumnProps> = ({
  phase,
  handoverPoints,
  onCreateHandoverPoint,
  onEditPhase,
  onDeletePhase,
  onOpenVCR,
  projectCode,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `phase-${phase.id}`,
    data: {
      type: 'phase',
      phase,
    },
  });

  const phasePoints = handoverPoints.filter(hp => hp.phase_id === phase.id);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 h-full flex flex-col rounded-xl border transition-colors',
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50'
      )}
      style={{ 
        borderTopColor: phase.color,
        borderTopWidth: '3px',
      }}
    >
      {/* Phase Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: phase.color }}
            />
            <h3 className="font-semibold text-sm truncate">{phase.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      </div>

      {/* Handover Points */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {phasePoints.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-8">
              <div className="text-xs text-muted-foreground mb-2">
                No handover points
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
          phasePoints.map(point => (
            <DroppableHandoverPointCard
              key={point.id}
              handoverPoint={point}
              onClick={() => onOpenVCR(point)}
            />
          ))
        )}
      </div>

      {/* Add VCR Button */}
      {phasePoints.length > 0 && (
        <div className="p-2 border-t border-border">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full gap-1 text-xs"
            onClick={onCreateHandoverPoint}
          >
            <Plus className="w-3 h-3" />
            Add Handover Point
          </Button>
        </div>
      )}
    </div>
  );
};
