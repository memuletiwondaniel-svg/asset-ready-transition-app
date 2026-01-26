import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Layers, GripVertical, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';

/**
 * Generates a unique, subtle HSL-based color from a VCR code.
 * Avoids red, amber, and green to prevent confusion with status indicators.
 */
const getVCRColor = (vcrCode: string) => {
  let hash = 0;
  for (let i = 0; i < vcrCode.length; i++) {
    hash = vcrCode.charCodeAt(i) + ((hash << 5) - hash);
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
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <div className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                {handoverPoint.vcr_code}
              </Badge>
              <Badge className={cn('text-[10px] px-1.5 py-0', statusConfig.color)}>
                <StatusIcon className="w-2.5 h-2.5 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Name */}
            <h4 className="font-medium text-sm truncate mb-1">
              {handoverPoint.name}
            </h4>

            {/* Systems count */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {handoverPoint.systems_count || 0} systems
              </div>
              {handoverPoint.target_date && (
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {format(new Date(handoverPoint.target_date), 'dd MMM')}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Prerequisites</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Draggable + Droppable version for phase columns
export const DraggableHandoverPointCard: React.FC<HandoverPointCardProps> = (props) => {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `vcr-drag-${props.handoverPoint.id}`,
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

  return (
    <div 
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      {...listeners}
      {...attributes}
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
