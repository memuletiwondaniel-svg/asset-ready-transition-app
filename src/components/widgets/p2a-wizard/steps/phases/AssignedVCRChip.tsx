import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from '../VCRCreationStep';
import { getVCRIdStyle } from './DraggableVCRChip';

interface AssignedVCRChipProps {
  vcr: WizardVCR;
  vcrIndex: number;
  onUnassign: (vcrId: string) => void;
  onVCRClick?: (vcr: WizardVCR) => void;
}

export const AssignedVCRChip: React.FC<AssignedVCRChipProps> = ({ vcr, vcrIndex, onUnassign, onVCRClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `vcr-${vcr.id}`,
    data: { type: 'vcr', vcrId: vcr.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/vcr flex items-center gap-1.5 p-1.5 rounded-md bg-background/80 border text-[11px] transition-colors hover:bg-background hover:shadow-sm cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30 scale-95 ring-2 ring-primary/20 shadow-inner z-50',
      )}
    >
      <GripVertical
        className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover/vcr:opacity-100 transition-opacity"
        {...listeners}
        {...attributes}
      />
      <div
        className="flex flex-col min-w-0 flex-1 gap-0.5 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onVCRClick?.(vcr); }}
      >
        <span className="truncate font-medium">{vcr.name}</span>
        <span
          className="text-[8px] font-mono px-1 py-px rounded border shrink-0 w-fit leading-tight"
          style={getVCRIdStyle(vcrIndex >= 0 ? vcrIndex : 0)}
        >
          {vcr.code}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onUnassign(vcr.id); }}
        className="opacity-0 group-hover/vcr:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
        title="Unassign VCR"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
