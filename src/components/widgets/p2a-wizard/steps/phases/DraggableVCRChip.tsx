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
        'group flex items-center gap-2 px-3 py-2 rounded-lg border bg-card cursor-grab active:cursor-grabbing',
        'hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm transition-all select-none',
        isDragging && 'opacity-30 scale-95 ring-2 ring-primary/20 shadow-inner',
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="text-xs font-medium truncate">{vcr.name}</span>
      <span
        className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ml-auto"
        style={getVCRIdStyle(index)}
      >
        {vcr.code}
      </span>
    </div>
  );
};

/** Static VCR chip used inside DragOverlay (no drag hooks) */
export const VCRChipOverlay: React.FC<{ vcr: WizardVCR; index: number }> = ({ vcr, index }) => (
  <div
    className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border bg-card',
      'shadow-xl shadow-primary/10 ring-2 ring-primary/25',
      'cursor-grabbing select-none pointer-events-none',
      'animate-scale-in',
    )}
    style={{ minWidth: 180 }}
  >
    <GripVertical className="h-3.5 w-3.5 text-primary/50 shrink-0" />
    <span className="text-xs font-medium truncate">{vcr.name}</span>
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ml-auto"
      style={getVCRIdStyle(index)}
    >
      {vcr.code}
    </span>
  </div>
);
