import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDetailSheet } from './TaskDetailSheet';
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import type { UserTask } from '@/hooks/useUserTasks';
import { useUnifiedTasks, FILTER_OPTIONS, type CategoryFilter, type UnifiedTask } from './useUnifiedTasks';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type GroupBy = 'none' | 'project' | 'category';

interface UnifiedTaskListProps {
  searchQuery: string;
  userId: string;
  onTotalCountUpdate?: (count: number) => void;
  groupBy?: GroupBy;
}

export const UnifiedTaskList: React.FC<UnifiedTaskListProps> = ({
  searchQuery,
  userId,
  onTotalCountUpdate,
  groupBy = 'none',
}) => {
  const navigate = useNavigate();
  const { allTasks, isLoading, categoryCounts, updateTaskStatus } = useUnifiedTasks(userId);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Report total count
  useEffect(() => {
    onTotalCountUpdate?.(allTasks.length);
  }, [allTasks.length, onTotalCountUpdate]);

  // Filter
  const filteredTasks = useMemo(() => {
    let result = allTasks;
    if (activeFilter !== 'all') {
      result = result.filter(t => t.category === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle?.toLowerCase().includes(q) ||
        t.project?.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allTasks, activeFilter, searchQuery]);

  // Group tasks if needed — must be before any early return
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups: Record<string, UnifiedTask[]> = {};
    filteredTasks.forEach(t => {
      const key = groupBy === 'project' ? (t.project || 'Unassigned') : t.categoryLabel;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
  }, [filteredTasks, groupBy]);

  const handleTaskClick = (task: UnifiedTask) => {
    if (task.isWaiting) return;
    if (task.userTask) {
      setSelectedTask(task.userTask);
      setDetailOpen(true);
    } else if (task.navigateTo) {
      navigate(task.navigateTo);
    }
  };

  const handleApprove = (taskId: string) => updateTaskStatus(taskId, 'completed');
  const handleReject = (taskId: string) => updateTaskStatus(taskId, 'cancelled');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {FILTER_OPTIONS.map(opt => {
          const count = categoryCounts[opt.value] || 0;
          if (opt.value !== 'all' && count === 0) return null;
          return (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                activeFilter === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {opt.label}
              <span className={cn(
                "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                activeFilter === opt.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/80 text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/50 mb-4">
              <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {searchQuery ? 'No tasks match your search.' : activeFilter !== 'all' ? 'No tasks in this category.' : "You're all caught up!"}
            </p>
          </div>
        </div>
      ) : groupedTasks ? (
        <div className="space-y-4">
          {groupedTasks.map(([groupName, tasks]) => (
            <GroupSection key={groupName} groupName={groupName} tasks={tasks} onTaskClick={handleTaskClick} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <TaskRow key={task.id} task={task} onClick={() => handleTaskClick(task)} />
          ))}
        </div>
      )}

      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
};

// ─── Sub-components ───

const GroupSection: React.FC<{
  groupName: string;
  tasks: UnifiedTask[];
  onTaskClick: (task: UnifiedTask) => void;
}> = ({ groupName, tasks, onTaskClick }) => {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-semibold text-foreground">{groupName}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tasks.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-1 ml-6">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

const TaskRow: React.FC<{ task: UnifiedTask; onClick: () => void }> = ({ task, onClick }) => {
  const Icon = task.icon;
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
  const dateAnnotation = getDateAnnotation(task);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-4 p-4 cursor-pointer transition-all border",
        "hover:shadow-md hover:border-primary/20",
        task.isWaiting && "opacity-50 cursor-default",
        task.isNew && "border-primary/30 bg-primary/[0.02]"
      )}
    >
      <div className={cn(
        "w-1 self-stretch rounded-full shrink-0",
        task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground/30'
      )} />

      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", task.categoryColor)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-foreground truncate">{task.title}</span>
          {task.isNew && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">NEW</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.project && <span className="font-medium text-foreground/80 truncate">{task.project}</span>}
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-normal", task.categoryColor)}>
            {task.categoryLabel}
          </Badge>
        </div>
        {/* Date range for ORA activities */}
        {(task.startDate || task.endDate) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
            <Calendar className="h-3 w-3 shrink-0" />
            {task.startDate && <span>{format(new Date(task.startDate), 'MMM d')}</span>}
            {task.startDate && task.endDate && <span>→</span>}
            {task.endDate && <span>{format(new Date(task.endDate), 'MMM d')}</span>}
            {dateAnnotation && (
              <span className={cn(
                "ml-1 text-[10px] font-medium",
                dateAnnotation.variant === 'overdue' && 'text-destructive',
                dateAnnotation.variant === 'today' && 'text-amber-600',
                dateAnnotation.variant === 'upcoming' && 'text-blue-600',
              )}>
                · {dateAnnotation.label}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {task.totalItems != null && task.totalItems > 0 ? (
          <div className="flex items-center gap-2">
            <Progress value={task.progressPercentage || 0} className="h-2 w-16" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{task.completedItems}/{task.totalItems}</span>
          </div>
        ) : task.isWaiting ? (
          <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/20">
            <Clock className="h-3 w-3 mr-1" />Waiting
          </Badge>
        ) : task.dueDate && !task.startDate && !task.endDate ? (
          <span className={cn(
            "text-xs whitespace-nowrap",
            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {isOverdue && <AlertTriangle className="h-3 w-3 inline mr-1" />}
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        ) : null}
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
      </div>
    </Card>
  );
};

function getDateAnnotation(task: UnifiedTask): { label: string; variant: 'overdue' | 'today' | 'upcoming' | 'none' } | null {
  const date = task.dueDate || task.endDate;
  if (!date) return null;
  const d = new Date(date);
  if (isPast(d) && !isToday(d)) {
    const days = differenceInDays(new Date(), d);
    return { label: `${days}d overdue`, variant: 'overdue' };
  }
  if (isToday(d)) return { label: 'Due today', variant: 'today' };
  const days = differenceInDays(d, new Date());
  if (days <= 7) return { label: `${days}d left`, variant: 'upcoming' };
  return null;
}
