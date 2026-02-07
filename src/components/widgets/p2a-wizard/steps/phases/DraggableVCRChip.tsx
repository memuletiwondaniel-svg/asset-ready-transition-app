import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardVCR } from '../VCRCreationStep';

export const VCR_ID_HUES = [210, 260, 180, 320, 195, 280, 170, 300];

export const getVCRIdStyle = (index: number) => {
  const hue = VCR_ID_HUES[index % VCR_ID_HUES.length];
  return {
    backgroundColor: `hsl(${hue}, 40%, 94%)`,
    color: `hsl(${hue}, 50%, 35%)`,
    borderColor: `hsl(${hue}, 35%, 88%)`,
  };
};

interface DraggableVCRChipProps {
  vcr: WizardVCR;
  index: number;
}

export const DraggableVCRChip: React.FC<DraggableVCRChipProps> = ({ vcr, index }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `vcr-${vcr.id}`,
    data: { type: 'vcr', vcrId: vcr.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-card cursor-grab active:cursor-grabbing',
        'hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-30 scale-95 ring-2 ring-primary/20 shadow-inner',
      )}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex flex-col min-w-0 gap-0.5">
        <span className="text-[11px] font-medium truncate leading-tight">{vcr.name}</span>
        <span
          className="text-[8px] font-mono px-1 py-px rounded border shrink-0 w-fit leading-tight"
          style={getVCRIdStyle(index)}
        >
          {vcr.code}
        </span>
      </div>
    </div>
  );
};

/** Static VCR chip used inside DragOverlay (no drag hooks) */
export const VCRChipOverlay: React.FC<{ vcr: WizardVCR; index: number }> = ({ vcr, index }) => (
  <div
    className={cn(
      'flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-card',
      'shadow-xl shadow-primary/10 ring-2 ring-primary/25',
      'cursor-grabbing select-none pointer-events-none',
      'animate-scale-in',
    )}
    style={{ minWidth: 120 }}
  >
    <GripVertical className="h-3 w-3 text-primary/50 shrink-0" />
    <div className="flex flex-col min-w-0 gap-0.5">
      <span className="text-[11px] font-medium truncate leading-tight">{vcr.name}</span>
      <span
        className="text-[8px] font-mono px-1 py-px rounded border shrink-0 w-fit leading-tight"
        style={getVCRIdStyle(index)}
      >
        {vcr.code}
      </span>
    </div>
  </div>
);
