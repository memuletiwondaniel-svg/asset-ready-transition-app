import React, { useMemo, useState, useCallback, useEffect, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { TaskDetailSheet } from './TaskDetailSheet';
import { VCRApprovalBundleSheet } from './VCRApprovalBundleSheet';
import { VCRPlanReviewLauncher } from './VCRPlanReviewLauncher';
import type { VCRBundleTask } from '@/hooks/useUserVCRBundleTasks';
import { ORAActivityTaskSheet } from './ORAActivityTaskSheet';
import { P2APlanCreationWizard } from '@/components/widgets/p2a-wizard/P2APlanCreationWizard';
import { P2AWorkspaceOverlay } from '@/components/widgets/P2AWorkspaceOverlay';
import { VCRExecutionPlanWizard } from '@/components/widgets/vcr-wizard/VCRExecutionPlanWizard';
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
  CircleDashed,
  Timer,
  Clock,
  CheckCircle2,
  Inbox,
  GanttChart,
  MoreVertical,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { isPast, isToday } from 'date-fns';
import type { UnifiedTask, CategoryFilter } from './useUnifiedTasks';
import type { UserTask } from '@/hooks/useUserTasks';
import { computeUrgency } from './taskUrgency';

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
type SortKey = 'priority' | 'dueDate' | 'recentlyAdded' | 'recentlyCompleted' | 'oldestCompleted';

const SORT_LABELS: Record<SortKey, string> = {
  priority: 'Priority',
  dueDate: 'Due date',
  recentlyAdded: 'Recently added',
  recentlyCompleted: 'Completed (newest)',
  oldestCompleted:   'Completed (oldest)',
};

const SORT_SUBLABELS: Record<SortKey, string> = {
  priority: 'by priority',
  dueDate: 'by due date',
  recentlyAdded: 'by recently added',
  recentlyCompleted: 'by completed (newest)',
  oldestCompleted:   'by completed (oldest)',
};

const DEFAULT_COLUMN_SORT: Record<KanbanColumn, SortKey> = {
  todo: 'priority',
  in_progress: 'priority',
  waiting: 'priority',
  done: 'recentlyCompleted',
};

const COLUMN_ALLOWED_SORTS: Record<KanbanColumn, SortKey[]> = {
  todo: ['priority', 'recentlyAdded'],
  in_progress: ['priority', 'recentlyAdded'],
  waiting: ['priority', 'recentlyAdded'],
  done: ['recentlyCompleted', 'oldestCompleted'],
};

interface TaskKanbanBoardProps {
  tasks: UnifiedTask[];
  activeFilter: CategoryFilter;
  onUpdateTaskStatus: (taskId: string, status: string) => void;
}

interface ApprovalWarningState {
  task: UnifiedTask;
  targetColumn: KanbanColumn;
}

// Reviewer summary context for kanban cards
interface ReviewerSummary { total: number; approved: number; rejected: number; }
const ReviewerSummaryContext = createContext<Map<string, ReviewerSummary>>(new Map());

// P2A author approval counts context (keyed by project_id from metadata)
interface P2AApprovalSummary { total: number; approved: number; rejected: number; }
const P2AApprovalContext = createContext<Map<string, P2AApprovalSummary>>(new Map());

// ORA author approval counts context (keyed by project_id from metadata)
interface ORAApprovalSummary { total: number; approved: number; rejected: number; }
const ORAApprovalContext = createContext<Map<string, ORAApprovalSummary>>(new Map());

function isClickableVcrApprovalBundle(task: UnifiedTask): boolean {
  const bundleType = task.bundleTask?.type ?? task.userTask?.type;
  return bundleType === 'vcr_approval_bundle';
}


const getColumns = (t: any) => [
  { key: 'todo' as const, label: t.kanbanToDo || 'To do', icon: CircleDashed, accent: 'border-l-slate-400', iconColor: 'text-muted-foreground', emptyIcon: Inbox, emptyMsg: t.kanbanEmptyToDo || 'Nothing to do right now.', emptyHint: t.kanbanEmptyToDoHint || 'New tasks will appear here.' },
  { key: 'in_progress' as const, label: t.kanbanInProgress || 'In progress', icon: Timer, accent: 'border-l-amber-500', iconColor: 'text-amber-500', emptyIcon: Timer, emptyMsg: t.kanbanEmptyInProgress || 'Nothing in progress.', emptyHint: t.kanbanEmptyInProgressHint || 'Drag a task here when you start it.' },
  { key: 'done' as const, label: t.kanbanDone || 'Done', icon: CheckCircle2, accent: 'border-l-emerald-500', iconColor: 'text-emerald-500', emptyIcon: CheckCircle2, emptyMsg: t.kanbanEmptyDone || 'No completed tasks yet.', emptyHint: t.kanbanEmptyDoneHint || 'Finished work will collect here.' },
];

// ─── Approval Void Warning Dialog ──────────────────────────────────
const ApprovalVoidWarningDialog: React.FC<{
  open: boolean;
  task: UnifiedTask | null;
  onCancel: () => void;
  onConfirm: (voidReason: string) => void;
}> = ({ open, task, onCancel, onConfirm }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setAcknowledged(false);
      setVoidReason('');
    }
  }, [open]);

  // Determine if this is an approver's own approval task vs a plan creation task
  const meta = task?.userTask?.metadata as Record<string, any> | undefined;
  const metaSource = meta?.source;
  const isApproverTask = metaSource === 'p2a_handover' && meta?.action !== 'create_p2a_plan';
  const isAdHocReviewTask = metaSource === 'task_review';
  const planStatus = meta?.plan_status?.toUpperCase?.() || '';
  const isFullyApproved = !isApproverTask && !isAdHocReviewTask && ['COMPLETED', 'APPROVED'].includes(planStatus);
  const isGenericTask = !isApproverTask && !isAdHocReviewTask && !planStatus;

  const taskTitle = task?.title || '';
  const trimmedReason = voidReason.trim();
  const isValid = acknowledged && trimmedReason.length >= 5 && trimmedReason.length <= 500;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">
              {isAdHocReviewTask ? 'Void Your Review Decision?' : isApproverTask ? 'Void Your Approval?' : isFullyApproved ? 'Void All Approvals?' : isGenericTask ? 'Reopen Completed Task?' : 'Cancel Approval Review?'}
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
                    : isGenericTask
                      ? 'has been marked as completed.'
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
                ) : isGenericTask ? (
                  <>
                    <li>Revert the task status to In Progress</li>
                    <li>This action will be logged for audit purposes</li>
                  </>
                ) : (
                  <>
                    <li>Cancel the ongoing approval review</li>
                    <li>Reset any approvals already received</li>
                    <li>Revert the plan to Draft for further editing</li>
                  </>
                )}
              </ul>

              {/* Mandatory reason field */}
              <div className="space-y-1.5 pt-1">
                <label htmlFor="void-reason" className="text-xs font-medium text-foreground">
                  Reason for voiding <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="void-reason"
                  placeholder="Explain why you are voiding this decision..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="min-h-[72px] resize-none text-sm"
                  maxLength={500}
                />
                <div className="flex justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {trimmedReason.length < 5 && trimmedReason.length > 0 ? 'Minimum 5 characters required' : '\u00A0'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{voidReason.length}/500</p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
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
            onClick={() => onConfirm(trimmedReason)}
            disabled={!isValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdHocReviewTask ? 'Move Anyway – Void Decision' : isApproverTask ? 'Move Anyway – Void Approval' : isFullyApproved ? 'Move Anyway – Void Approvals' : isGenericTask ? 'Reopen Task' : 'Move Anyway – Cancel Review'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


const DAY_MS = 86_400_000;

function getApprovalProgress(
  task: UnifiedTask,
  reviewerMap: Map<string, ReviewerSummary>,
  p2aMap: Map<string, P2AApprovalSummary>,
  oraMap: Map<string, ORAApprovalSummary>,
): { approved: number; total: number } | null {
  // Skip if VCR bundle progress already covers this card
  if (task.totalItems != null && task.totalItems > 0) return null;

  const meta = task.userTask?.metadata as Record<string, any> | undefined;
  const action = meta?.action;
  const source = meta?.source;
  const projectId = meta?.project_id as string | undefined;
  const isP2aAuthor = action === 'create_p2a_plan';
  const isOraAuthor = action === 'create_ora_plan' || task.userTask?.type === 'ora_plan_creation';

  if (isP2aAuthor && projectId) {
    const s = p2aMap.get(projectId);
    if (s && s.total > 0) return { approved: s.approved, total: s.total };
  }
  if (isOraAuthor && projectId) {
    const s = oraMap.get(projectId);
    if (s && s.total > 0) return { approved: s.approved, total: s.total };
  }
  if (source === 'p2a_handover' && !isP2aAuthor) {
    const total = meta?.total_approvers as number | undefined;
    const approved = meta?.approved_count as number | undefined;
    if (typeof total === 'number' && total > 0) {
      return { approved: approved ?? 0, total };
    }
  }
  const r = task.userTask?.id ? reviewerMap.get(task.userTask.id) : undefined;
  if (r && r.total > 0) return { approved: r.approved, total: r.total };
  return null;
}

const ApprovalBar: React.FC<{ approved: number; total: number }> = ({ approved, total }) => {
  if (total <= 0) return null;
  if (total <= 6) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-[2px]">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'block h-1 w-2 rounded-[1px]',
                i < approved ? 'bg-emerald-500/80 dark:bg-emerald-400/80' : 'bg-muted-foreground/20',
              )}
            />
          ))}
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">{approved}/{total}</span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round((approved / total) * 100)));
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-16 rounded-full bg-muted-foreground/20 overflow-hidden">
        <div className="h-full bg-emerald-500/80 dark:bg-emerald-400/80" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">{approved}/{total}</span>
    </div>
  );
};

