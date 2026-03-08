import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskDetailSheet } from './TaskDetailSheet';
import { ORAActivityTaskSheet } from './ORAActivityTaskSheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import type { UnifiedTask, CategoryFilter } from './useUnifiedTasks';
import type { UserTask } from '@/hooks/useUserTasks';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useKanbanDragDrop } from './useKanbanDragDrop';

// DnD Kit
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';

type GroupBy = 'none' | 'project' | 'category';
type KanbanColumn = 'todo' | 'in_progress' | 'waiting' | 'done';

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

// ─── Draggable Card ────────────────────────────────────────────────
const DraggableKanbanCard: React.FC<{
  task: UnifiedTask;
  onClick: () => void;
}> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-30')}
    >
      <KanbanCardContent
        task={task}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

// ─── Card Content (shared between board + drag overlay) ────────────
const KanbanCardContent: React.FC<{
  task: UnifiedTask;
  onClick: () => void;
  dragHandleProps?: Record<string, any>;
  isOverlay?: boolean;
}> = ({ task, onClick, dragHandleProps, isOverlay }) => {
  const dateAnnotation = getDateAnnotation(task);
  const sp = task.smartPriority;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-2 px-2.5 cursor-pointer transition-all duration-150 border border-border/60 rounded-lg group",
        "hover:shadow-sm hover:bg-accent/30",
        task.isWaiting && 'opacity-50',
        task.isNew && 'ring-1 ring-primary/15',
        
        isOverlay && 'shadow-lg ring-2 ring-primary/20 rotate-[2deg] scale-[1.02]',
      )}
    >
      {/* Row 1: drag handle + project ID left, status right */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1 min-w-0">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              className="touch-none p-0.5 -ml-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          {task.project ? (
            <ProjectIdBadge size="sm" projectId={task.project}>{task.project}</ProjectIdBadge>
          ) : (
            <span className="text-[9px] text-muted-foreground">{task.categoryLabel}</span>
          )}
          {task.isNew && (
            <span className="text-[8px] font-semibold text-primary bg-primary/8 px-1 rounded">NEW</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {sp.isStartingSoon && (
            <span className="text-[9px] font-medium text-amber-600 bg-amber-500/8 px-1.5 py-0 rounded">
              Soon
            </span>
          )}
          {dateAnnotation && (
            <span className={cn(
              "text-[9px] font-medium px-1.5 py-0 rounded whitespace-nowrap",
              dateAnnotation.variant === 'overdue' && 'text-destructive bg-destructive/8',
              dateAnnotation.variant === 'today' && 'text-amber-600 bg-amber-500/8',
              dateAnnotation.variant === 'upcoming' && 'text-muted-foreground bg-muted',
            )}>
              {dateAnnotation.variant === 'overdue' ? 'Overdue' : dateAnnotation.label}
            </span>
          )}
        </div>
      </div>

      {/* Title – strip redundant project ID suffix */}
      <p className="text-[11px] font-medium text-foreground leading-snug mb-1">
        {task.project ? task.title.replace(new RegExp(`\\s*[–\\-]\\s*${task.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '') : task.title}
      </p>

      {/* Dates row */}
      {(task.startDate || task.endDate || task.dueDate) && (
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70">
          <Calendar className="h-2.5 w-2.5 shrink-0" />
          {task.startDate && <span>{format(new Date(task.startDate), 'MMM d')}</span>}
          {task.startDate && task.endDate && <span>→</span>}
          {(task.endDate || task.dueDate) && (
            <span className={cn(
              dateAnnotation?.variant === 'overdue' && 'text-destructive',
              dateAnnotation?.variant === 'today' && 'text-amber-600',
            )}>
              {format(new Date((task.endDate || task.dueDate)!), 'MMM d')}
            </span>
          )}
        </div>
      )}

      {/* Progress for in-progress tasks – always show % */}
      {task.kanbanColumn === 'in_progress' && (
        <div className="flex items-center gap-1.5 mt-1">
          <Progress value={task.progressPercentage ?? 0} className="h-1 flex-1" />
          <span className="text-[9px] font-medium text-primary">{Math.round(task.progressPercentage ?? 0)}%</span>
        </div>
      )}
      {/* Item counts for bundle tasks (shown in any column) */}
      {task.kanbanColumn !== 'in_progress' && task.totalItems != null && task.totalItems > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          <Progress value={task.progressPercentage || 0} className="h-1 flex-1" />
          <span className="text-[9px] text-muted-foreground">{task.completedItems}/{task.totalItems}</span>
        </div>
      )}
    </Card>
  );
};

// ─── Droppable Column ──────────────────────────────────────────────
const DroppableColumn: React.FC<{
  columnKey: string;
  children: React.ReactNode;
}> = ({ columnKey, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 transition-colors duration-200 rounded-lg min-h-[60px]",
        isOver && 'bg-primary/5 ring-1 ring-primary/20',
      )}
    >
      {children}
    </div>
  );
};

// ─── Project Group ─────────────────────────────────────────────────
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
          <DraggableKanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ─── Main Board ────────────────────────────────────────────────────
export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  activeFilter,
  groupBy,
  onUpdateTaskStatus,
}) => {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);
  const { moveTaskToColumn } = useKanbanDragDrop();

  // ORA Activity sheet opened when dragging to "Done"
  const [oraActivityTask, setOraActivityTask] = useState<UserTask | null>(null);
  const [oraActivityOpen, setOraActivityOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleTaskClick = useCallback((task: UnifiedTask) => {
    if (task.isWaiting) return;
    if (task.userTask) {
      setSelectedTask(task.userTask);
      setDetailOpen(true);
    } else if (task.navigateTo) {
      navigate(task.navigateTo);
    }
  }, [navigate]);

  const handleApprove = (taskId: string) => onUpdateTaskStatus(taskId, 'completed');
  const handleReject = (taskId: string) => onUpdateTaskStatus(taskId, 'cancelled');

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as UnifiedTask | undefined;
    setActiveTask(task || null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task as UnifiedTask | undefined;
    if (!task) return;

    const targetColumn = over.id as KanbanColumn;
    if (task.kanbanColumn === targetColumn) return;
    if (!task.userTask) return;

    if (targetColumn === 'done') {
      // Open the activity detail sheet with "Completed" status pre-selected
      // This forces the user to add evidence/comments before completing
      const meta = task.userTask.metadata as Record<string, any> | undefined;
      const isOraActivity = task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.ora_plan_activity_id;

      if (isOraActivity) {
        setOraActivityTask(task.userTask);
        setOraActivityOpen(true);
      } else {
        // For non-ORA tasks, open the regular detail sheet
        setSelectedTask(task.userTask);
        setDetailOpen(true);
      }
      return;
    }

    // For other columns, move immediately
    await moveTaskToColumn(task, targetColumn);
  }, [moveTaskToColumn]);

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
      <DraggableKanbanCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
    ));
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {columnData.map(col => (
            <DroppableColumn key={col.key} columnKey={col.key}>
              <div className={cn("bg-muted/30 rounded-xl border border-border/50 border-t-2 flex flex-col h-full", col.color)}>
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
                  <span className="text-sm font-semibold text-foreground">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{col.tasks.length}</Badge>
                </div>
                {/* Cards */}
                <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[calc(100vh-320px)]">
                  <div className="p-2 space-y-2">
                    {renderColumnContent(col.tasks)}
                  </div>
                </ScrollArea>
              </div>
            </DroppableColumn>
          ))}
        </div>

        {/* Drag overlay - floating card that follows cursor */}
        <DragOverlay>
          {activeTask ? (
            <div className="w-[280px]">
              <KanbanCardContent task={activeTask} onClick={() => {}} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* ORA Activity sheet opened when dragging to Done - forces evidence/comments */}
      <ORAActivityTaskSheet
        task={oraActivityTask}
        open={oraActivityOpen}
        onOpenChange={(open) => {
          setOraActivityOpen(open);
          if (!open) setOraActivityTask(null);
        }}
        initialStatusOverride="COMPLETED"
      />
    </>
  );
};
