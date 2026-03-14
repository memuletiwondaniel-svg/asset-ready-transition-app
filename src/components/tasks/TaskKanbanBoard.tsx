import React, { useMemo, useState, useCallback, useEffect, createContext, useContext } from 'react';
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
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  
  ChevronDown,
  ChevronRight,
  GripVertical,
  AlertTriangle,
  Circle,
  Timer,
  Clock,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, isToday } from 'date-fns';
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

// Reviewer summary context for kanban cards
interface ReviewerSummary { total: number; approved: number; rejected: number; }
const ReviewerSummaryContext = createContext<Map<string, ReviewerSummary>>(new Map());

// P2A author approval counts context (keyed by plan_id from metadata)
interface P2AApprovalSummary { total: number; approved: number; rejected: number; }
const P2AApprovalContext = createContext<Map<string, P2AApprovalSummary>>(new Map());


const getColumns = (t: any) => [
  { key: 'todo' as const, label: t.kanbanToDo || 'To Do', icon: Circle, accent: 'border-l-slate-400', headerBg: 'bg-gradient-to-r from-slate-200/90 to-slate-100/60 dark:from-slate-800/50 dark:to-slate-900/20', iconColor: 'text-slate-500', headerText: 'text-foreground', emptyIcon: Inbox, emptyMsg: t.kanbanEmptyToDo || 'Nothing to do — nice!' },
  { key: 'in_progress' as const, label: t.kanbanInProgress || 'In Progress', icon: Timer, accent: 'border-l-amber-500', headerBg: 'bg-gradient-to-r from-amber-200/90 to-amber-100/60 dark:from-amber-900/50 dark:to-amber-950/20', iconColor: 'text-amber-600', headerText: 'text-foreground', emptyIcon: Circle, emptyMsg: t.kanbanEmptyInProgress || 'No tasks in progress' },
  { key: 'done' as const, label: t.kanbanDone || 'Done', icon: CheckCircle2, accent: 'border-l-emerald-500', headerBg: 'bg-gradient-to-r from-emerald-200/90 to-emerald-100/60 dark:from-emerald-900/50 dark:to-emerald-950/20', iconColor: 'text-emerald-600', headerText: 'text-foreground', emptyIcon: CheckCircle2, emptyMsg: t.kanbanEmptyDone || 'All clear!' },
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

  // Determine if this is an approver's own approval task vs a plan creation task
  const meta = task?.userTask?.metadata as Record<string, any> | undefined;
  const metaSource = meta?.source;
  const isApproverTask = metaSource === 'p2a_handover' && meta?.action !== 'create_p2a_plan';
  const isAdHocReviewTask = metaSource === 'task_review';
  const planStatus = meta?.plan_status?.toUpperCase?.() || '';
  const isFullyApproved = !isApproverTask && !isAdHocReviewTask && ['COMPLETED', 'APPROVED'].includes(planStatus);

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
              {isAdHocReviewTask ? 'Void Your Review Decision?' : isApproverTask ? 'Void Your Approval?' : isFullyApproved ? 'Void All Approvals?' : 'Cancel Approval Review?'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium text-foreground">"{taskTitle}"</span>{' '}
                {isAdHocReviewTask
                  ? 'has already been reviewed — you submitted your decision.'
                  : isApproverTask
                  ? 'has already been completed — you approved this plan.'
                  : isFullyApproved
                    ? 'has been approved through a formal review process.'
                    : 'has been submitted and is currently under approval review.'}
              </p>
              <p className="text-muted-foreground">Moving this task back will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
                {isAdHocReviewTask ? (
                  <>
                    <li>Void your earlier approval or rejection</li>
                    <li>Reset your review status to Pending</li>
                    <li>Require you to review and decide again</li>
                  </>
                ) : isApproverTask ? (
                  <>
                    <li>Void your earlier approval of the P2A Plan</li>
                    <li>Require you to re-review and re-approve</li>
                    <li>May delay the overall approval process</li>
                  </>
                ) : isFullyApproved ? (
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
            {isAdHocReviewTask ? 'Move Anyway – Void Decision' : isApproverTask ? 'Move Anyway – Void Approval' : isFullyApproved ? 'Move Anyway – Void Approvals' : 'Move Anyway – Cancel Review'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

function getDateAnnotation(task: UnifiedTask): { variant: 'overdue' | 'today' } | null {
  const date = task.dueDate || task.endDate;
  if (!date) return null;
  const d = new Date(date);
  if (isPast(d) && !isToday(d)) return { variant: 'overdue' };
  if (isToday(d)) return { variant: 'today' };
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
  const reviewerSummaries = useContext(ReviewerSummaryContext);
  const p2aApprovalSummaries = useContext(P2AApprovalContext);

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
          {task.kanbanColumn === 'done' ? (
            (() => {
              const meta = task.userTask?.metadata as Record<string, any> | undefined;
              const isRejected = meta?.outcome === 'rejected';
              const action = meta?.action;
              const source = meta?.source;
              const planStatus = (meta?.plan_status || '').toUpperCase();

              // Detect workflow tasks: author tasks (create_p2a_plan, create_ora_plan) or approver tasks (source=p2a_handover)
              const isP2aAuthor = action === 'create_p2a_plan';
              const isOraAuthor = action === 'create_ora_plan' || task.userTask?.type === 'ora_plan_creation';
              const isP2aApprover = source === 'p2a_handover' && !isP2aAuthor;
              const isWorkflowTask = isP2aAuthor || isOraAuthor || isP2aApprover;

              // Approver-specific counts
              const totalApprovers = meta?.total_approvers as number | undefined;
              const approvedCount = meta?.approved_count as number | undefined;
              const hasApproverCounts = isP2aApprover && totalApprovers != null && totalApprovers > 0;

              if (isRejected) {
                return (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Rejected
                  </span>
                );
              }

              // Approver tasks with counts: show "Under Review · X/Y" or "Approved"
              if (hasApproverCounts) {
                const allApproved = (approvedCount || 0) >= totalApprovers!;
                return (
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                    allApproved
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {allApproved ? `Approved · ${totalApprovers}/${totalApprovers}` : `Awaiting Approval · ${approvedCount || 0}/${totalApprovers}`}
                  </span>
                );
              }

              // Author tasks (Develop P2A Plan, Create ORA Plan): use plan_status + approval counts
              if (isWorkflowTask) {
                const isApproved = ['APPROVED', 'COMPLETED'].includes(planStatus);
                const isActive = planStatus === 'ACTIVE'; // submitted, under review
                const isDraft = planStatus === 'DRAFT';

                // For P2A author tasks, show approval counts when under review (keyed by project_id)
                const authorProjectId = meta?.project_id as string | undefined;
                const p2aAuthorApproval = authorProjectId ? p2aApprovalSummaries.get(authorProjectId) : undefined;

                if (isApproved) {
                  return (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Approved
                    </span>
                  );
                }
                if (isActive) {
                  // Show approval progress for P2A author tasks
                  if (p2aAuthorApproval && p2aAuthorApproval.total > 0) {
                    if (p2aAuthorApproval.rejected > 0) {
                      return (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Rejected
                        </span>
                      );
                    }
                    const allDone = p2aAuthorApproval.approved >= p2aAuthorApproval.total;
                    return (
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                        allDone
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}>
                        {allDone ? `Approved · ${p2aAuthorApproval.total}/${p2aAuthorApproval.total}` : `Awaiting Approval · ${p2aAuthorApproval.approved}/${p2aAuthorApproval.total}`}
                      </span>
                    );
                  }
                  return (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Under Review
                    </span>
                  );
                }
                if (isDraft) {
                  return (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Draft
                    </span>
                  );
                }
                // Fallback for workflow tasks with unknown plan_status
                return (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Under Review
                  </span>
                );
              }

              // Check for task_reviewers on simple tasks
              const reviewerData = task.userTask?.id ? reviewerSummaries.get(task.userTask.id) : undefined;
              if (reviewerData && reviewerData.total > 0) {
                if (reviewerData.rejected > 0) {
                  return (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Rejected
                    </span>
                  );
                }
                const allApproved = reviewerData.approved >= reviewerData.total;
                return (
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                    allApproved
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {allApproved ? `Approved · ${reviewerData.total}/${reviewerData.total}` : `Awaiting Approval · ${reviewerData.approved}/${reviewerData.total}`}
                  </span>
                );
              }

              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {t.kanbanCompleted || 'Completed'}
                </span>
              );
            })()
          ) : dateAnnotation ? (
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
              dateAnnotation.variant === 'overdue' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              dateAnnotation.variant === 'today' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            )}>
              {dateAnnotation.variant === 'overdue' ? (t.kanbanOverdue || 'Overdue') : 'Due today'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground leading-snug mb-1.5 break-words overflow-hidden">
        {task.project ? task.title.replace(new RegExp(`\\s*[–\\-]\\s*${task.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '') : task.title}
      </p>

      {/* Approver dot progress removed – merged into status pill */}

      {/* Progress for in-progress tasks */}
      {task.kanbanColumn === 'in_progress' && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Progress value={task.progressPercentage ?? 0} className="h-1 flex-1 bg-muted/30" indicatorClassName="bg-muted-foreground/25" />
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

  // Batch-fetch reviewer summaries for ALL tasks (not just done column)
  const allTaskIds = useMemo(() => 
    tasks.filter(t => t.userTask?.id).map(t => t.userTask!.id),
    [tasks]
  );

  const { data: reviewerSummaries } = useQuery({
    queryKey: ['task-reviewers-summary', allTaskIds],
    queryFn: async () => {
      if (allTaskIds.length === 0) return new Map<string, ReviewerSummary>();
      const { data, error } = await (supabase as any)
        .from('task_reviewers')
        .select('task_id, status')
        .in('task_id', allTaskIds);
      if (error) throw error;
      const map = new Map<string, ReviewerSummary>();
      for (const row of data || []) {
        const existing = map.get(row.task_id) || { total: 0, approved: 0, rejected: 0 };
        existing.total++;
        if (row.status === 'APPROVED') existing.approved++;
        if (row.status === 'REJECTED') existing.rejected++;
        map.set(row.task_id, existing);
      }
      return map;
    },
    enabled: allTaskIds.length > 0,
    staleTime: 30_000,
  });

  // Realtime: listen for task_reviewers changes to keep counters in sync across users
  useEffect(() => {
    const channel = supabase
      .channel('task-reviewers-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_reviewers',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['task-reviewers-summary'] });
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Batch-fetch P2A approval counts for author tasks (Develop P2A Plan)
  // Task metadata stores ORA plan_id, but approvers are keyed by P2A handover plan ID.
  // So we collect project_ids, resolve handover plan IDs, then fetch approvers.
  const p2aAuthorProjectIds = useMemo(() => {
    const ids: string[] = [];
    for (const t of tasks) {
      const meta = t.userTask?.metadata as Record<string, any> | undefined;
      if (meta?.action === 'create_p2a_plan' && meta?.project_id) {
        ids.push(meta.project_id as string);
      }
    }
    return [...new Set(ids)];
  }, [tasks]);

  const { data: p2aApprovalSummaries } = useQuery({
    queryKey: ['p2a-approval-summary-by-project', p2aAuthorProjectIds],
    queryFn: async () => {
      if (p2aAuthorProjectIds.length === 0) return new Map<string, P2AApprovalSummary>();
      const client = supabase as any;

      // Step 1: Resolve project_ids → P2A handover plan IDs
      const { data: plans, error: plansError } = await client
        .from('p2a_handover_plans')
        .select('id, project_id')
        .in('project_id', p2aAuthorProjectIds);
      if (plansError) throw plansError;
      if (!plans || plans.length === 0) return new Map<string, P2AApprovalSummary>();

      const handoverIds = plans.map((p: any) => p.id);
      // Map handover_id back to project_id for lookup
      const handoverToProject = new Map<string, string>();
      for (const p of plans as any[]) {
        handoverToProject.set(p.id, p.project_id);
      }

      // Step 2: Fetch approvers by handover plan IDs
      const { data: approvers, error: appError } = await client
        .from('p2a_handover_approvers')
        .select('handover_id, status')
        .in('handover_id', handoverIds);
      if (appError) throw appError;

      // Step 3: Build summary map keyed by project_id (matching task metadata)
      const map = new Map<string, P2AApprovalSummary>();
      for (const row of (approvers || []) as any[]) {
        const projectId = handoverToProject.get(row.handover_id);
        if (!projectId) continue;
        const existing = map.get(projectId) || { total: 0, approved: 0, rejected: 0 };
        existing.total++;
        if (row.status === 'APPROVED') existing.approved++;
        if (row.status === 'REJECTED') existing.rejected++;
        map.set(projectId, existing);
      }
      return map;
    },
    enabled: p2aAuthorProjectIds.length > 0,
    staleTime: 30_000,
  });

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
    const isP2aApprovalTask = meta?.source === 'p2a_handover' && !isP2aTask;
    const isAdHocReview = meta?.source === 'task_review';

    // ── Ad-hoc review tasks: intercept done → in_progress to warn about voiding decision ──
    if (isAdHocReview && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
      setWarningState({ task, targetColumn });
      return;
    }

    // ── P2A Approval tasks: intercept done → in_progress to warn about voiding approval ──
    if (isP2aApprovalTask && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
      setWarningState({ task, targetColumn });
      return;
    }

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
      tasks: tasks.filter(t => 
        col.key === 'todo' 
          ? (t.kanbanColumn === 'todo' || t.kanbanColumn === 'waiting')
          : t.kanbanColumn === col.key
      ),
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

    return columnTasks.map(task => {
      const meta = task.userTask?.metadata as Record<string, any> | undefined;
      const isRejected = meta?.outcome === 'rejected';
      return (
        <DraggableKanbanCard
          key={task.id}
          task={task}
          onClick={() => handleTaskClick(task)}
          accentClass={isRejected ? 'border-l-destructive' : col.accent}
        />
      );
    });
  };

  const reviewerMap = reviewerSummaries || new Map<string, ReviewerSummary>();
  const p2aApprovalMap = p2aApprovalSummaries || new Map<string, P2AApprovalSummary>();

  return (
    <P2AApprovalContext.Provider value={p2aApprovalMap}>
    <ReviewerSummaryContext.Provider value={reviewerMap}>
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {columnData.map(col => {
            const ColIcon = col.icon;
            return (
              <DroppableColumn key={col.key} columnKey={col.key}>
                <div className="bg-muted/70 rounded-xl border border-border shadow-md flex flex-col h-full overflow-hidden">
                  {/* Column header – tinted background */}
                  <div className={cn("relative flex items-center justify-center px-3 py-3 border-b border-border/40", col.headerBg)}>
                    <div className="flex items-center gap-3">
                      <ColIcon className={cn("h-4 w-4", col.iconColor)} strokeWidth={2.25} />
                      <span className={cn("text-sm font-black uppercase tracking-wider", col.headerText)}>{col.label}</span>
                    </div>
                    <Badge variant="secondary" className="absolute right-3 text-[10px] font-medium px-1.5 py-0 min-w-[1.25rem] text-center text-muted-foreground bg-muted/60">{col.tasks.length}</Badge>
                  </div>
                  {/* Cards */}
                  <ScrollArea className="flex-1 max-h-[50vh] sm:max-h-[calc(100vh-320px)]">
                    <div className="px-4 py-2.5 space-y-2.5">
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
    </ReviewerSummaryContext.Provider>
    </P2AApprovalContext.Provider>
  );
};
