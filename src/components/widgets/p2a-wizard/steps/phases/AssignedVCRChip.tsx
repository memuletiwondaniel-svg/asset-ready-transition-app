import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Box, Flame } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { WizardVCR } from '../VCRCreationStep';
import { WizardSystem } from '../SystemsImportStep';
import { getVCRIdStyle } from './DraggableVCRChip';
import { shortVCRCode } from './vcrDisplayUtils';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';

interface AssignedVCRChipProps {
  vcr: WizardVCR;
  vcrIndex: number;
  onUnassign: (vcrId: string) => void;
  onVCRClick?: (vcr: WizardVCR) => void;
  /** Systems assigned to this VCR (for hover popover) */
  vcrSystems?: WizardSystem[];
}

export const AssignedVCRChip: React.FC<AssignedVCRChipProps> = ({ vcr, vcrIndex, onUnassign, onVCRClick, vcrSystems }) => {
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

  const vcrColor = getVCRColor(vcr.code);

  const chipContent = (
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
          {shortVCRCode(vcr.code)}
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

  if (!vcrSystems || vcrSystems.length === 0) return chipContent;

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {chipContent}
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={4}
        collisionPadding={16}
        avoidCollisions
        className="w-56 p-0 rounded-xl shadow-xl border overflow-hidden z-[100]"
      >
        <div
          className="px-3 py-2 border-b"
          style={{ background: vcrColor?.background, borderColor: vcrColor?.border }}
        >
          <div className="text-xs font-semibold truncate">{vcr.name}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{shortVCRCode(vcr.code)}</div>
        </div>
        <div className="p-2 max-h-48 overflow-y-auto">
          <div className="space-y-0.5">
            {vcrSystems.map(sys => (
              <div key={sys.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-muted/50">
                <Box className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-medium truncate flex-1">{sys.name}</span>
                {sys.is_hydrocarbon && (
                  <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
