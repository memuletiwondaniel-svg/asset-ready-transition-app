import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskDetailSheet } from './TaskDetailSheet';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import type { UnifiedTask, CategoryFilter } from './useUnifiedTasks';
import type { UserTask } from '@/hooks/useUserTasks';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type GroupBy = 'none' | 'project' | 'category';

interface TaskKanbanBoardProps {
  tasks: UnifiedTask[];
  activeFilter: CategoryFilter;
  groupBy: GroupBy;
  onUpdateTaskStatus: (taskId: string, status: string) => void;
}

const COLUMNS = [
  { key: 'todo' as const, label: 'To Do', color: 'border-t-blue-500' },
  { key: 'in_progress' as const, label: 'In Progress', color: 'border-t-amber-500' },
  { key: 'waiting' as const, label: 'Waiting', color: 'border-t-muted-foreground' },
  { key: 'done' as const, label: 'Done', color: 'border-t-green-500' },
];

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

const KanbanCard: React.FC<{
  task: UnifiedTask;
  onClick: () => void;
}> = ({ task, onClick }) => {
  const Icon = task.icon;
  const dateAnnotation = getDateAnnotation(task);

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/20 border-l-2",
        task.priority === 'high' ? 'border-l-destructive' : task.priority === 'medium' ? 'border-l-amber-500' : 'border-l-muted-foreground/30',
        task.isWaiting && 'opacity-50',
        task.isNew && 'ring-1 ring-primary/20'
      )}
    >
      {/* Category + priority */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-normal", task.categoryColor)}>
          {task.categoryLabel}
        </Badge>
        {task.isNew && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-primary/10 text-primary">NEW</Badge>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground leading-snug mb-1 line-clamp-2">{task.title}</p>

      {/* Project */}
      {task.project && (
        <p className="text-[11px] text-muted-foreground truncate mb-1.5">{task.project}</p>
      )}

      {/* Dates row */}
      {(task.startDate || task.endDate || task.dueDate) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {task.startDate && <span>{format(new Date(task.startDate), 'MMM d')}</span>}
          {task.startDate && task.endDate && <span>→</span>}
          {(task.endDate || task.dueDate) && (
            <span className={cn(
              dateAnnotation?.variant === 'overdue' && 'text-destructive font-medium',
              dateAnnotation?.variant === 'today' && 'text-amber-600 font-medium',
            )}>
              {format(new Date((task.endDate || task.dueDate)!), 'MMM d')}
            </span>
          )}
        </div>
      )}

      {/* Date urgency badge */}
      {dateAnnotation && (
        <div className={cn(
          "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium mb-1.5",
          dateAnnotation.variant === 'overdue' && 'bg-destructive/10 text-destructive',
          dateAnnotation.variant === 'today' && 'bg-amber-500/10 text-amber-600',
          dateAnnotation.variant === 'upcoming' && 'bg-blue-500/10 text-blue-600',
        )}>
          {dateAnnotation.variant === 'overdue' && <AlertTriangle className="h-3 w-3" />}
          {dateAnnotation.variant === 'today' && <Clock className="h-3 w-3" />}
          {dateAnnotation.label}
        </div>
      )}

      {/* Progress bar for bundles */}
      {task.totalItems != null && task.totalItems > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <Progress value={task.progressPercentage || 0} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground">{task.completedItems}/{task.totalItems}</span>
        </div>
      )}
    </Card>
  );
};

const ProjectGroup: React.FC<{
  projectName: string;
  tasks: UnifiedTask[];
  onTaskClick: (task: UnifiedTask) => void;
}> = ({ projectName, tasks, onTaskClick }) => {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left py-1 mb-1 group">
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{projectName}</span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{tasks.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2">
        {tasks.map(task => (
          <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  activeFilter,
  groupBy,
  onUpdateTaskStatus,
}) => {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleTaskClick = (task: UnifiedTask) => {
    if (task.isWaiting) return;
    if (task.userTask) {
      setSelectedTask(task.userTask);
      setDetailOpen(true);
    } else if (task.navigateTo) {
      navigate(task.navigateTo);
    }
  };

  const handleApprove = (taskId: string) => onUpdateTaskStatus(taskId, 'completed');
  const handleReject = (taskId: string) => onUpdateTaskStatus(taskId, 'cancelled');

  const columnData = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      tasks: tasks.filter(t => t.kanbanColumn === col.key),
    }));
  }, [tasks]);

  const renderColumnContent = (columnTasks: UnifiedTask[]) => {
    if (columnTasks.length === 0) {
      return <p className="text-xs text-muted-foreground/50 text-center py-6">No tasks</p>;
    }

    if (groupBy === 'project') {
      const groups: Record<string, UnifiedTask[]> = {};
      columnTasks.forEach(t => {
        const key = t.project || 'Unassigned';
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      const sorted = Object.entries(groups).sort(([a], [b]) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      });
      return sorted.map(([project, tasks]) => (
        <ProjectGroup key={project} projectName={project} tasks={tasks} onTaskClick={handleTaskClick} />
      ));
    }

    if (groupBy === 'category') {
      const groups: Record<string, UnifiedTask[]> = {};
      columnTasks.forEach(t => {
        const key = t.categoryLabel;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).map(([category, tasks]) => (
        <ProjectGroup key={category} projectName={category} tasks={tasks} onTaskClick={handleTaskClick} />
      ));
    }

    return columnTasks.map(task => (
      <KanbanCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
    ));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columnData.map(col => (
          <div key={col.key} className={cn("bg-muted/30 rounded-xl border border-border/50 border-t-2 flex flex-col", col.color)}>
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{col.tasks.length}</Badge>
            </div>
            {/* Cards */}
            <ScrollArea className="flex-1 max-h-[calc(100vh-320px)]">
              <div className="p-2 space-y-2">
                {renderColumnContent(col.tasks)}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>

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
