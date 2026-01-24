import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Flame, Snowflake, GripVertical } from 'lucide-react';
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

const getProgressColor = (percentage: number, status: string) => {
  if (status === 'RFO' || status === 'RFSU') return 'bg-emerald-500';
  if (percentage >= 50) return 'bg-amber-500';
  return 'bg-primary/60';
};

export const SystemCard: React.FC<SystemCardProps> = ({
  system,
  onClick,
  compact = false,
  isDragging = false,
}) => {
  return (
    <div 
      className={cn(
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer',
        'bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50',
        'transition-all duration-150',
        isDragging && 'opacity-50 shadow-lg scale-105 bg-muted'
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/30 group-hover:text-muted-foreground/60">
        <GripVertical className="w-3 h-3" />
      </div>

      {/* HC/Non-HC Indicator - small dot */}
      <div className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        system.is_hydrocarbon ? 'bg-orange-500' : 'bg-blue-500'
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {/* System Name */}
        <span className="text-[11px] font-medium truncate flex-1 text-foreground/90">
          {system.name}
        </span>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all',
                getProgressColor(system.completion_percentage, system.completion_status)
              )}
              style={{ width: `${system.completion_percentage}%` }}
            />
          </div>
          <span className={cn(
            'text-[9px] tabular-nums w-6 text-right',
            system.completion_percentage >= 100 ? 'text-emerald-500 font-medium' : 'text-muted-foreground'
          )}>
            {system.completion_percentage}%
          </span>
        </div>
      </div>
    </div>
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