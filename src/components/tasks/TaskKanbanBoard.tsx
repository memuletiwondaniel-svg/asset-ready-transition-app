import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskDetailSheet } from './TaskDetailSheet';
import { ORAActivityTaskSheet } from './ORAActivityTaskSheet';
import { P2APlanCreationWizard } from '@/components/widgets/p2a-wizard/P2APlanCreationWizard';
import { P2AWorkspaceOverlay } from '@/components/widgets/P2AWorkspaceOverlay';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  GripVertical,
  AlertTriangle,
  Circle,
  Loader2,
  Clock,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import type { UnifiedTask, CategoryFilter } from './useUnifiedTasks';
import type { UserTask } from '@/hooks/useUserTasks';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useKanbanDragDrop, type MoveResult } from './useKanbanDragDrop';

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

interface ApprovalWarningState {
  task: UnifiedTask;
  targetColumn: KanbanColumn;
}


const getColumns = (t: any) => [
  { key: 'todo' as const, label: t.kanbanToDo || 'To Do', icon: Circle, accent: 'border-l-blue-500', headerBg: 'bg-blue-100/70 dark:bg-blue-950/30', iconColor: 'text-blue-600', emptyIcon: Inbox, emptyMsg: t.kanbanEmptyToDo || 'Nothing to do — nice!' },
  { key: 'in_progress' as const, label: t.kanbanInProgress || 'In Progress', icon: Loader2, accent: 'border-l-amber-500', headerBg: 'bg-amber-100/70 dark:bg-amber-950/30', iconColor: 'text-amber-600', emptyIcon: Circle, emptyMsg: t.kanbanEmptyInProgress || 'No tasks in progress' },
  { key: 'done' as const, label: t.kanbanDone || 'Done', icon: CheckCircle2, accent: 'border-l-emerald-500', headerBg: 'bg-emerald-100/70 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', emptyIcon: CheckCircle2, emptyMsg: t.kanbanEmptyDone || 'All clear!' },
];

