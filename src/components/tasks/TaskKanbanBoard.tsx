import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskDetailSheet } from './TaskDetailSheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
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
  const sp = task.smartPriority;

  const borderColor = sp.level === 'critical'
    ? 'border-l-destructive'
    : sp.level === 'high'
    ? 'border-l-destructive'
    : sp.level === 'medium'
    ? 'border-l-amber-500'
    : 'border-l-muted-foreground/30';

  return (
    <TooltipProvider delayDuration={300}>
      <Card
        onClick={onClick}
        className={cn(
          "p-1.5 px-2 cursor-pointer transition-all hover:shadow-md hover:border-primary/20 border-l-2",
          borderColor,
          task.isWaiting && 'opacity-50',
          task.isNew && 'ring-1 ring-primary/20',
          sp.isOverdue && 'bg-destructive/[0.03]'
        )}
      >
        {/* Row 1: Project ID + status label on right */}
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {task.project ? (
              <ProjectIdBadge size="sm" projectId={task.project}>{task.project}</ProjectIdBadge>
            ) : (
              <span className="text-[9px] text-muted-foreground">{task.categoryLabel}</span>
            )}
            {task.isNew && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-auto bg-primary/10 text-primary">NEW</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {sp.isStartingSoon && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-auto border-amber-500/30 bg-amber-500/10 text-amber-600 gap-0.5">
                <Zap className="h-2 w-2" />Soon
              </Badge>
            )}
            {dateAnnotation && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[9px] px-1 py-0 rounded-full font-medium whitespace-nowrap",
                dateAnnotation.variant === 'overdue' && 'bg-destructive/10 text-destructive',
                dateAnnotation.variant === 'today' && 'bg-amber-500/10 text-amber-600',
                dateAnnotation.variant === 'upcoming' && 'bg-blue-500/10 text-blue-600',
              )}>
                {dateAnnotation.variant === 'overdue' && <AlertTriangle className="h-2.5 w-2.5" />}
                {dateAnnotation.variant === 'today' && <Clock className="h-2.5 w-2.5" />}
                {dateAnnotation.label}
              </span>
            )}
          </div>
        </div>

        {/* Title - full display, smaller font */}
        <p className="text-[11px] font-medium text-foreground leading-tight mb-0.5">{task.title}</p>

        {/* Dates row - compact */}
        {(task.startDate || task.endDate || task.dueDate) && (
          <div className="flex items-center gap-1 text-[9px]">
            <Calendar className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
            {task.startDate && <span className="text-muted-foreground/50">{format(new Date(task.startDate), 'MMM d')}</span>}
            {task.startDate && task.endDate && <span className="text-muted-foreground/40">→</span>}
            {(task.endDate || task.dueDate) && (
              <span className={cn(
                "text-muted-foreground",
                dateAnnotation?.variant === 'overdue' && 'text-destructive font-medium',
                dateAnnotation?.variant === 'today' && 'text-amber-600 font-medium',
              )}>
                {format(new Date((task.endDate || task.dueDate)!), 'MMM d')}
              </span>
            )}
          </div>
        )}

        {/* Progress bar for bundles */}
        {task.totalItems != null && task.totalItems > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Progress value={task.progressPercentage || 0} className="h-1 flex-1" />
            <span className="text-[9px] text-muted-foreground">{task.completedItems}/{task.totalItems}</span>
          </div>
        )}
      </Card>
    </TooltipProvider>
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
