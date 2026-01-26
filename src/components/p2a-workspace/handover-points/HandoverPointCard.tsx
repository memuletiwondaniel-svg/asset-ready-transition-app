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
 * Uses the LAST numeric portion (sequence number) to ensure distinct colors.
 * e.g., VCR-300-001 -> 1, VCR-300-004 -> 4
 */
const getVCRColor = (vcrCode: string | undefined) => {
  const code = vcrCode || 'DEFAULT';
  
  // Extract ALL numbers and use the last one (the sequence number)
  // e.g., "VCR-300-001" -> ["300", "001"] -> use "001" -> 1
  const numericMatches = code.match(/\d+/g);
  const lastNumber = numericMatches && numericMatches.length > 0 
    ? parseInt(numericMatches[numericMatches.length - 1], 10) 
    : 0;
  
  // Safe hue values spread across cyan, blue, purple, magenta
  const baseHues = [180, 195, 210, 230, 250, 270, 290, 310, 325];
  const hueIndex = lastNumber % baseHues.length;
  const hue = baseHues[hueIndex];
  
  // Vary saturation and lightness for additional distinction
  const saturation = 55 + ((lastNumber * 3) % 15); // 55-70%
  const lightness = 88 + (lastNumber % 5); // 88-93%
  const borderLightness = 55 + ((lastNumber * 2) % 15); // 55-70%
  
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

          <div className="flex-1 min-w-0">
            {/* Name & Code Row */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium truncate">
                {handoverPoint.name}
              </span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground shrink-0">
                {handoverPoint.vcr_code?.replace(/^VCR-?/i, 'VCR-').slice(0, 7) || 'VCR-???'}
              </span>
            </div>

            {/* Progress % only */}
            <div className="flex items-center mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {progress}% complete
              </span>
            </div>
          </div>
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
