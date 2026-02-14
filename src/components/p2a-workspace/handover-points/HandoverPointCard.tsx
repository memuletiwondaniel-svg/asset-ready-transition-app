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

  // When dragging, show a placeholder instead of the full card (DragOverlay shows the preview)
  if (isDragging) {
    return (
      <Card className="border border-dashed border-muted-foreground/30 bg-muted/20 opacity-40" style={{ width: 'calc(140px * var(--ws-zoom, 1))' }}>
        <CardContent className="p-1.5">
          <div style={{ height: 'calc(34px * var(--ws-zoom, 1))' }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-sm border',
        isDropTarget && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        width: 'calc(140px * var(--ws-zoom, 1))',
        backgroundColor: isDropTarget ? 'hsl(var(--primary) / 0.05)' : vcrColor?.background ?? 'hsl(var(--card))',
        borderColor: isDropTarget ? 'hsl(var(--primary))' : vcrColor?.border ?? 'hsl(var(--border))',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
      onClick={onClick}
    >
      <CardContent className="p-1.5">
        <div className="flex items-start gap-1.5 relative">
          {/* Drag Handle - absolute positioned, shown on hover */}
          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3" />
          </div>

          {/* Name & ID - matching SystemCard layout */}
          <div className="flex-1 min-w-0 ml-2">
            {/* VCR Name */}
            <span className="text-[10px] font-medium truncate block leading-tight">
              {handoverPoint.name}
            </span>

            {/* VCR ID + Progress */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[8px] text-muted-foreground font-mono truncate">
                {handoverPoint.vcr_code || 'VCR-???'}
              </span>
              <span className="text-[8px] font-medium text-muted-foreground shrink-0">
                {progress}%
              </span>
            </div>
          </div>
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

  // Don't apply transform when isDragging — the DragOverlay handles the visual preview.
  // Applying transform here moves the placeholder away from its original position.
  const style = (transform && !isDragging) ? {
    transform: CSS.Translate.toString(transform),
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
      data-vcr-id={props.handoverPoint.id}
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
    <div ref={setNodeRef} data-vcr-id={props.handoverPoint.id}>
      <HandoverPointCard {...props} isDropTarget={isOver} />
    </div>
  );
};
