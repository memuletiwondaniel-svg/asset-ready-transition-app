import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pin, PinOff, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PSSRKanbanCardProps {
  pssr: {
    id: string;
    projectId: string;
    projectName: string;
    asset: string;
    status: string;
    priority: string;
    progress: number;
    pssrLead: string;
    pssrLeadAvatar: string;
    pendingApprovals: number;
    riskLevel: string;
  };
  onViewDetails: (pssrId: string) => void;
  isPinned: boolean;
  onTogglePin: (pssrId: string) => void;
}

const PSSRKanbanCard: React.FC<PSSRKanbanCardProps> = ({
  pssr,
  onViewDetails,
  isPinned,
  onTogglePin,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pssr.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-emerald-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const getPriorityIndicator = (priority: string) => {
    const colors: Record<string, string> = {
      'Critical': 'bg-red-500',
      'High': 'bg-orange-500',
      'Medium': 'bg-amber-500',
      'Low': 'bg-slate-400',
    };
    return colors[priority] || 'bg-slate-400';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-opacity duration-200',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <Card
        className={cn(
          'p-3 cursor-pointer transition-all duration-200 group border-border/50',
          'hover:shadow-md hover:border-border',
          isPinned && 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
          isDragging && 'ring-2 ring-primary/30 shadow-lg'
        )}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Priority indicator line */}
        <div className={cn('absolute top-0 left-0 w-1 h-full rounded-l-lg', getPriorityIndicator(pssr.priority))} />

        {/* Header: Project ID + Pin */}
        <div className="flex items-center justify-between mb-2">
          <Badge 
            variant="outline" 
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-mono font-semibold text-[10px] px-1.5 py-0.5"
          >
            {pssr.projectId}
          </Badge>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(pssr.id);
            }}
            className={cn(
              'p-1 rounded transition-all duration-200 hover:bg-muted',
              isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {isPinned ? (
              <PinOff className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Pin className="h-3.5 w-3.5 text-muted-foreground hover:text-amber-500" />
            )}
          </button>
        </div>

        {/* Project Name */}
        <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2 leading-snug">
          {pssr.projectName}
        </h4>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{pssr.progress}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn('h-full rounded-full transition-all duration-300', getProgressColor(pssr.progress))}
              style={{ width: `${Math.min(pssr.progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="flex items-center justify-between">
          {pssr.pendingApprovals > 0 ? (
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800 text-[10px] px-1.5 py-0.5">
              <Clock className="w-3 h-3 mr-1" />
              {pssr.pendingApprovals} pending
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-1.5 py-0.5">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>

        {/* Drag Handle - Bottom, hover only */}
        <div 
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 mt-2 pt-2 border-t border-border/50 cursor-grab active:cursor-grabbing transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 mx-auto text-muted-foreground" />
        </div>
      </Card>
    </div>
  );
};

export default PSSRKanbanCard;
