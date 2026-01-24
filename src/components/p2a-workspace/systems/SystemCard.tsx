import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Snowflake, GripVertical, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2ASystem } from '../hooks/useP2ASystems';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';

interface SystemCardProps {
  system: P2ASystem;
  onClick?: () => void;
  compact?: boolean;
  isDragging?: boolean;
}

const getStatusColor = (percentage: number, status: string) => {
  if (status === 'RFO' || status === 'RFSU') return 'bg-emerald-500';
  if (percentage >= 50) return 'bg-amber-500';
  return 'bg-slate-400';
};

const getCardBackground = (percentage: number, status: string) => {
  if (status === 'RFO' || status === 'RFSU') return 'border-emerald-500/30 bg-emerald-500/5';
  if (percentage >= 50) return 'border-amber-500/30 bg-amber-500/5';
  return 'border-border bg-card';
};

export const SystemCard: React.FC<SystemCardProps> = ({
  system,
  onClick,
  compact = false,
  isDragging = false,
}) => {
  const statusColor = getStatusColor(system.completion_percentage, system.completion_status);
  const cardBg = getCardBackground(system.completion_percentage, system.completion_status);

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        cardBg,
        isDragging && 'opacity-50 shadow-lg scale-105',
        compact ? 'p-2' : ''
      )}
      onClick={onClick}
    >
      <CardContent className={cn('p-3', compact && 'p-2')}>
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <div className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center gap-2 mb-1">
              {/* HC/Non-HC Indicator */}
              <div className={cn(
                'w-5 h-5 rounded flex items-center justify-center shrink-0',
                system.is_hydrocarbon 
                  ? 'bg-orange-500/10 text-orange-500' 
                  : 'bg-blue-500/10 text-blue-500'
              )}>
                {system.is_hydrocarbon ? (
                  <Flame className="w-3 h-3" />
                ) : (
                  <Snowflake className="w-3 h-3" />
                )}
              </div>

              {/* System Name */}
              <span className={cn(
                'font-medium truncate',
                compact ? 'text-xs' : 'text-sm'
              )}>
                {system.name}
              </span>
            </div>

            {/* System ID */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                {system.system_id}
              </Badge>
              
              {system.assigned_vcr_code && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                  <Link2 className="w-2.5 h-2.5" />
                  {system.assigned_vcr_code}
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">
                  {system.completion_status.replace('_', ' ')}
                </span>
                <span className={cn(
                  'font-medium',
                  system.completion_percentage >= 100 ? 'text-emerald-500' : 'text-foreground'
                )}>
                  {system.completion_percentage}%
                </span>
              </div>
              <Progress 
                value={system.completion_percentage} 
                className="h-1.5"
              />
            </div>

            {/* Target Date - if not compact */}
            {!compact && system.target_rfsu_date && (
              <div className="mt-2 text-[10px] text-muted-foreground">
                Target: {format(new Date(system.target_rfsu_date), 'dd MMM yyyy')}
              </div>
            )}
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
