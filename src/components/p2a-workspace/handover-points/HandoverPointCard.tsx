import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Layers, GripVertical, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';

interface HandoverPointCardProps {
  handoverPoint: P2AHandoverPoint;
  onClick?: () => void;
  isDropTarget?: boolean;
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
}) => {
  const statusConfig = getStatusConfig(handoverPoint.status);
  const StatusIcon = statusConfig.icon;

  // Calculate progress (mock for now - would be based on prerequisites)
  const progress = handoverPoint.status === 'SIGNED' ? 100 :
                   handoverPoint.status === 'READY' ? 90 :
                   handoverPoint.status === 'IN_PROGRESS' ? 50 : 0;

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        statusConfig.borderColor,
        isDropTarget && 'ring-2 ring-primary ring-offset-2 bg-primary/5'
      )}
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

// Droppable version for receiving systems
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
