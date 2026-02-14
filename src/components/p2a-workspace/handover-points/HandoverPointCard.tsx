import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { GripVertical, Box, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getVCRColor } from '../utils/vcrColors';
import { useVCRSystems } from '../contexts/VCRSystemsContext';

const shortenVCR = (code: string) => {
  const match = code.match(/^VCR-[A-Z0-9]+-(\d+)$/i);
  return match ? `VCR-${match[1]}` : code;
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
      return { label: 'Signed', borderAccent: 'hsl(152, 76%, 36%)' };
    case 'READY':
      return { label: 'Ready', borderAccent: 'hsl(217, 91%, 60%)' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', borderAccent: 'hsl(38, 92%, 50%)' };
    default:
      return { label: 'Pending', borderAccent: 'hsl(215, 14%, 58%)' };
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
  const { getSystemsForVCR } = useVCRSystems();
  const vcrSystems = getSystemsForVCR(handoverPoint.id);

  const progress = handoverPoint.status === 'SIGNED' ? 100 :
                   handoverPoint.status === 'READY' ? 90 :
                   handoverPoint.status === 'IN_PROGRESS' ? 50 : 0;

  if (isDragging) {
    return (
      <Card className="border border-dashed border-muted-foreground/30 bg-muted/20 opacity-40" style={{ width: 'calc(140px * var(--ws-zoom, 1))' }}>
        <CardContent style={{ padding: 'calc(6px * var(--ws-zoom-y, 1))' }}>
          <div style={{ height: 'calc(14px * var(--ws-zoom-y, 1))' }} />
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
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
      <CardContent style={{ padding: 'calc(6px * var(--ws-zoom-y, 1)) calc(6px * var(--ws-zoom, 1))' }}>
        <div className="flex items-start relative" style={{ gap: 'calc(6px * var(--ws-zoom, 1))' }}>
          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical style={{ width: 'calc(12px * var(--ws-zoom, 1))', height: 'calc(12px * var(--ws-zoom-y, 1))' }} />
          </div>
          <div className="flex-1 min-w-0 ml-2">
            <span className="font-medium truncate block leading-tight" style={{ fontSize: 'calc(10px * var(--ws-zoom-y, 1))' }}>
              {handoverPoint.name}
            </span>
            <div className="flex items-center justify-between gap-1 [*[data-hide-ids]_&]:hidden">
              <span className="text-muted-foreground font-mono truncate" style={{ fontSize: 'calc(8px * var(--ws-zoom-y, 1))' }}>
                {shortenVCR(handoverPoint.vcr_code || 'VCR-???')}
              </span>
              <span className="font-medium text-muted-foreground shrink-0" style={{ fontSize: 'calc(8px * var(--ws-zoom-y, 1))' }}>
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (vcrSystems.length === 0) return cardContent;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {cardContent}
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        avoidCollisions
        className="w-56 p-0 rounded-xl shadow-xl border overflow-hidden z-[100]"
      >
        <div
          className="px-3 py-2 border-b"
          style={{ background: vcrColor?.background, borderColor: vcrColor?.border }}
        >
          <div className="text-xs font-semibold truncate">{handoverPoint.name}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{shortenVCR(handoverPoint.vcr_code || '')}</div>
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
