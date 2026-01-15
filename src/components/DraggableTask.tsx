import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, 
  GripVertical, 
  Link2, 
  AlertCircle, 
  Trash2,
  Check,
  X,
  MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays, isPast, isToday } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UserTask } from '@/hooks/useUserTasks';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DraggableTaskProps {
  task: UserTask;
  isSelected: boolean;
  onSelect: (taskId: string, checked: boolean) => void;
  onComplete: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onManageDependencies: (taskId: string) => void;
  allTasks: UserTask[];
}

export const DraggableTask: React.FC<DraggableTaskProps> = ({
  task,
  isSelected,
  onSelect,
  onComplete,
  onDismiss,
  onDelete,
  onManageDependencies,
  allTasks
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = {
    High: { dot: 'bg-red-500', text: 'text-red-600' },
    Medium: { dot: 'bg-amber-500', text: 'text-amber-600' },
    Low: { dot: 'bg-emerald-500', text: 'text-emerald-600' }
  };

  const colors = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.Low;

  const hasBlockingTasks = task.blocking_tasks && task.blocking_tasks.length > 0;
  const hasBlockedByTasks = task.blocked_by_tasks && task.blocked_by_tasks.length > 0;
  const hasDependencies = hasBlockingTasks || hasBlockedByTasks;
  
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const getTaskTitle = (taskId: string) => {
    const foundTask = allTasks.find(t => t.id === taskId);
    return foundTask?.title || 'Unknown Task';
  };

  const formatDueDate = () => {
    if (!task.due_date) return null;
    const dueDate = new Date(task.due_date);
    const days = differenceInDays(dueDate, new Date());
    
    if (isOverdue) {
      const overdueDays = Math.abs(days);
      return { text: `${overdueDays}d overdue`, className: 'text-red-600 font-medium' };
    }
    if (isDueToday) {
      return { text: 'Due today', className: 'text-amber-600 font-medium' };
    }
    if (days === 1) {
      return { text: 'Due tomorrow', className: 'text-amber-600' };
    }
    if (days <= 7) {
      return { text: `Due in ${days}d`, className: 'text-muted-foreground' };
    }
    return { text: formatDistanceToNow(dueDate, { addSuffix: true }), className: 'text-muted-foreground' };
  };

  const dueInfo = formatDueDate();

  return (
    <div ref={setNodeRef} style={style}>
      <div 
        className={`
          group relative bg-card rounded-xl border border-border/60
          hover:border-border hover:shadow-md
          transition-all duration-200 ease-out
          ${isDragging ? 'opacity-50 shadow-lg scale-[1.02]' : ''}
          ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
          ${isOverdue ? 'border-red-200 dark:border-red-900/50' : ''}
        `}
      >
        {/* Priority indicator bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${colors.dot} opacity-80`} />
        
        <div className="p-4 pt-5">
          {/* Header Row */}
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 pt-0.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(task.id, checked as boolean)}
                className="data-[state=checked]:bg-primary"
              />
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/60" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Title and Type */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
                  {task.title}
                </h4>
                <Badge 
                  variant="secondary" 
                  className="shrink-0 text-[10px] h-5 px-2 capitalize bg-muted/80"
                >
                  {task.type}
                </Badge>
              </div>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {task.description}
                </p>
              )}

              {/* Meta Row */}
              <div className="flex items-center gap-3 text-xs">
                {/* Due Date */}
                {dueInfo && (
                  <div className={`flex items-center gap-1.5 ${dueInfo.className}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{dueInfo.text}</span>
                  </div>
                )}
                
                {/* Dependencies */}
                {hasDependencies && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`flex items-center gap-1 ${hasBlockedByTasks ? 'text-orange-600' : 'text-blue-600'}`}>
                          {hasBlockedByTasks ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {hasBlockedByTasks 
                              ? `Blocked (${task.blocked_by_tasks!.length})` 
                              : `Blocking (${task.blocking_tasks!.length})`}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        {hasBlockedByTasks && (
                          <div className="space-y-1">
                            <p className="font-semibold text-xs">Blocked by:</p>
                            {task.blocked_by_tasks!.map(depId => (
                              <p key={depId} className="text-xs">• {getTaskTitle(depId)}</p>
                            ))}
                          </div>
                        )}
                        {hasBlockingTasks && (
                          <div className="space-y-1 mt-2">
                            <p className="font-semibold text-xs">Blocking:</p>
                            {task.blocking_tasks!.map(blockId => (
                              <p key={blockId} className="text-xs">• {getTaskTitle(blockId)}</p>
                            ))}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
            <Button 
              size="sm" 
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => onComplete(task.id)}
            >
              <Check className="w-3.5 h-3.5" />
              {task.type === 'approval' ? 'Approve' : 'Complete'}
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 h-8 text-xs gap-1.5"
              onClick={() => onDismiss(task.id)}
            >
              <X className="w-3.5 h-3.5" />
              {task.type === 'approval' ? 'Reject' : 'Dismiss'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onManageDependencies(task.id)}>
                  <Link2 className="w-3.5 h-3.5 mr-2" />
                  Dependencies
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};