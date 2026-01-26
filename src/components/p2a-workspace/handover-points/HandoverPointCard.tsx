import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Layers, GripVertical, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';

/**
 * Generates a unique, vibrant HSL-based color from a VCR code.
 * Format: VCR-XXX-DPYYY where XXX is the sequence number
 * e.g., VCR-001-DP300 -> uses 1 for color generation
 */
const getVCRColor = (vcrCode: string | undefined) => {
  const code = vcrCode || 'DEFAULT';
  
  // Extract sequence number from new format VCR-XXX-DPYYY
  // e.g., "VCR-001-DP300" -> "001" -> 1
  const seqMatch = code.match(/^VCR-(\d+)-DP/);
  let seqNumber = 0;
  
  if (seqMatch) {
    seqNumber = parseInt(seqMatch[1], 10);
  } else {
    // Fallback for old format VCR-YYY-XXX: use last number
    const numericMatches = code.match(/\d+/g);
    seqNumber = numericMatches && numericMatches.length > 0 
      ? parseInt(numericMatches[numericMatches.length - 1], 10) 
      : 0;
  }
  
  // Safe hue values spread across cyan, blue, purple, magenta
  const baseHues = [180, 195, 210, 230, 250, 270, 290, 310, 325];
  const hueIndex = seqNumber % baseHues.length;
  const hue = baseHues[hueIndex];
  
  // Vary saturation and lightness for additional distinction
  const saturation = 55 + ((seqNumber * 3) % 15); // 55-70%
  const lightness = 88 + (seqNumber % 5); // 88-93%
  const borderLightness = 55 + ((seqNumber * 2) % 15); // 55-70%
  
  return {
    background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
    accent: `hsl(${hue}, ${saturation + 15}%, ${lightness - 15}%)`,
  };
};

interface HandoverPointCardProps {
  handoverPoint: P2AHandoverPoint;
  onClick?: () => void;
  isDropTarget?: boolean;
  isDragging?: boolean;
  compact?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'SIGNED':
      return { 
        label: 'Signed', 
        color: 'bg-emerald-500', 
        icon: CheckCircle2,
        borderColor: 'border-emerald-500/30'
      };
    case 'READY':
      return { 
        label: 'Ready', 
        color: 'bg-blue-500', 
        icon: CheckCircle2,
        borderColor: 'border-blue-500/30'
      };
    case 'IN_PROGRESS':
      return { 
        label: 'In Progress', 
        color: 'bg-amber-500', 
        icon: Clock,
        borderColor: 'border-amber-500/30'
      };
    default:
      return { 
        label: 'Pending', 
        color: 'bg-slate-400', 
        icon: AlertTriangle,
        borderColor: 'border-border'
      };
  }
};

export const HandoverPointCard: React.FC<HandoverPointCardProps> = ({
  handoverPoint,
  onClick,
  isDropTarget = false,
  isDragging = false,
  compact = false,
}) => {
  const statusConfig = getStatusConfig(handoverPoint.status);
  const StatusIcon = statusConfig.icon;
  const vcrColor = getVCRColor(handoverPoint.vcr_code);

  // Calculate progress (mock for now - would be based on prerequisites)
  const progress = handoverPoint.status === 'SIGNED' ? 100 :
                   handoverPoint.status === 'READY' ? 90 :
                   handoverPoint.status === 'IN_PROGRESS' ? 50 : 0;

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-md border',
        isDropTarget && 'ring-2 ring-primary ring-offset-2',
        isDragging && 'opacity-50 shadow-lg rotate-2'
      )}
      style={{
        backgroundColor: isDropTarget ? 'hsl(var(--primary) / 0.05)' : vcrColor.background,
        borderColor: isDropTarget ? 'hsl(var(--primary))' : vcrColor.border,
      }}
      onClick={onClick}
    >
    <CardContent className="p-2">
        <div className="flex items-center gap-2">
          {/* Drag Handle - hidden by default, shown on hover */}
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Status indicator */}
          <div className={cn(
            'w-5 h-5 rounded flex items-center justify-center shrink-0',
            statusConfig.color.replace('bg-', 'bg-').replace('500', '500/15'),
            statusConfig.color.replace('bg-', 'text-')
          )}>
            <StatusIcon className="w-3 h-3" />
          </div>

          {/* Name & ID stacked */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground block">
              {/* Display VCR-XXX: handle both old (VCR-300-001) and new (VCR-001-DP300) formats */}
              {(() => {
                const code = handoverPoint.vcr_code || '';
                // New format: VCR-001-DP300 -> VCR-001
                const newMatch = code.match(/^(VCR-\d+)-DP/);
                if (newMatch) return newMatch[1];
                // Old format: VCR-300-001 -> VCR-001 (use last number)
                const oldMatch = code.match(/(\d+)$/);
                if (oldMatch) return `VCR-${oldMatch[1]}`;
                return 'VCR-???';
              })()}
            </span>
            <span className="text-xs font-medium truncate block">
              {handoverPoint.name}
            </span>
          </div>

          {/* Progress % on the right */}
          <span className="text-xs font-semibold text-muted-foreground shrink-0">
            {progress}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Sortable + Droppable version for phase columns (supports vertical reordering)
export const DraggableHandoverPointCard: React.FC<HandoverPointCardProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.handoverPoint.id,
    data: {
      type: 'vcr',
      handoverPoint: props.handoverPoint,
    },
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `vcr-${props.handoverPoint.id}`,
    data: {
      type: 'vcr',
      handoverPoint: props.handoverPoint,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={(node) => {
        setSortableRef(node);
        setDropRef(node);
      }}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(isDragging && 'z-50')}
    >
      <HandoverPointCard {...props} isDropTarget={isOver} isDragging={isDragging} />
    </div>
  );
};

// Droppable-only version (legacy, for receiving systems)
export const DroppableHandoverPointCard: React.FC<HandoverPointCardProps> = (props) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `vcr-${props.handoverPoint.id}`,
    data: {
      type: 'vcr',
      handoverPoint: props.handoverPoint,
    },
  });

  return (
    <div ref={setNodeRef}>
      <HandoverPointCard {...props} isDropTarget={isOver} />
    </div>
  );
};
