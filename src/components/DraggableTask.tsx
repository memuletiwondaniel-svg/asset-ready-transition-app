import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, GripVertical, Link2, AlertCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UserTask } from '@/hooks/useUserTasks';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    High: {
      border: 'border-l-red-500',
      bg: 'bg-red-500/5',
      dot: 'bg-red-500',
      badge: 'bg-red-500/10 text-red-600 border-red-500/20'
    },
    Medium: {
      border: 'border-l-yellow-500',
      bg: 'bg-yellow-500/5',
      dot: 'bg-yellow-500',
      badge: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    },
    Low: {
      border: 'border-l-green-500',
      bg: 'bg-green-500/5',
      dot: 'bg-green-500',
      badge: 'bg-green-500/10 text-green-600 border-green-500/20'
    }
  };

  const colors = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.Low;

  const hasBlockingTasks = task.blocking_tasks && task.blocking_tasks.length > 0;
  const hasBlockedByTasks = task.blocked_by_tasks && task.blocked_by_tasks.length > 0;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  const getTaskTitle = (taskId: string) => {
    const foundTask = allTasks.find(t => t.id === taskId);
    return foundTask?.title || 'Unknown Task';
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`glass-subtle hover:shadow-lg transition-all group relative border-l-4 ${colors.border} ${colors.bg} overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${colors.dot} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(task.id, checked as boolean)}
              className="mt-1"
            />
            <div 
              {...attributes} 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing mt-1"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0 ${isOverdue ? 'animate-pulse' : ''}`} />
                  <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={`text-xs border ${colors.badge}`}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {task.type}
                  </Badge>
                </div>
              </div>

              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}

              {/* Dependency Indicators */}
              {(hasBlockingTasks || hasBlockedByTasks) && (
                <div className="flex flex-col gap-1">
                  {hasBlockedByTasks && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertCircle className="w-3 h-3" />
                            <span>Blocked by {task.blocked_by_tasks!.length} task(s)</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-semibold">Blocked by:</p>
                            {task.blocked_by_tasks!.map(depId => (
                              <p key={depId} className="text-xs">• {getTaskTitle(depId)}</p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {hasBlockingTasks && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Link2 className="w-3 h-3" />
                            <span>Blocking {task.blocking_tasks!.length} task(s)</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-semibold">Blocking:</p>
                            {task.blocking_tasks!.map(blockId => (
                              <p key={blockId} className="text-xs">• {getTaskTitle(blockId)}</p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                  Due: {task.due_date ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true }) : 'No deadline'}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                {task.type === 'approval' ? (
                  <>
                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onComplete(task.id)}>
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-7 text-xs" 
                      onClick={() => onDismiss(task.id)}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      size="sm" 
                      className="flex-1 h-7 text-xs" 
                      onClick={() => onComplete(task.id)}
                    >
                      Complete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 h-7 text-xs" 
                      onClick={() => onDismiss(task.id)}
                    >
                      Dismiss
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => onManageDependencies(task.id)}
                  title="Manage dependencies"
                >
                  <Link2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(task.id)}
                  title="Delete task"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};