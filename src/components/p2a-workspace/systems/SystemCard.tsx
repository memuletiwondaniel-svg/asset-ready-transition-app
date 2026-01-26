import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Flame, Snowflake, GripVertical, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2ASystem } from '../hooks/useP2ASystems';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface SystemCardProps {
  system: P2ASystem;
  onClick?: () => void;
  compact?: boolean;
  isDragging?: boolean;
}

// For HC systems: completion means RFSU, for non-HC: completion means RFO
const getCompletionStatus = (system: P2ASystem) => {
  return system.is_hydrocarbon ? 'RFSU' : 'RFO';
};

const isComplete = (system: P2ASystem) => {
  const targetStatus = getCompletionStatus(system);
  return system.completion_status === targetStatus;
};

const getCardBackground = (system: P2ASystem) => {
  if (isComplete(system)) return 'border-emerald-500/30 bg-emerald-500/5';
  return 'border-border bg-card';
};

export const SystemCard: React.FC<SystemCardProps> = ({
  system,
  onClick,
  compact = false,
  isDragging = false,
}) => {
  const cardBg = getCardBackground(system);

  return (
    <Card 
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-sm w-[140px]',
        cardBg,
        isDragging && 'opacity-50 shadow-lg scale-105'
      )}
      onClick={onClick}
    >
      <CardContent className="p-1.5">
        <div className="flex items-start gap-1">
          {/* Drag Handle - hidden by default, shown on hover */}
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            <GripVertical className="w-3 h-3" />
          </div>

          {/* HC/Non-HC Indicator */}
          <div className={cn(
            'w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5',
            system.is_hydrocarbon 
              ? 'bg-orange-500/10 text-orange-500' 
              : 'bg-blue-500/10 text-blue-500'
          )}>
            {system.is_hydrocarbon ? (
              <Flame className="w-2.5 h-2.5" />
            ) : (
              <Snowflake className="w-2.5 h-2.5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* System Name */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium truncate flex-1 leading-tight">
                {system.name}
              </span>
              {system.assigned_vcr_code && (
                <Link2 className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
              )}
            </div>

            {/* System ID */}
            <span className="text-[8px] text-muted-foreground font-mono truncate block">
              {system.system_id}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Draggable version of SystemCard for drag-and-drop
export const DraggableSystemCard: React.FC<SystemCardProps> = (props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `system-${props.system.id}`,
    data: {
      type: 'system',
      system: props.system,
    },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : undefined,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SystemCard {...props} isDragging={isDragging} />
    </div>
  );
};