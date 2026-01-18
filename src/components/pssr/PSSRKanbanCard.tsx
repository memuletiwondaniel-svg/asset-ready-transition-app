import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pin, PinOff, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
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
    return 'bg-slate-400';
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
          'p-2 cursor-pointer transition-all duration-200 group border-border/50',
          'hover:shadow-md hover:border-border',
          isPinned && 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
          isDragging && 'ring-2 ring-primary/30 shadow-lg'
        )}
        onClick={() => onViewDetails(pssr.id)}
      >
        {/* Header: Project ID + Pin */}
        <div className="flex items-center justify-between mb-1.5">
          <ProjectIdBadge size="sm">
            {pssr.projectId}
          </ProjectIdBadge>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(pssr.id);
            }}
            className={cn(
              'p-0.5 rounded transition-all duration-200 hover:bg-muted',
              isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {isPinned ? (
              <PinOff className="h-3 w-3 text-amber-500" />
            ) : (
              <Pin className="h-3 w-3 text-muted-foreground hover:text-amber-500" />
            )}
          </button>
        </div>

        {/* Project Name */}
        <h4 className="font-medium text-xs text-foreground line-clamp-2 mb-1.5 leading-tight">
          {pssr.projectName}
        </h4>

        {/* Progress Bar - Inline */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn('h-full rounded-full transition-all duration-300', getProgressColor(pssr.progress))}
              style={{ width: `${Math.min(pssr.progress, 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground w-7 text-right">{pssr.progress}%</span>
        </div>

        {/* Pending Approvals - Compact */}
        <div className="flex items-center">
          {pssr.pendingApprovals > 0 ? (
            <span className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {pssr.pendingApprovals} pending
            </span>
          ) : (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Complete
            </span>
          )}
        </div>

        {/* Drag Handle - Inline on hover */}
        <div 
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 mt-1 pt-1 border-t border-border/30 cursor-grab active:cursor-grabbing transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 mx-auto text-muted-foreground/60" />
        </div>
      </Card>
    </div>
  );
};

export default PSSRKanbanCard;