// ─── Approval Void Warning Dialog ──────────────────────────────────
const ApprovalVoidWarningDialog: React.FC<{
  open: boolean;
  task: UnifiedTask | null;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ open, task, onCancel, onConfirm }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset acknowledgment when dialog opens
  React.useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  // Determine if the plan is fully approved vs just submitted/under review
  const meta = task?.userTask?.metadata as Record<string, any> | undefined;
  const planStatus = meta?.plan_status?.toUpperCase?.() || '';
  const isFullyApproved = ['COMPLETED', 'APPROVED'].includes(planStatus);
  const isUnderReview = planStatus === 'ACTIVE';

  const taskTitle = task?.title || '';

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">
              {isFullyApproved ? 'Void All Approvals?' : 'Cancel Approval Review?'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium text-foreground">"{taskTitle}"</span>{' '}
                {isFullyApproved
                  ? 'has been approved through a formal review process.'
                  : 'has been submitted and is currently under approval review.'}
              </p>
              <p className="text-muted-foreground">Moving this task back will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
                {isFullyApproved ? (
                  <>
                    <li>Void all existing approvals</li>
                    <li>Require a completely new review cycle</li>
                    <li>Notify all approvers of the change</li>
                  </>
                ) : (
                  <>
                    <li>Cancel the ongoing approval review</li>
                    <li>Reset any approvals already received</li>
                    <li>Revert the plan to Draft for further editing</li>
                  </>
                )}
              </ul>
              <label className="flex items-start gap-2.5 pt-3 cursor-pointer select-none">
                <Checkbox 
                  checked={acknowledged} 
                  onCheckedChange={(c) => setAcknowledged(!!c)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I understand this action cannot be easily undone
                </span>
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!acknowledged}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFullyApproved ? 'Move Anyway – Void Approvals' : 'Move Anyway – Cancel Review'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

// ─── Draggable Card ────────────────────────────────────────────────
const DraggableKanbanCard: React.FC<{
  task: UnifiedTask;
  onClick: () => void;
  accentClass?: string;
}> = ({ task, onClick, accentClass }) => {
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
        accentClass={accentClass}
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
  accentClass?: string;
}> = ({ task, onClick, dragHandleProps, isOverlay, accentClass }) => {
  const dateAnnotation = getDateAnnotation(task);
  const sp = task.smartPriority;
  const { translations: t } = useLanguage();

  return (
    <Card
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-all duration-200 rounded-lg group border-l-[3px]",
        "border border-border/60 bg-card shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-border",
        accentClass || 'border-l-border',
        task.isWaiting && 'opacity-50',
        task.isNew && 'ring-1 ring-primary/15',
        isOverlay && 'shadow-xl ring-2 ring-primary/20 rotate-[2deg] scale-[1.03]',
      )}
    >
      {/* Row 1: drag handle + project ID left, status right */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              className="touch-none p-0.5 -ml-1 opacity-30 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          {task.project ? (
            <span className="text-[10px] font-medium font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded truncate max-w-[100px]">{task.project}</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">{task.categoryLabel}</span>
          )}
          {task.isNew && (
            <span className="text-[8px] font-semibold text-primary bg-primary/8 px-1 rounded">NEW</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {sp.isStartingSoon && (
            <span className="text-[9px] font-medium text-amber-600 bg-amber-500/8 px-1.5 py-0 rounded">
              {t.kanbanSoon || 'Soon'}
            </span>
          )}
          {task.kanbanColumn === 'done' ? (
            <span className="text-[9px] font-medium text-emerald-600 bg-emerald-500/8 px-1.5 py-0 rounded whitespace-nowrap">
              {t.kanbanCompleted || 'Completed'}
            </span>
          ) : dateAnnotation ? (
            <span className={cn(
              "text-[9px] font-medium px-1.5 py-0 rounded whitespace-nowrap",
              dateAnnotation.variant === 'overdue' && 'text-destructive bg-destructive/8',
              dateAnnotation.variant === 'today' && 'text-amber-600 bg-amber-500/8',
              dateAnnotation.variant === 'upcoming' && 'text-muted-foreground bg-muted',
            )}>
              {dateAnnotation.variant === 'overdue' ? (t.kanbanOverdue || 'Overdue') : dateAnnotation.label}
            </span>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <p className="text-xs font-medium text-foreground leading-snug mb-1.5 break-words overflow-hidden">
        {task.project ? task.title.replace(new RegExp(`\\s*[–\\-]\\s*${task.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '') : task.title}
      </p>

      {/* Dates row — hidden for completed tasks */}
      {task.kanbanColumn !== 'done' && (task.startDate || task.endDate || task.dueDate) && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
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

      {/* Progress for in-progress tasks */}
      {task.kanbanColumn === 'in_progress' && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Progress value={task.progressPercentage ?? 0} className="h-1 flex-1 bg-muted/40" indicatorClassName="bg-muted-foreground/40" />
          <span className="text-[10px] font-medium text-muted-foreground">{Math.round(task.progressPercentage ?? 0)}%</span>
        </div>
      )}
      {/* Item counts for bundle tasks */}
      {task.kanbanColumn !== 'in_progress' && task.totalItems != null && task.totalItems > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Progress value={task.progressPercentage || 0} className="h-1 flex-1" />
          <span className="text-[10px] text-muted-foreground">{task.completedItems}/{task.totalItems}</span>
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
        "flex-1 transition-all duration-200 rounded-xl min-h-[60px]",
        isOver && 'ring-2 ring-primary/30 ring-dashed scale-[1.01]',
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
  const { translations: t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);
  const { moveTaskToColumn } = useKanbanDragDrop();

  // ORA Activity sheet opened when dragging to "Done"
  const [oraActivityTask, setOraActivityTask] = useState<UserTask | null>(null);
  const [oraActivityOpen, setOraActivityOpen] = useState(false);
  const [oraActivityDragComplete, setOraActivityDragComplete] = useState(false);

  // P2A Wizard state (lifted from ORAActivityTaskSheet)
  const [p2aWizardOpen, setP2aWizardOpen] = useState(false);
  const [p2aWorkspaceOpen, setP2aWorkspaceOpen] = useState(false);
  const [p2aTarget, setP2aTarget] = useState({ projectId: '', projectCode: '' });

  const handleOpenP2AWizard = useCallback((projectId: string, projectCode: string, openWorkspace?: boolean) => {
    setP2aTarget({ projectId, projectCode });
    if (openWorkspace) {
      setP2aWorkspaceOpen(true);
    } else {
      setP2aWizardOpen(true);
    }
  }, []);

  // Approval void warning dialog state
  const [warningState, setWarningState] = useState<ApprovalWarningState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleTaskClick = useCallback((task: UnifiedTask) => {
    if (task.isWaiting) return;
    if (task.userTask) {
      const meta = task.userTask.metadata as Record<string, any> | undefined;
      const isOraActivity = task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.action === 'create_p2a_plan' || meta?.ora_plan_activity_id;

      // ORA activity tasks skip the intermediate detail sheet and go straight to the activity overlay
      if (isOraActivity && !task.navigateTo) {
        setOraActivityTask(task.userTask);
        setOraActivityDragComplete(false);
        setOraActivityOpen(true);
        return;
      }

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

    const meta = task.userTask.metadata as Record<string, any> | undefined;
    const isOraActivity = task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.ora_plan_activity_id;
    const isP2aTask = meta?.action === 'create_p2a_plan';

    // ── P2A tasks: intercept drags that should go through the wizard ──
    if (isP2aTask) {
      // Done → In Progress / Todo: show approval void warning (same as ORA plan)
      if (task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
        // Check if this task is approval-protected (has been submitted/approved)
        if (task.isApprovalProtected) {
          setWarningState({ task, targetColumn });
          return;
        }
        // Not protected — just do the move with force
        await moveTaskToColumn(task, targetColumn, true);
        return;
      }
      // Todo → In Progress: open overlay to guide user to "Start P2A Plan"
      if (targetColumn === 'in_progress' && task.kanbanColumn === 'todo') {
        setOraActivityTask(task.userTask);
        setOraActivityDragComplete(false);
        setOraActivityOpen(true);
        return;
      }
      // Any → Done: open overlay to guide user to submit via wizard
      if (targetColumn === 'done') {
        setOraActivityTask(task.userTask);
        setOraActivityDragComplete(false);
        setOraActivityOpen(true);
        return;
      }
    }

    if (targetColumn === 'done') {
      // Open the activity detail sheet with "Completed" status pre-selected
      // This forces the user to add evidence/comments before completing
      if (isOraActivity) {
        setOraActivityTask(task.userTask);
        setOraActivityDragComplete(true);
        setOraActivityOpen(true);
      } else {
        // For non-ORA tasks, open the regular detail sheet
        setSelectedTask(task.userTask);
        setDetailOpen(true);
      }
      return;
    }

    // For other columns, check if this would void approvals
    const result = await moveTaskToColumn(task, targetColumn);
    if (result === 'needs_warning') {
      setWarningState({ task, targetColumn });
    }
  }, [moveTaskToColumn]);

  // Handle confirmation from the warning dialog
  const handleWarningConfirm = useCallback(async () => {
    if (!warningState) return;
    setWarningState(null);
    // Force move, bypassing approval protection
    await moveTaskToColumn(warningState.task, warningState.targetColumn, true);
  }, [warningState, moveTaskToColumn]);

  const handleWarningCancel = useCallback(() => {
    setWarningState(null);
  }, []);

  const COLUMNS = useMemo(() => getColumns(t), [t]);

  const columnData = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      tasks: tasks.filter(t => t.kanbanColumn === col.key),
    }));
  }, [tasks, COLUMNS]);

  const renderColumnContent = (columnTasks: UnifiedTask[], col: typeof columnData[number]) => {
    if (columnTasks.length === 0) {
      const EmptyIcon = col.emptyIcon;
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground/40">
          <EmptyIcon className="h-5 w-5" />
          <p className="text-xs">{col.emptyMsg}</p>
        </div>
      );
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
      <DraggableKanbanCard key={task.id} task={task} onClick={() => handleTaskClick(task)} accentClass={col.accent} />
    ));
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {columnData.map(col => {
            const ColIcon = col.icon;
            return (
              <DroppableColumn key={col.key} columnKey={col.key}>
                <div className="bg-muted/40 rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
                  {/* Column header – tinted background */}
                  <div className={cn("relative flex items-center justify-center px-3 py-3 border-b border-border/40", col.headerBg)}>
                    <div className="flex items-center gap-2">
                      <ColIcon className={cn("h-4 w-4", col.iconColor)} />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-foreground">{col.label}</span>
                    </div>
                    <Badge variant="secondary" className="absolute right-3 text-[10px] font-medium px-1.5 py-0 min-w-[1.25rem] text-center text-muted-foreground bg-muted/60">{col.tasks.length}</Badge>
                  </div>
                  {/* Cards */}
                  <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[calc(100vh-320px)]">
                    <div className="p-2.5 space-y-2.5">
                      {renderColumnContent(col.tasks, col)}
                    </div>
                  </ScrollArea>
                </div>
              </DroppableColumn>
            );
          })}
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
          if (!open) {
            setOraActivityTask(null);
            setOraActivityDragComplete(false);
          }
        }}
        initialStatusOverride={oraActivityDragComplete ? "COMPLETED" : undefined}
        onOpenP2AWizard={handleOpenP2AWizard}
      />

      {/* P2A Wizard/Workspace rendered at parent level to survive sheet close */}
      <P2APlanCreationWizard
        open={p2aWizardOpen}
        onOpenChange={setP2aWizardOpen}
        projectId={p2aTarget.projectId}
        projectCode={p2aTarget.projectCode}
        onSuccess={() => {
          setP2aWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-sheet'] });
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        }}
        onOpenWorkspace={() => {
          setP2aWizardOpen(false);
          setP2aWorkspaceOpen(true);
        }}
      />
      <P2AWorkspaceOverlay
        open={p2aWorkspaceOpen}
        onOpenChange={setP2aWorkspaceOpen}
        projectId={p2aTarget.projectId}
        projectNumber={p2aTarget.projectCode}
        onReturnToWizard={() => {
          setP2aWorkspaceOpen(false);
          setP2aWizardOpen(true);
        }}
      />

      {/* Warning dialog for reverting approval-protected tasks */}
      <ApprovalVoidWarningDialog
        open={!!warningState}
        task={warningState?.task || null}
        onCancel={handleWarningCancel}
        onConfirm={handleWarningConfirm}
      />
    </>
  );
};