// ─── Draggable Card ────────────────────────────────────────────────
const DraggableKanbanCard: React.FC<{
  task: UnifiedTask;
  onClick: () => void;
  accentClass?: string;
}> = ({ task, onClick, accentClass }) => {
  // Workflow-driven cards (e.g. VCR plan approval) have no backing user_task
  // row; we still allow dragging so dropping opens the review modal (handled
  // in handleDragEnd). Other cards remain unchanged.
  const isDraggable = !!task.userTask || !!task.vcrPlanApproval;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !isDraggable,
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
        dragHandleProps={isDraggable ? { ...attributes, ...listeners } : undefined}
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
  isChild?: boolean;
}> = ({ task, onClick, dragHandleProps, isOverlay, accentClass, isChild }) => {
  const navigate = useNavigate();
  const sp = task.smartPriority;
  const isWaitingVcrApprovalBundle = task.isWaiting && isClickableVcrApprovalBundle(task);

  // Detect ORA activity tasks that can link to a Gantt chart
  const meta = task.userTask?.metadata as Record<string, any> | undefined;
  const isOraActivity = task.userTask?.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.action === 'create_p2a_plan' || meta?.action === 'create_vcr_delivery_plan' || meta?.ora_plan_activity_id;
  const oraActivityCode = meta?.activity_code as string | undefined;
  const oraPlanId = meta?.plan_id as string | undefined;
  const { translations: t } = useLanguage();
  const reviewerSummaries = useContext(ReviewerSummaryContext);
  const p2aApprovalSummaries = useContext(P2AApprovalContext);
  const oraApprovalSummaries = useContext(ORAApprovalContext);

  // Rail color encodes URGENCY (overdue/due-soon/on-track) — see computeUrgency.
  // Rejected status keeps the destructive override.
  const urgency = computeUrgency(task);
  const railColor = (() => {
    if (accentClass === 'border-l-destructive') return 'bg-destructive';
    switch (urgency.rail) {
      case 'red':   return 'bg-red-500 dark:bg-red-500';
      case 'amber': return 'bg-amber-500 dark:bg-amber-500';
      case 'grey':
      default:      return 'bg-border dark:bg-border';
    }
  })();

  return (
    <Card
      onClick={onClick}
      tabIndex={0}
      className={cn(
        "relative overflow-hidden",
        isChild ? "p-2 cursor-pointer rounded-md group border-l-2" : "px-3 py-1.5 pl-4 cursor-pointer transition-all duration-200 rounded-lg group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isChild
          ? "border-0 border-l-border/50 bg-muted/30 shadow-none hover:bg-muted/50"
          : "border border-border/60 bg-card shadow-[0_1px_2px_0_rgb(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-md hover:border-border",
        isChild && 'border-l-border/50',
        task.isWaiting && !isWaitingVcrApprovalBundle && 'opacity-50',
        isOverlay && 'shadow-xl ring-2 ring-primary/20 rotate-[1deg] scale-[1.02]',
      )}
    >
      {!isChild && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-0 bottom-0 w-1",
            railColor,
          )}
        />
      )}
      {/* Row 1: drag handle + project / category pills */}
      <div className={cn("flex items-center gap-1.5 min-w-0", isChild ? "mb-1" : "mb-1.5")}>
        {!isChild && dragHandleProps && (
          <button
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="touch-none p-0.5 -ml-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        {!isChild && (
          task.project ? (
            <>
              <span className="text-[10px] font-mono text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded truncate max-w-[100px]">{task.project}</span>
              {task.extraPill && (
                <span className="text-[10px] font-mono text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded truncate max-w-[100px]">{task.extraPill}</span>
              )}
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground">{task.categoryLabel}</span>
          )
        )}
      </div>

      {/* Title + View in Gantt */}
      <div className="flex items-start justify-between gap-1">
        <p className={cn(
          "text-foreground break-words overflow-hidden flex-1",
          isChild ? "text-xs leading-snug mb-0.5 font-medium" : "text-[13px] leading-[1.3] mb-1 font-medium"
        )}>
          {(() => {
            if (!task.project) return task.title;
            const escaped = task.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Strip trailing "  - PROJECT" (existing behaviour)
            let title = task.title.replace(new RegExp(`\\s*[–\\-]\\s*${escaped}\\s*$`), '');
            // Strip leading "PROJECT:" / "PROJECT -" / "PROJECT –" prefix, case-insensitive
            title = title.replace(new RegExp(`^\\s*${escaped}\\s*[:\\-–]\\s*`, 'i'), '');
            return title;
          })()}
        </p>
        {isOraActivity && oraPlanId && oraActivityCode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/operation-readiness/${oraPlanId}?tab=activity-plan&view=gantt&highlight=${oraActivityCode}`);
            }}
            className="shrink-0 p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            title="View in Gantt"
          >
            <GanttChart className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress for in-progress tasks (hidden on child rows — leaves use status pill only) */}
      {!isChild && task.kanbanColumn === 'in_progress' && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Progress value={task.progressPercentage ?? 0} className="h-1 flex-1 bg-muted/30" indicatorClassName="bg-muted-foreground/25" />
          <span className="text-[10px] font-medium text-muted-foreground">{Math.round(task.progressPercentage ?? 0)}%</span>
        </div>
      )}
      {/* Item counts for bundle tasks */}
      {!isChild && task.kanbanColumn !== 'in_progress' && task.totalItems != null && task.totalItems > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Progress value={task.progressPercentage || 0} className="h-1 flex-1" />
          <span className="text-[10px] text-muted-foreground">{task.completedItems}/{task.totalItems}</span>
        </div>
      )}

      {/* Bottom meta row: status pill (done) OR due/age label (others) on the left,
          approval progress bar + n/M on the right. */}
      {!isChild && (() => {
        const statusPillNode = task.kanbanColumn === 'done' ? (() => {
          const m = task.userTask?.metadata as Record<string, any> | undefined;
          const isRejected = m?.outcome === 'rejected';
          const action = m?.action;
          const source = m?.source;
          const planStatus = (m?.plan_status || '').toUpperCase();
          const isP2aAuthor = action === 'create_p2a_plan';
          const isOraAuthor = action === 'create_ora_plan' || task.userTask?.type === 'ora_plan_creation';
          const isP2aApprover = source === 'p2a_handover' && !isP2aAuthor;
          const isWorkflowTask = isP2aAuthor || isOraAuthor || isP2aApprover;
          const totalApprovers = m?.total_approvers as number | undefined;
          const approvedCount = m?.approved_count as number | undefined;
          const hasApproverCounts = isP2aApprover && totalApprovers != null && totalApprovers > 0;

          if (isRejected) {
            return (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</span>
            );
          }
          if (hasApproverCounts) {
            const allApproved = (approvedCount || 0) >= totalApprovers!;
            return (
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                allApproved
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              )}>
                {allApproved ? 'Approved' : `Awaiting Approval · ${approvedCount || 0}/${totalApprovers}`}
              </span>
            );
          }
          if (isWorkflowTask) {
            const isApproved = ['APPROVED', 'COMPLETED'].includes(planStatus);
            const isActive = planStatus === 'ACTIVE';
            const isDraft = planStatus === 'DRAFT';
            const authorProjectId = m?.project_id as string | undefined;
            const p2aAuthorApproval = authorProjectId ? p2aApprovalSummaries.get(authorProjectId) : undefined;
            const oraAuthorApproval = authorProjectId ? oraApprovalSummaries.get(authorProjectId) : undefined;
            const authorApproval = isP2aAuthor ? p2aAuthorApproval : isOraAuthor ? oraAuthorApproval : undefined;

            if (isApproved) {
              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Approved</span>
              );
            }
            if (isActive) {
              if (authorApproval && authorApproval.total > 0) {
                if (authorApproval.rejected > 0) {
                  return (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</span>
                  );
                }
                const allDone = authorApproval.approved >= authorApproval.total;
                return (
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
                    allDone
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  )}>
                    {allDone ? 'Approved' : `Awaiting Approval · ${authorApproval.approved}/${authorApproval.total}`}
                  </span>
                );
              }
              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Under Review</span>
              );
            }
            if (isDraft) {
              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Draft</span>
              );
            }
            return (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Under Review</span>
            );
          }
          const reviewerData = task.userTask?.id ? reviewerSummaries.get(task.userTask.id) : undefined;
          if (reviewerData && reviewerData.total > 0) {
            if (reviewerData.rejected > 0) {
              return (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</span>
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
                {allApproved ? 'Approved' : `Awaiting Approval · ${reviewerData.approved}/${reviewerData.total}`}
              </span>
            );
          }
          return (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {t.kanbanCompleted || 'Completed'}
            </span>
          );
        })() : null;

        // Urgency label (overdue / due / age) — computed once at the top
        // of the card and reused here. Status pill (Done column) wins.
        const urgencyLabel = !statusPillNode && urgency.label ? (
          <span className={cn(
            "text-[10px] font-medium whitespace-nowrap",
            urgency.tone === 'red'    && 'text-red-600 dark:text-red-400',
            urgency.tone === 'amber'  && 'text-amber-600 dark:text-amber-500',
            urgency.tone === 'muted'  && 'text-muted-foreground/70',
            urgency.tone === 'accent' && 'text-primary font-semibold',
          )}>{urgency.label}</span>
        ) : null;
        const approvalProgress = getApprovalProgress(task, reviewerSummaries, p2aApprovalSummaries, oraApprovalSummaries);

        const leftNode = statusPillNode ?? urgencyLabel;

        if (!leftNode && !approvalProgress) return null;

        return (
          <div className="mt-1.5 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex items-center gap-1.5 truncate">{leftNode}</div>
            {approvalProgress && (
              <div className="shrink-0">
                <ApprovalBar approved={approvalProgress.approved} total={approvalProgress.total} />
              </div>
            )}
          </div>
        );
      })()}
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
        "flex h-full transition-all duration-200 rounded-xl",
        isOver && 'ring-2 ring-primary/30 ring-dashed',
      )}
    >
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
};

// ─── Card With Children (parent_task_id nesting) ──────────────────
const KanbanCardWithChildren: React.FC<{
  task: UnifiedTask;
  accentClass?: string;
  onTaskClick: (task: UnifiedTask) => void;
}> = ({ task, accentClass, onTaskClick }) => {
  const [expanded, setExpanded] = useState(false);
  const children = task.children || [];
  const hasChildren = children.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <DraggableKanbanCard
          task={task}
          onClick={() => onTaskClick(task)}
          accentClass={accentClass}
        />
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            className="absolute top-1.5 right-1.5 z-10 p-1 rounded hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors bg-card/80 backdrop-blur-sm border border-border/40"
            aria-label={expanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
            title={`${children.length} sub-task${children.length === 1 ? '' : 's'}`}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="ml-4 pl-2 border-l-2 border-border/40 space-y-1.5">
          {children.map(child => (
            <KanbanCardContent
              key={child.id}
              task={child}
              onClick={() => onTaskClick(child)}
              isChild
            />
          ))}
        </div>
      )}
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
          <KanbanCardWithChildren key={task.id} task={task} onTaskClick={onTaskClick} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ─── Main Board ────────────────────────────────────────────────────
export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  activeFilter,
  onUpdateTaskStatus,
}) => {
  const navigate = useNavigate();
  const { translations: t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<UserTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approvalBundle, setApprovalBundle] = useState<VCRBundleTask | null>(null);
  const [approvalBundleOpen, setApprovalBundleOpen] = useState(false);
  const [vcrPlanApproval, setVcrPlanApproval] = useState<UnifiedTask['vcrPlanApproval'] | null>(null);
  const [vcrPlanApprovalOpen, setVcrPlanApprovalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);
  const { moveTaskToColumn } = useKanbanDragDrop();

  // Per-column sort + group state (in-memory, board-local). Done defaults to
  // recently-completed; the others default to the global priority order.
  // Grouping is per-column (mirrors the sort model) so changing one column's
  // grouping does NOT affect the others.
  const [columnSort, setColumnSort] = useState<Record<KanbanColumn, SortKey>>(DEFAULT_COLUMN_SORT);
  const [columnGroupBy, setColumnGroupBy] = useState<Record<KanbanColumn, GroupBy>>({
    todo: 'category', in_progress: 'none', waiting: 'none', done: 'project',
  });

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

  // Realtime: listen for orp_approvals changes to keep ORA approval counters in sync
  useEffect(() => {
    const channel = supabase
      .channel('orp-approvals-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orp_approvals',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['ora-approval-summary-by-project'] });
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

  // Batch-fetch ORA approval counts for author tasks (Create ORA Plan)
  const oraAuthorProjectIds = useMemo(() => {
    const ids: string[] = [];
    for (const t of tasks) {
      const meta = t.userTask?.metadata as Record<string, any> | undefined;
      if ((meta?.action === 'create_ora_plan' || t.userTask?.type === 'ora_plan_creation') && meta?.project_id) {
        ids.push(meta.project_id as string);
      }
    }
    return [...new Set(ids)];
  }, [tasks]);

  const { data: oraApprovalSummaries } = useQuery({
    queryKey: ['ora-approval-summary-by-project', oraAuthorProjectIds],
    queryFn: async () => {
      if (oraAuthorProjectIds.length === 0) return new Map<string, ORAApprovalSummary>();
      const client = supabase as any;

      // Step 1: Resolve project_ids → ORP plan IDs
      const { data: plans, error: plansError } = await client
        .from('orp_plans')
        .select('id, project_id')
        .in('project_id', oraAuthorProjectIds);
      if (plansError) throw plansError;
      if (!plans || plans.length === 0) return new Map<string, ORAApprovalSummary>();

      const orpIds = plans.map((p: any) => p.id);
      const orpToProject = new Map<string, string>();
      for (const p of plans as any[]) {
        orpToProject.set(p.id, p.project_id);
      }

      // Step 2: Fetch approvers by ORP plan IDs
      const { data: approvers, error: appError } = await client
        .from('orp_approvals')
        .select('orp_plan_id, status')
        .in('orp_plan_id', orpIds);
      if (appError) throw appError;

      // Step 3: Build summary map keyed by project_id
      const map = new Map<string, ORAApprovalSummary>();
      for (const row of (approvers || []) as any[]) {
        const projectId = orpToProject.get(row.orp_plan_id);
        if (!projectId) continue;
        const existing = map.get(projectId) || { total: 0, approved: 0, rejected: 0 };
        existing.total++;
        if (row.status === 'APPROVED') existing.approved++;
        if (row.status === 'REJECTED') existing.rejected++;
        map.set(projectId, existing);
      }
      return map;
    },
    enabled: oraAuthorProjectIds.length > 0,
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
  const [showVCRWizard, setShowVCRWizard] = useState(false);
  const [vcrWizardTarget, setVcrWizardTarget] = useState<{ id: string; vcr_code: string; name: string; projectCode: string } | null>(null);

  const handleOpenP2AWizard = useCallback((projectId: string, projectCode: string, openWorkspace?: boolean) => {
    setP2aTarget({ projectId, projectCode });
    if (openWorkspace) {
      setP2aWorkspaceOpen(true);
    } else {
      setP2aWizardOpen(true);
    }
  }, []);

  const handleOpenVCRWizard = useCallback((vcrId: string, vcrCode: string, vcrName: string, _projectId: string, projectCode: string) => {
    setVcrWizardTarget({ id: vcrId, vcr_code: vcrCode, name: vcrName, projectCode });
    setShowVCRWizard(true);
  }, []);

  // Approval void warning dialog state
  const [warningState, setWarningState] = useState<ApprovalWarningState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleTaskClick = useCallback((task: UnifiedTask) => {
    console.log('[TaskKanbanBoard] handleTaskClick:start', {
      task,
      type: (task as { type?: string }).type,
      bundleTask: task.bundleTask,
      userTask: task.userTask,
      status: task.status,
      isWaiting: task.isWaiting,
      kanbanColumn: task.kanbanColumn,
    });
    if (task.isWaiting && !isClickableVcrApprovalBundle(task)) return;

    // VCR approval bundle: open the per-prereq approver action sheet (E-1c).
    // Do NOT route to TaskDetailSheet — it has no branch for this type.
    const bundle = task.bundleTask as VCRBundleTask | undefined;
    const bundleType = bundle?.type ?? (task as { type?: string }).type ?? task.userTask?.type;
    if (bundle && bundleType === 'vcr_approval_bundle') {
      console.log('[TaskKanbanBoard] handleTaskClick:branch', {
        branch: 'vcr_approval_bundle',
        bundleType,
        bundle,
      });
      setSelectedTask(null);
      setDetailOpen(false);
      setApprovalBundle(bundle);
      setApprovalBundleOpen(true);
      return;
    }

    // VCR Plan Approval task — has no userTask; route to the dedicated decision sheet.
    if (task.vcrPlanApproval) {
      console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'vcr_plan_approval' });
      setVcrPlanApproval(task.vcrPlanApproval);
      setVcrPlanApprovalOpen(true);
      return;
    }

    if (task.userTask) {
      const meta = task.userTask.metadata as Record<string, any> | undefined;
      const isReviewTask = meta?.source === 'task_review';
      const isOraActivity = !isReviewTask && (task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.action === 'create_p2a_plan' || meta?.action === 'create_vcr_delivery_plan' || meta?.ora_plan_activity_id);
      console.log('[TaskKanbanBoard] handleTaskClick:userTaskBranchCheck', {
        isReviewTask,
        isOraActivity,
        userTaskType: task.userTask.type,
        metadata: meta,
      });

      // Review tasks always open TaskDetailSheet (never ORA overlay)
      if (isReviewTask) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'review_task_detail' });
        setSelectedTask(task.userTask);
        setDetailOpen(true);
        return;
      }

      // ORA activity tasks skip the intermediate detail sheet and go straight to the activity overlay
      if (isOraActivity && !task.navigateTo) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'ora_activity_sheet' });
        setOraActivityTask(task.userTask);
        setOraActivityDragComplete(false);
        setOraActivityOpen(true);
        return;
      }

      console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'default_task_detail' });
      setSelectedTask(task.userTask);
      setDetailOpen(true);
    } else if (task.navigateTo) {
      console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'navigate', navigateTo: task.navigateTo });
      navigate(task.navigateTo);
    } else {
      console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'no_action' });
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

    // VCR Plan Approval cards have no user_task row. Any drop routes to the
    // review modal; the actual approve/reject only happens inside the wizard.
    if (task.vcrPlanApproval && !task.userTask) {
      if (targetColumn === 'done') {
        setVcrPlanApproval(task.vcrPlanApproval);
        setVcrPlanApprovalOpen(true);
      }
      // targetColumn === 'in_progress' | 'todo' → no-op (snap back)
      return;
    }

    if (!task.userTask) return;

    const meta = task.userTask.metadata as Record<string, any> | undefined;
    const isOraActivity = task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.ora_plan_activity_id;
    const isP2aTask = meta?.action === 'create_p2a_plan';
    const isP2aApprovalTask = meta?.source === 'p2a_handover' && !isP2aTask;
    const isAdHocReview = meta?.source === 'task_review';
    const isOraCreationTask = meta?.action === 'create_ora_plan' || task.userTask.type === 'ora_plan_creation';
    const isOraReviewTask = task.userTask.type === 'ora_plan_review';

    // ── UNIVERSAL: Any task moving from Done back requires confirmation dialog ──
    if (task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
      console.log('[Kanban] Done→back intercepted, showing warning dialog', { taskId: task.id, kanbanColumn: task.kanbanColumn, targetColumn });
      setWarningState({ task, targetColumn });
      return;
    }

    // ── ORA Plan creation tasks: intercept wizard-related drags ──
    if (isOraCreationTask) {
      // Todo → In Progress: open detail sheet to guide user to Create ORA Plan
      if (targetColumn === 'in_progress' && task.kanbanColumn === 'todo') {
        setSelectedTask(task.userTask);
        setDetailOpen(true);
        return;
      }
      // Any → Done: must submit via wizard — open detail sheet
      if (targetColumn === 'done') {
        setSelectedTask(task.userTask);
        setDetailOpen(true);
        return;
      }
    }

    // ── P2A tasks: intercept drags that should go through the wizard ──
    if (isP2aTask) {
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

    // For other columns, just move
    const result = await moveTaskToColumn(task, targetColumn);
    if (result === 'needs_warning') {
      setWarningState({ task, targetColumn });
    }
    // 'stale' is surfaced by the hook via toast; nothing else to do here.
  }, [moveTaskToColumn]);

  // Handle confirmation from the warning dialog (with mandatory reason)
  const handleWarningConfirm = useCallback(async (voidReason: string) => {
    if (!warningState) return;
    setWarningState(null);
    // Force move, bypassing approval protection, with void reason
    await moveTaskToColumn(warningState.task, warningState.targetColumn, true, voidReason);
  }, [warningState, moveTaskToColumn]);

  const handleWarningCancel = useCallback(() => {
    setWarningState(null);
  }, []);

  const COLUMNS = useMemo(() => getColumns(t), [t]);

  // Per-column sort comparators. "Priority" preserves the global pre-sort
  // from useUnifiedTasks (waiting-last → smartPriority → dueDate → createdAt).
  const compareBySort = (key: SortKey) => (a: UnifiedTask, b: UnifiedTask) => {
    const tsDesc = (av?: string | null, bv?: string | null) => {
      const aHas = !!av, bHas = !!bv;
      if (aHas && bHas) return new Date(bv!).getTime() - new Date(av!).getTime();
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };
    const tsAsc = (av?: string | null, bv?: string | null) => {
      const aHas = !!av, bHas = !!bv;
      if (aHas && bHas) return new Date(av!).getTime() - new Date(bv!).getTime();
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    };
    switch (key) {
      case 'recentlyCompleted': return tsDesc(a.completedAt, b.completedAt);
      case 'oldestCompleted': return tsAsc(a.completedAt, b.completedAt);
      case 'recentlyAdded':     return tsDesc(a.createdAt, b.createdAt);
      case 'dueDate':           return tsAsc(a.dueDate || a.endDate, b.dueDate || b.endDate);
      case 'priority':
      default:                  return 0; // preserve incoming (already priority-sorted) order
    }
  };

  const columnData = useMemo(() => {
    return COLUMNS.map(col => {
      const filtered = tasks.filter(t =>
        col.key === 'todo'
          ? (t.kanbanColumn === 'todo' || t.kanbanColumn === 'waiting')
          : t.kanbanColumn === col.key
      );
      // Guard against out-of-range stored sort values (e.g. legacy 'recentlyCompleted' on To Do)
      const allowed = COLUMN_ALLOWED_SORTS[col.key] || [DEFAULT_COLUMN_SORT[col.key]];
      const rawSort = columnSort[col.key] as SortKey;
      const sortKey = allowed.includes(rawSort) ? rawSort : DEFAULT_COLUMN_SORT[col.key];
      const ordered = sortKey === 'priority'
        ? filtered
        : [...filtered].sort(compareBySort(sortKey));
      return { ...col, tasks: ordered, sortKey };
    });
  }, [tasks, COLUMNS, columnSort]);

  const renderColumnContent = (columnTasks: UnifiedTask[], col: typeof columnData[number]) => {
    if (columnTasks.length === 0) {
      const EmptyIcon = col.emptyIcon;
      return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3 select-none">
          <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center">
            <EmptyIcon className="h-5 w-5 text-muted-foreground/50" strokeWidth={1.75} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground/70">{col.emptyMsg}</p>
            {col.emptyHint && (
              <p className="text-[11px] text-muted-foreground/50">{col.emptyHint}</p>
            )}
          </div>
        </div>
      );
    }

    const colGroupBy = columnGroupBy[col.key];

    if (colGroupBy === 'project') {
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

    if (colGroupBy === 'category') {
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
        <KanbanCardWithChildren
          key={task.id}
          task={task}
          onTaskClick={handleTaskClick}
          accentClass={isRejected ? 'border-l-destructive' : col.accent}
        />
      );
    });
  };

  const reviewerMap = reviewerSummaries || new Map<string, ReviewerSummary>();
  const p2aApprovalMap = p2aApprovalSummaries || new Map<string, P2AApprovalSummary>();
  const oraApprovalMap = oraApprovalSummaries || new Map<string, ORAApprovalSummary>();

  return (
    <ORAApprovalContext.Provider value={oraApprovalMap}>
    <P2AApprovalContext.Provider value={p2aApprovalMap}>
    <ReviewerSummaryContext.Provider value={reviewerMap}>
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {columnData.map(col => {
            const ColIcon = col.icon;
            const isEmpty = col.tasks.length === 0;
            const EmptyIcon = col.emptyIcon;
            // Header risk hint — quiet counts of overdue / due-soon (skip Done column)
            let overdueCount = 0;
            let dueSoonCount = 0;
            if (col.key !== 'done') {
              for (const ct of col.tasks) {
                const due = ct.dueDate || ct.endDate;
                if (!due) continue;
                const d = new Date(due);
                if (isPast(d) && !isToday(d)) { overdueCount++; continue; }
                if (isToday(d)) { dueSoonCount++; continue; }
                const diff = d.getTime() - Date.now();
                if (diff > 0 && diff <= 3 * 86_400_000) dueSoonCount++;
              }
            }
            return (
              <DroppableColumn key={col.key} columnKey={col.key}>
                <div className="bg-card/40 dark:bg-muted/20 rounded-xl border border-border/60 flex flex-col h-full min-h-[60vh] overflow-hidden">
                  {/* Quiet column header */}
                  <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <ColIcon className={cn("h-3.5 w-3.5 shrink-0", col.iconColor)} strokeWidth={2.25} />
                      <span className="text-[13px] font-medium text-foreground truncate">{col.label}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground/70">{col.tasks.length}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-rm-safe
                          data-rm-nav
                          aria-label={`${col.label} column options`}
                          className="h-6 w-6 text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 focus-visible:ring-1"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">Sort by</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={col.sortKey}
                          onValueChange={(v) => setColumnSort(prev => ({ ...prev, [col.key]: v as SortKey }))}
                        >
                          {(COLUMN_ALLOWED_SORTS[col.key as KanbanColumn] || []).map(k => (
                            <DropdownMenuRadioItem key={k} value={k} className="text-xs">
                              {SORT_LABELS[k]}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">Group by</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={columnGroupBy[col.key]}
                          onValueChange={(v) => setColumnGroupBy(prev => ({ ...prev, [col.key]: v as GroupBy }))}
                        >
                          <DropdownMenuRadioItem value="none" className="text-xs">None</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="project" className="text-xs">Project</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="category" className="text-xs">Category</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Active sort sub-label + risk hint */}
                  <div className="px-3 pt-1.5 pb-2 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/60">{SORT_SUBLABELS[col.sortKey]}</span>
                    {overdueCount > 0 && (
                      <span className="text-[10px] text-red-600 dark:text-red-400">· {overdueCount} overdue</span>
                    )}
                    {dueSoonCount > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">· {dueSoonCount} due soon</span>
                    )}
                  </div>

                  {/* Cards or empty drop-zone */}
                  {isEmpty ? (
                    <div className="flex-1 flex items-stretch p-3">
                      <div className="flex-1 rounded-lg border border-dashed border-border/60 flex flex-col items-center justify-center text-center gap-3 px-4 py-8 select-none">
                        <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center">
                          <EmptyIcon className="h-5 w-5 text-muted-foreground/50" strokeWidth={1.75} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-muted-foreground/70">{col.emptyMsg}</p>
                          {col.emptyHint && <p className="text-[11px] text-muted-foreground/50">{col.emptyHint}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1 max-h-[calc(100vh-320px)]">
                      <div className="px-3 pb-3 pt-1 space-y-2">
                        {renderColumnContent(col.tasks, col)}
                      </div>
                    </ScrollArea>
                  )}
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

      <VCRApprovalBundleSheet
        bundle={approvalBundle}
        open={approvalBundleOpen}
        onOpenChange={(o) => {
          setApprovalBundleOpen(o);
          if (!o) setApprovalBundle(null);
        }}
      />

      <VCRPlanReviewLauncher
        payload={vcrPlanApproval}
        open={vcrPlanApprovalOpen}
        onOpenChange={(o) => {
          setVcrPlanApprovalOpen(o);
          if (!o) setVcrPlanApproval(null);
        }}
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
        onOpenVCRWizard={handleOpenVCRWizard}
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

      {/* VCR Wizard */}
      {vcrWizardTarget && (
        <VCRExecutionPlanWizard
          open={showVCRWizard}
          onOpenChange={(open) => {
            setShowVCRWizard(open);
            if (!open) setVcrWizardTarget(null);
          }}
          vcr={{
            id: vcrWizardTarget.id,
            vcr_code: vcrWizardTarget.vcr_code,
            name: vcrWizardTarget.name,
            description: null,
            status: 'IN_PROGRESS',
            target_date: null,
            created_at: '',
            progress: 0,
            systems_count: 0,
            has_hydrocarbon: false,
          }}
          projectCode={vcrWizardTarget.projectCode}
        />
      )}


      <ApprovalVoidWarningDialog
        open={!!warningState}
        task={warningState?.task || null}
        onCancel={handleWarningCancel}
        onConfirm={handleWarningConfirm}
      />
    </>
    </ReviewerSummaryContext.Provider>
    </P2AApprovalContext.Provider>
    </ORAApprovalContext.Provider>
  );
};
