import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getVCRColor } from '../utils/vcrColors';

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
        borderAccent: 'hsl(152, 76%, 36%)', // Emerald
      };
    case 'READY':
      return { 
        label: 'Ready',
        borderAccent: 'hsl(217, 91%, 60%)', // Blue
      };
    case 'IN_PROGRESS':
      return { 
        label: 'In Progress', 
        borderAccent: 'hsl(38, 92%, 50%)', // Amber
      };
    default:
      return { 
        label: 'Pending', 
        borderAccent: 'hsl(215, 14%, 58%)', // Slate
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
  const vcrColor = getVCRColor(handoverPoint.vcr_code);

  // Calculate progress (mock for now - would be based on prerequisites)
  const progress = handoverPoint.status === 'SIGNED' ? 100 :
                   handoverPoint.status === 'READY' ? 90 :
                   handoverPoint.status === 'IN_PROGRESS' ? 50 : 0;

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-sm w-[140px] border',
        isDropTarget && 'ring-2 ring-primary ring-offset-2',
        isDragging && 'opacity-50 shadow-lg scale-105'
      )}
      style={{
        backgroundColor: isDropTarget ? 'hsl(var(--primary) / 0.05)' : vcrColor?.background ?? 'hsl(var(--card))',
        borderColor: isDropTarget ? 'hsl(var(--primary))' : vcrColor?.border ?? 'hsl(var(--border))',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
      onClick={onClick}
    >
      <CardContent className="p-1.5">
        <div className="flex items-start gap-1">
          {/* Drag Handle - hidden by default, shown on hover */}
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            <GripVertical className="w-3 h-3" />
          </div>

          {/* Name & ID stacked */}
          <div className="flex-1 min-w-0">
            <span className="text-[8px] font-mono text-muted-foreground block leading-tight">
              {(() => {
                const code = handoverPoint.vcr_code || '';
                const newMatch = code.match(/^(VCR-\d+)-DP/);
                if (newMatch) return newMatch[1];
                const oldMatch = code.match(/(\d+)$/);
                if (oldMatch) return `VCR-${oldMatch[1]}`;
                return 'VCR-???';
              })()}
            </span>
            <span className="text-[10px] font-medium truncate block leading-tight">
              {handoverPoint.name}
            </span>
          </div>

          {/* Progress % on the right */}
          <span className="text-[8px] font-medium text-muted-foreground shrink-0 mt-0.5">
            {progress}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Draggable + Droppable version for free-form positioning in phase columns
export const DraggableHandoverPointCard: React.FC<HandoverPointCardProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
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

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : undefined,
  } : undefined;

  return (
    <div 
      ref={(node) => {
        setDraggableRef(node);
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
