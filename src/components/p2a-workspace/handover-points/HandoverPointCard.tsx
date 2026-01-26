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
 * Generates a unique, subtle HSL-based color from a VCR code.
 * Avoids red, amber, and green to prevent confusion with status indicators.
 */
const getVCRColor = (vcrCode: string | undefined) => {
  const code = vcrCode || 'DEFAULT';
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  
  // Safe hue ranges: cyan (170-200), blue (200-260), purple (260-290), magenta/pink (290-330)
  const safeHueRanges = [
    { start: 170, end: 200 },
    { start: 200, end: 260 },
    { start: 260, end: 290 },
    { start: 290, end: 330 },
  ];
  
  const totalRange = safeHueRanges.reduce((sum, range) => sum + (range.end - range.start), 0);
  let position = Math.abs(hash) % totalRange;
  let hue = 0;
  
  for (const range of safeHueRanges) {
    const rangeSize = range.end - range.start;
    if (position < rangeSize) {
      hue = range.start + position;
      break;
    }
    position -= rangeSize;
  }
  
  // Very subtle background - high lightness, low saturation
  const saturation = 35 + (Math.abs(hash >> 8) % 15); // 35-50%
  const lightness = 94 + (Math.abs(hash >> 16) % 4); // 94-98% (very light)
  const borderLightness = 75 + (Math.abs(hash >> 24) % 10); // 75-85%
  
  return {
    background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation - 10}%, ${borderLightness}%)`,
    accent: `hsl(${hue}, ${saturation + 10}%, ${lightness - 10}%)`,
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
        'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
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
        <div className="flex items-center gap-1.5">
          {/* Drag Handle */}
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground">
            <GripVertical className="w-3 h-3" />
          </div>

          {/* Status indicator */}
          <div className={cn(
            'w-4 h-4 rounded flex items-center justify-center shrink-0',
            statusConfig.color.replace('bg-', 'bg-').replace('500', '500/10'),
            statusConfig.color.replace('bg-', 'text-')
          )}>
            <StatusIcon className="w-2.5 h-2.5" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Name & Code Row */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium truncate flex-1">
                {handoverPoint.name}
              </span>
              <span className="text-[8px] font-mono text-muted-foreground shrink-0">
                {handoverPoint.vcr_code}
              </span>
            </div>

            {/* Progress Row */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <Progress value={progress} className="h-1 flex-1" />
              <span className="text-[8px] font-medium shrink-0 w-5 text-right text-muted-foreground">
                {progress}%
              </span>
              <Badge variant="secondary" className="text-[7px] px-0.5 py-0 h-3">
                {handoverPoint.systems_count || 0} sys
              </Badge>
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
