import React, { useMemo, useState, useCallback, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';


import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { TaskDetailSheet } from './TaskDetailSheet';
import { VCRPlanReviewLauncher } from './VCRPlanReviewLauncher';
import { VCRItemTaskListSheet } from '@/components/widgets/VCRItemTaskListSheet';
import { VCRBundleKanbanCard } from './VCRBundleKanbanCard';
import { MyVCRItemsPanel } from './MyVCRItemsPanel';
import { VCRItemsToReviewPanel } from './VCRItemsToReviewPanel';
import type { VCRBundleTask } from '@/hooks/useUserVCRBundleTasks';
import { useRecallVcrPlan } from '@/hooks/useRecallVcrPlan';
import { ORAActivityTaskSheet } from './ORAActivityTaskSheet';
import { P2APlanCreationWizard } from '@/components/widgets/p2a-wizard/P2APlanCreationWizard';
import { P2AWorkspaceOverlay } from '@/components/widgets/P2AWorkspaceOverlay';
import { VCRExecutionPlanWizard } from '@/components/widgets/vcr-wizard/VCRExecutionPlanWizard';
import { InterdisciplinaryTaskModal } from '@/components/widgets/InterdisciplinaryTaskModal';
import { ScheduleSofMeetingModal } from '@/components/widgets/ScheduleSofMeetingModal';
import { SchedulePacMeetingModal } from '@/components/widgets/SchedulePacMeetingModal';
import { QualificationReviewLauncher } from './QualificationReviewLauncher';
import { WitnessHoldTaskLauncher } from './WitnessHoldTaskLauncher';
import { TrainingTaskLauncher } from './TrainingTaskLauncher';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import { stripLeadingTaskVerb, shortenInlineVCRCode } from '@/components/widgets/p2a-wizard/steps/phases/vcrDisplayUtils';

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

// Portals the lens toggle into the page toolbar slot (#kanban-lens-slot).
// Falls back to inline rendering above the board if the slot isn't mounted.
const LensTogglePortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => document.getElementById('kanban-lens-slot');
    setSlot(find());
    const t = window.setTimeout(() => setSlot(find()), 0);
    return () => window.clearTimeout(t);
  }, []);
  if (slot) return createPortal(children, slot);
  return <div className="mb-3">{children}</div>;
};

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

// Set of stripped titles that would collide with another card's stripped
// title on the SAME board data set. When a card's stripped title is in this
// set, the card renders the original (unstripped) title instead, so distinct
// tasks stay visually distinguishable in Kanban.
const TitleCollisionContext = createContext<Set<string>>(new Set());

function isClickableVcrApprovalBundle(task: UnifiedTask): boolean {
  const bundleType = task.bundleTask?.type ?? task.userTask?.type;
  return bundleType === 'vcr_approval_bundle';
}


const getColumns = (t: any) => [
  { key: 'todo' as const, label: t.kanbanToDo || 'To do', icon: CircleDashed, accent: 'border-l-slate-400', iconColor: 'text-slate-600 dark:text-slate-300', headerTint: 'bg-slate-50 dark:bg-slate-900/40', emptyIcon: Inbox, emptyMsg: t.kanbanEmptyToDo || 'Nothing to do right now.', emptyHint: t.kanbanEmptyToDoHint || 'New tasks will appear here.' },
  { key: 'in_progress' as const, label: t.kanbanInProgress || 'In progress', icon: Timer, accent: 'border-l-amber-500', iconColor: 'text-amber-600 dark:text-amber-400', headerTint: 'bg-amber-50 dark:bg-amber-950/30', emptyIcon: Timer, emptyMsg: t.kanbanEmptyInProgress || 'Nothing in progress.', emptyHint: t.kanbanEmptyInProgressHint || 'Drag a task here when you start it.' },
  { key: 'done' as const, label: t.kanbanDone || 'Done', icon: CheckCircle2, accent: 'border-l-emerald-500', iconColor: 'text-emerald-600 dark:text-emerald-400', headerTint: 'bg-emerald-50 dark:bg-emerald-950/30', emptyIcon: CheckCircle2, emptyMsg: t.kanbanEmptyDone || 'No completed tasks yet.', emptyHint: t.kanbanEmptyDoneHint || 'Finished work will collect here.' },
];

/**
 * Lock predicate: an approved plan-creation card sitting in Done must not be
 * draggable — dragging out triggers the destructive p2a_revert / ora_revert
 * cascade in move_task_to_column. Reuses the same metadata flags as
 * isApprovalProtected (useUnifiedTasks) but narrowed to plan-creation tasks
 * and only in the "done" column.
 *
 * Exported for unit testing.
 */
export function isApprovedPlanCardLocked(task: UnifiedTask): boolean {
  if (task.kanbanColumn !== 'done') return false;
  const userTask = task.userTask;
  if (!userTask) return false;
  const meta = userTask.metadata as Record<string, any> | undefined;
  const action = meta?.action;
  const type = userTask.type;
  const planStatus = (meta?.plan_status ?? '').toString().toUpperCase();
  const isP2aPlanCreation = action === 'create_p2a_plan' || type === 'p2a_plan_creation';
  const isOraPlanCreation = action === 'create_ora_plan' || type === 'ora_plan_creation';
  if (isP2aPlanCreation && (planStatus === 'COMPLETED' || planStatus === 'ACTIVE')) return true;
  if (isOraPlanCreation && (planStatus === 'APPROVED' || planStatus === 'COMPLETED')) return true;
  return false;
}



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
  const isFullyApproved = !isApproverTask && !isAdHocReviewTask && ['COMPLETED', 'APPROVED', 'ACTIVE'].includes(planStatus);
  const isGenericTask = !isApproverTask && !isAdHocReviewTask && !planStatus;
  const isP2aPlanRevert = isFullyApproved && (meta?.action === 'create_p2a_plan' || task?.userTask?.type === 'p2a_plan_creation');
  const isOraPlanRevert = isFullyApproved && (meta?.action === 'create_ora_plan' || task?.userTask?.type === 'ora_plan_creation');

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
                    <li>Return the plan to <span className="font-medium text-foreground">DRAFT</span></li>
                    <li>Clear <span className="font-medium text-foreground">every approver's decision</span> (all approvers reset to Pending; prior decisions archived)</li>
                    {isP2aPlanRevert && (
                      <>
                        <li>Delete the linked <span className="font-medium text-foreground">VCR delivery-plan</span> and <span className="font-medium text-foreground">P2A VCR</span> activities from the ORA plan</li>
                        <li>Delete the <span className="font-medium text-foreground">ORI approval snapshot</span> recorded at plan approval</li>
                        <li>Delete the open <span className="font-medium text-foreground">P2A approval tasks</span> and the <span className="font-medium text-foreground">"plan approved" notification</span></li>
                      </>
                    )}
                    {isOraPlanRevert && (
                      <>
                        <li>Delete the open <span className="font-medium text-foreground">ORA approval tasks</span> and approval notifications</li>
                      </>
                    )}
                    <li><span className="font-medium text-foreground">Only re-submission and full re-approval</span> can restore this plan</li>
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

// ─── Withdraw VCR Plan Decision Dialog ─────────────────────────────
interface WithdrawDecisionState {
  task: UnifiedTask;
  approverRowId: string;
  rowStatus: 'APPROVED' | 'REJECTED';
  isPhase1Cascade: boolean;
}

const WithdrawDecisionDialog: React.FC<{
  open: boolean;
  state: WithdrawDecisionState | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}> = ({ open, state, onCancel, onConfirm, submitting }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (open) {
      setAcknowledged(false);
      setReason('');
    }
  }, [open]);

  const cascade = !!state?.isPhase1Cascade;
  const decisionWord = state?.rowStatus === 'REJECTED' ? 'rejected' : 'approved';
  const trimmed = reason.trim();
  const isValid = acknowledged && trimmed.length >= 5 && trimmed.length <= 500 && !submitting;
  const confirmLabel = cascade ? 'Withdraw & reset all approvals' : 'Withdraw decision';

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !submitting && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              cascade ? 'bg-destructive/10' : 'bg-amber-500/10',
            )}>
              <AlertTriangle className={cn('h-5 w-5', cascade ? 'text-destructive' : 'text-amber-600')} />
            </div>
            <AlertDialogTitle className="text-lg">Withdraw your decision?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              {cascade ? (
                <>
                  <p className="font-medium text-destructive">
                    You are the ORA Lead. Withdrawing your approval will VOID the baseline and
                    RESET ALL downstream approvals on this plan back to Pending, returning it to
                    Phase 1.
                  </p>
                  <p className="text-muted-foreground">This cannot be undone.</p>
                </>
              ) : (
                <p>
                  You {decisionWord} this VCR plan. Withdrawing returns your decision to{' '}
                  <span className="font-medium text-foreground">Pending</span>. Other approvers
                  are unaffected.
                </p>
              )}

              <div className="space-y-1.5 pt-1">
                <label htmlFor="withdraw-reason" className="text-xs font-medium text-foreground">
                  Reason for withdrawing <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="withdraw-reason"
                  placeholder="Explain why you are withdrawing your decision..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[72px] resize-none text-sm"
                  maxLength={500}
                />
                <div className="flex justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {trimmed.length < 5 && trimmed.length > 0 ? 'Minimum 5 characters required' : '\u00A0'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{reason.length}/500</p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(c) => setAcknowledged(!!c)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {cascade
                    ? 'I understand this will reset every approver on this plan to Pending.'
                    : 'I understand this returns my decision to Pending.'}
                </span>
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={onCancel} disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(trimmed)}
            disabled={!isValid}
            className={cn(
              'disabled:opacity-50 disabled:cursor-not-allowed',
              cascade
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-amber-600 text-white hover:bg-amber-700',
            )}
          >
            {submitting ? 'Withdrawing…' : confirmLabel}
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
  // v3 unified bar token system: neutral track (bg-muted/60) + neutral fill on
  // ALL scalar activity cards. Green is reserved for the "approved" segment
  // of bundle cards (semantic — see VCRBundleKanbanCard).
  const pct = Math.max(0, Math.min(100, Math.round((approved / total) * 100)));
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="h-1 flex-1 rounded-full bg-muted/60 overflow-hidden">
        <div className="h-full bg-muted-foreground/50" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">{pct}%</span>
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
  // Approved plan-creation cards in Done are LOCKED — an accidental drag out
  // of Done would trigger the destructive p2a_revert / ora_revert cascade in
  // move_task_to_column. The drag handle is hidden and dnd-kit is disabled.
  const isLocked = isApprovedPlanCardLocked(task);
  const isDraggable = (!!task.userTask || !!task.vcrPlanApproval) && !isLocked;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !isDraggable,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const dragProps = isDraggable ? { ...attributes, ...listeners } : {};
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={cn('select-none touch-none', isDragging && 'opacity-30', isDraggable && 'cursor-grab active:cursor-grabbing')}
      aria-disabled={isLocked || undefined}
      data-drag-locked={isLocked || undefined}
    >
      <KanbanCardContent
        task={task}
        onClick={onClick}
        accentClass={accentClass}
      />
    </div>
  );
};

// ─── Card Content (shared between board + drag overlay) ────────────
const KanbanCardContent: React.FC<{
  task: UnifiedTask;
  onClick: () => void;
  isOverlay?: boolean;
  accentClass?: string;
  isChild?: boolean;
}> = ({ task, onClick, isOverlay, accentClass, isChild }) => {
  // Mockup v3: VCR bundle tasks get a dedicated card body (delivering %/approving n).
  const vcrBundle = task.bundleTask;
  if (vcrBundle && (vcrBundle.type === 'vcr_checklist_bundle' || vcrBundle.type === 'vcr_approval_bundle')) {
    return (
      <VCRBundleKanbanCard
        bundle={vcrBundle}
        onClick={onClick}
        isChild={isChild}
      />
    );
  }
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
  const strippedTitleCollisions = useContext(TitleCollisionContext);

  // Rail color encodes URGENCY (overdue/due-soon/on-track) — see computeUrgency.
  // Rejected status keeps the destructive override.
  const urgency = computeUrgency(task);
  const railShadow = (() => {
    if (task.kanbanColumn === 'done') return undefined;
    if (accentClass === 'border-l-destructive') return 'inset 2px 0 0 0 hsl(var(--destructive) / 0.5)';
    switch (urgency.rail) {
      case 'red':   return 'inset 2px 0 0 0 rgb(239 68 68 / 0.45)';
      case 'amber': return 'inset 2px 0 0 0 rgb(245 158 11 / 0.45)';
      case 'grey':
      default:      return undefined;
    }
  })();

  // v3 pill rule: pills ONLY on Done column, and only for distinct
  // governance outcomes ("Approved" / "Qualified" — green). Plain completed
  // tasks and non-Done columns render NO status pill (column encodes state).
  // The compact overdue chip on non-Done cards is handled separately below.
  const statusPillNode: React.ReactNode = task.kanbanColumn === 'done' ? (() => {
    const m = task.userTask?.metadata as Record<string, any> | undefined;
    const action = m?.action;
    const source = m?.source;
    const planStatus = (m?.plan_status || '').toUpperCase();
    const isP2aAuthor = action === 'create_p2a_plan';
    const isOraAuthor = action === 'create_ora_plan' || task.userTask?.type === 'ora_plan_creation';
    const isP2aApprover = source === 'p2a_handover' && !isP2aAuthor;
    const isWorkflowTask = isP2aAuthor || isOraAuthor || isP2aApprover;
    if (!isWorkflowTask) return null;
    const totalApprovers = m?.total_approvers as number | undefined;
    const approvedCount = m?.approved_count as number | undefined;
    const authorProjectId = m?.project_id as string | undefined;
    const authorApproval = isP2aAuthor
      ? (authorProjectId ? p2aApprovalSummaries.get(authorProjectId) : undefined)
      : isOraAuthor
        ? (authorProjectId ? oraApprovalSummaries.get(authorProjectId) : undefined)
        : undefined;
    const reviewerData = task.userTask?.id ? reviewerSummaries.get(task.userTask.id) : undefined;
    const isApproved =
      ['APPROVED', 'COMPLETED'].includes(planStatus) ||
      (isP2aApprover && totalApprovers != null && totalApprovers > 0 && (approvedCount || 0) >= totalApprovers) ||
      (!!authorApproval && authorApproval.total > 0 && authorApproval.approved >= authorApproval.total && authorApproval.rejected === 0) ||
      (!!reviewerData && reviewerData.total > 0 && reviewerData.approved >= reviewerData.total && reviewerData.rejected === 0);
    if (!isApproved) return null;
    const chipCls = 'text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    return <span className={chipCls}>Approved</span>;
  })() : null;


  // Overdue: tiny Clock glyph + "{n}d" in destructive tone, top-right.
  const overdueChip: React.ReactNode = (() => {
    if (task.kanbanColumn === 'done') return null;
    if (urgency.rail !== 'red' || !urgency.label) return null;
    const m = /(\d+)\s*day/i.exec(urgency.label);
    const days = m ? Number(m[1]) : null;
    if (!days) return null;
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] text-destructive tabular-nums whitespace-nowrap">
        <Clock className="h-2.5 w-2.5" strokeWidth={2.25} />
        {days}d
      </span>
    );
  })();

  const topRightChip = statusPillNode ?? overdueChip;

  return (
    <Card
      onClick={onClick}
      tabIndex={0}
      style={railShadow ? { boxShadow: `${railShadow}, 0 1px 2px 0 rgb(0,0,0,0.03)` } : undefined}
      className={cn(
        "relative overflow-hidden",
        isChild ? "p-2 cursor-pointer rounded-md group border-l-2" : "p-3.5 pl-4 cursor-pointer transition-all duration-200 rounded-lg group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isChild
          ? "border-0 border-l-border/50 bg-muted/30 shadow-none hover:bg-muted/50"
          : "border border-border/60 bg-card shadow-[0_1px_2px_0_rgb(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-md hover:border-border",
        isChild && 'border-l-border/50',
        task.isWaiting && !isWaitingVcrApprovalBundle && 'opacity-50',
        isOverlay && 'shadow-xl ring-2 ring-primary/20 rotate-[1deg] scale-[1.02]',
      )}
    >



      {/* Row 1: chip row (flush left) + top-right status/overdue chip */}
      <div className="flex items-center gap-1.5 min-w-0">
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
        {topRightChip && <div className="ml-auto shrink-0">{topRightChip}</div>}
      </div>

      {/* Title + View in Gantt */}
      <div className={cn("flex items-start justify-between gap-1", isChild ? "mt-1" : "mt-2")}>
        <p className={cn(
          "text-foreground break-words overflow-hidden flex-1",
          isChild ? "text-xs leading-snug font-medium" : "text-[13px] leading-[1.3] font-medium"
        )}>
          {(() => {
            let title = task.title;
            if (task.project) {
              const escaped = task.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              title = title.replace(new RegExp(`\\s*[–\\-]\\s*${escaped}\\s*$`), '');
              title = title.replace(new RegExp(`^\\s*${escaped}\\s*[:\\-–]\\s*`, 'i'), '');
            }
            title = shortenInlineVCRCode(title);
            const stripped = stripLeadingTaskVerb(title);
            title = strippedTitleCollisions.has(stripped) ? title : stripped;
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

      {/* Unified skeleton row: [bar + trailing %]. Approval progress preferred
          when available; else in-progress % / step count; else counted items.
          Done column: no progress bar at all (finished work). */}
      {!isChild && task.kanbanColumn !== 'done' && (() => {
        const approvalProgress = getApprovalProgress(task, reviewerSummaries, p2aApprovalSummaries, oraApprovalSummaries);
        if (approvalProgress) {
          return (
            <div className="mt-2.5">
              <ApprovalBar approved={approvalProgress.approved} total={approvalProgress.total} />
            </div>
          );
        }
        // Counted sub-deliverables (bundle-like tasks not routed to VCRBundleKanbanCard).
        if (task.totalItems != null && task.totalItems > 0) {
          const pct = Math.max(0, Math.min(100, Math.round(((task.completedItems || 0) / task.totalItems) * 100)));
          const unit = 'items';
          return (
            <>
              <div className="mt-2.5 flex items-center gap-1.5">
                <Progress value={pct} className="h-1 flex-1 bg-muted/60" indicatorClassName="bg-muted-foreground/50" />
                <span className="text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-2">
                {task.completedItems} of {task.totalItems} {unit}
              </p>
            </>
          );
        }
        // Scalar % (in-progress) — bar + %, no subtext (per v3 subtext rule).
        if (task.kanbanColumn === 'in_progress') {
          const isVcrReview = !!task.vcrPlanApproval;
          const pct = task.progressPercentage ?? 0;
          const reviewedSteps = isVcrReview
            ? (task.vcrPlanApproval!.reviewMaxStep != null
                ? Math.min((task.vcrPlanApproval!.reviewMaxStep as number) + 1, 10)
                : (task.vcrPlanApproval!.reviewStartedAt ? 1 : 0))
            : 0;
          const stepInfo = isVcrReview
            ? { reviewed: reviewedSteps, total: 10 }
            : (task.stepProgress ?? null);
          return (
            <>
              <div className="mt-2.5 flex items-center gap-1.5">
                <Progress value={pct} className="h-1 flex-1 bg-muted/60" indicatorClassName="bg-muted-foreground/50" />
                <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
              </div>
              {stepInfo && (
                <p className="text-[11px] text-muted-foreground leading-snug mt-2">
                  {stepInfo.reviewed} of {stepInfo.total} steps
                </p>
              )}
            </>
          );
        }
        return null;
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
// The legacy chevron expand button (top-right) was removed per v3: the whole
// card is clickable and sub-tasks are shown in the detail drawer, so the
// inline affordance was redundant and collided with the overdue chip.
const KanbanCardWithChildren: React.FC<{
  task: UnifiedTask;
  accentClass?: string;
  onTaskClick: (task: UnifiedTask) => void;
}> = ({ task, accentClass, onTaskClick }) => {
  return (
    <DraggableKanbanCard
      task={task}
      onClick={() => onTaskClick(task)}
      accentClass={accentClass}
    />
  );
};

// ─── Project Group ─────────────────────────────────────────────────
// v3: VCR sub-clustering removed. Project is the one and only grouping tier.
// Cards render flat under the project header.
const ProjectGroup: React.FC<{
  projectName: string;
  tasks: UnifiedTask[];
  onTaskClick: (task: UnifiedTask) => void;
  accentClass?: string;
}> = ({ projectName, tasks, onTaskClick, accentClass }) => {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left mt-4 mb-2 group first:mt-0">
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{projectName}</span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{tasks.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2.5">
        {tasks.map(task => {
          const meta = task.userTask?.metadata as Record<string, any> | undefined;
          const isRejected = meta?.outcome === 'rejected';
          return (
            <KanbanCardWithChildren
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              accentClass={isRejected ? 'border-l-destructive' : accentClass}
            />
          );
        })}
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
  const [myItemsBundle, setMyItemsBundle] = useState<VCRBundleTask | null>(null);
  const [myItemsOpen, setMyItemsOpen] = useState(false);
  const [vcrPlanApproval, setVcrPlanApproval] = useState<UnifiedTask['vcrPlanApproval'] | null>(null);
  const [vcrItemTask, setVcrItemTask] = useState<UnifiedTask['vcrItemTask'] | null>(null);
  const [vcrItemTaskOpen, setVcrItemTaskOpen] = useState(false);
  const [vcrPlanApprovalOpen, setVcrPlanApprovalOpen] = useState(false);
  const [withdrawState, setWithdrawState] = useState<WithdrawDecisionState | null>(null);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);
  
  const { moveTaskToColumn } = useKanbanDragDrop();
  const { recall: recallVcrPlan } = useRecallVcrPlan();

  // Per-column sort + group state (in-memory, board-local). Done defaults to
  // recently-completed; the others default to the global priority order.
  // Grouping is per-column (mirrors the sort model) so changing one column's
  // grouping does NOT affect the others.
  const [columnSort, setColumnSort] = useState<Record<KanbanColumn, SortKey>>(DEFAULT_COLUMN_SORT);
  const [columnGroupBy, setColumnGroupBy] = useState<Record<KanbanColumn, GroupBy>>({
    todo: 'project', in_progress: 'project', waiting: 'project', done: 'project',
  });

  // Lens toggle: "My work" (default) hides approval bundles; "My reviews"
  // shows only approval bundles re-columned by decision state. Persisted per
  // user in localStorage.
  const [lens, setLens] = useState<'work' | 'reviews'>(() => {
    try {
      const v = localStorage.getItem('kanban-lens');
      return v === 'reviews' ? 'reviews' : 'work';
    } catch { return 'work'; }
  });
  useEffect(() => {
    try { localStorage.setItem('kanban-lens', lens); } catch { /* noop */ }
  }, [lens]);

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

  // VCR interdisciplinary / SoF meeting task launchers
  interface VcrTaskTarget {
    taskId: string;
    handoverPointId: string;
    projectId?: string;
    vcrCode?: string;
    vcrName?: string;
    projectPrefix?: string;
  }
  const [interTaskTarget, setInterTaskTarget] = useState<VcrTaskTarget | null>(null);
  const [sofTaskTarget, setSofTaskTarget] = useState<VcrTaskTarget | null>(null);
  const [pacTaskTarget, setPacTaskTarget] = useState<VcrTaskTarget | null>(null);
  const [qualTaskTarget, setQualTaskTarget] = useState<{
    taskId: string;
    handoverPointId: string;
    qualificationId: string;
    vcrCode?: string;
    vcrName?: string;
  } | null>(null);
  const [whTaskTarget, setWhTaskTarget] = useState<{
    taskType: 'wh_delivery_bundle' | 'wh_review';
    handoverPointId: string;
    itpActivityId?: string;
    deliveringPartyRoleId?: string;
    subItemActivityIds?: string[];
    vcrCode: string;
    vcrName: string;
  } | null>(null);
  const [trainingTaskTarget, setTrainingTaskTarget] = useState<{ trainingId: string } | null>(null);

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

    // VCR bundle click routing (mockup v3):
    //   vcr_approval_bundle → Items-to-review panel (supersedes VCRApprovalBundleSheet)
    //   vcr_checklist_bundle → My items panel
    const bundle = task.bundleTask as VCRBundleTask | undefined;
    const bundleType = bundle?.type ?? (task as { type?: string }).type ?? task.userTask?.type;
    if (bundle && bundleType === 'vcr_approval_bundle') {
      setSelectedTask(null);
      setDetailOpen(false);
      setApprovalBundle(bundle);
      setApprovalBundleOpen(true);
      return;
    }
    if (bundle && bundleType === 'vcr_checklist_bundle') {
      setSelectedTask(null);
      setDetailOpen(false);
      setMyItemsBundle(bundle);
      setMyItemsOpen(true);
      return;
    }

    // VCR Plan Approval task — has no userTask; route to the dedicated decision sheet.
    if (task.vcrPlanApproval) {
      console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'vcr_plan_approval' });
      const approverRowId = task.vcrPlanApproval.approverRowId;
      setVcrPlanApproval(task.vcrPlanApproval);
      setVcrPlanApprovalOpen(true);
      // Fire-and-forget: opening the review counts as "started".
      import('@/lib/vcrPlanReviewStart').then(({ markVcrReviewStarted }) => {
        markVcrReviewStarted(approverRowId).then(() => {
          queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        });
      });
      return;
    }

    // VCR Item task aggregator — open the per-project, per-role item list sheet.
    if (task.vcrItemTask) {
      console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'vcr_item_task' });
      setVcrItemTask(task.vcrItemTask);
      setVcrItemTaskOpen(true);
      return;
    }



    if (task.userTask) {
      const meta = task.userTask.metadata as Record<string, any> | undefined;
      const isReviewTask = meta?.source === 'task_review';

      // VCR plan resubmit task — open the VCR wizard directly in edit mode for the submitter.
      if (task.userTask.type === 'vcr_plan_resubmit' && meta?.vcr_id) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'vcr_plan_resubmit' });
        handleOpenVCRWizard(
          meta.vcr_id as string,
          (meta.vcr_code as string) || '',
          (meta.vcr_name as string) || (task.userTask.title || ''),
          (meta.project_id as string) || '',
          (meta.project_code as string) || ''
        );
        return;
      }

      // VCR Interdisciplinary Summary task — open the summary modal directly.
      if (task.userTask.type === 'vcr_interdisciplinary_summary' && meta?.handover_point_id) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'vcr_interdisciplinary_summary' });
        setInterTaskTarget({
          taskId: task.userTask.id,
          handoverPointId: meta.handover_point_id as string,
          projectId: meta.project_id as string | undefined,
          vcrCode: meta.vcr_code as string | undefined,
          vcrName: meta.vcr_name as string | undefined,
          projectPrefix: meta.project_prefix as string | undefined,
        });
        return;
      }

      // Schedule SoF Meeting task — open the scheduler modal directly.
      if (meta?.action === 'schedule_sof_meeting' && meta?.handover_point_id) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'schedule_sof_meeting' });
        setSofTaskTarget({
          taskId: task.userTask.id,
          handoverPointId: meta.handover_point_id as string,
          projectId: meta.project_id as string | undefined,
          vcrCode: meta.vcr_code as string | undefined,
          vcrName: meta.vcr_name as string | undefined,
          projectPrefix: meta.project_prefix as string | undefined,
        });
        return;
      }

      // Schedule PAC Meeting task — open the PAC scheduler modal directly.
      if (meta?.action === 'schedule_pac_meeting' && meta?.handover_point_id) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'schedule_pac_meeting' });
        setPacTaskTarget({
          taskId: task.userTask.id,
          handoverPointId: meta.handover_point_id as string,
          projectId: meta.project_id as string | undefined,
          vcrCode: meta.vcr_code as string | undefined,
          vcrName: meta.vcr_name as string | undefined,
          projectPrefix: meta.project_prefix as string | undefined,
        });
        return;
      }

      // Qualification review task — open the qualification drawer via a dedicated launcher.
      if ((meta?.action === 'review_qualification' || task.userTask.type === 'qualification_review') && meta?.qualification_id) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: 'qualification_review' });
        setQualTaskTarget({
          taskId: task.userTask.id,
          handoverPointId: meta.handover_point_id as string,
          qualificationId: meta.qualification_id as string,
          vcrCode: meta.vcr_code as string | undefined,
          vcrName: meta.vcr_name as string | undefined,
        });
        return;
      }

      // Training task routing — owner action or reviewer decision.
      if ((task.userTask.type === 'training_action' || task.userTask.type === 'training_review') && meta?.training_id) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: task.userTask.type });
        setTrainingTaskTarget({ trainingId: meta.training_id as string });
        return;
      }

      // Witness & Hold task routing — bundle (delivering party) or review (accepting party).
      if ((task.userTask.type === 'wh_delivery_bundle' || task.userTask.type === 'wh_review') && meta?.point_id) {
        console.log('[TaskKanbanBoard] handleTaskClick:branch', { branch: task.userTask.type });
        const subs = Array.isArray((task.userTask as any).sub_items)
          ? ((task.userTask as any).sub_items as Array<{ itp_activity_id?: string }>)
          : [];
        setWhTaskTarget({
          taskType: task.userTask.type as 'wh_delivery_bundle' | 'wh_review',
          handoverPointId: meta.point_id as string,
          itpActivityId: (meta.itp_activity_id as string | undefined) ?? undefined,
          deliveringPartyRoleId: (meta.delivering_party_role_id as string | undefined) ?? undefined,
          subItemActivityIds: subs.map((s) => s.itp_activity_id).filter((v): v is string => !!v),
          vcrCode: (meta.vcr_code as string) || '',
          vcrName: (meta.vcr_name as string) || '',
        });
        return;
      }

      const isOraActivity = !isReviewTask && task.userTask.type !== 'vcr_plan_resubmit' && (task.userTask.type === 'ora_activity' || meta?.action === 'complete_ora_activity' || meta?.action === 'create_p2a_plan' || meta?.action === 'create_vcr_delivery_plan' || meta?.ora_plan_activity_id);
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
  }, [navigate, handleOpenVCRWizard]);

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
      const approverRowId = task.vcrPlanApproval.approverRowId;
      const rowStatus = task.vcrPlanApproval.rowStatus;
      const isDecided = rowStatus === 'APPROVED' || rowStatus === 'REJECTED';

      // Decided card dragged OUT of Done → open Withdraw dialog instead of
      // marking/clearing review-started or opening the review modal.
      if (isDecided && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
        const isPhase1Cascade =
          task.vcrPlanApproval.roleKey === 'ora_lead' && rowStatus === 'APPROVED';
        setWithdrawState({
          task,
          approverRowId,
          rowStatus: rowStatus as 'APPROVED' | 'REJECTED',
          isPhase1Cascade,
        });
        return;
      }

      if (targetColumn === 'done') {
        setVcrPlanApproval(task.vcrPlanApproval);
        setVcrPlanApprovalOpen(true);
      } else if (targetColumn === 'in_progress') {
        // Mark "review started" (idempotent: only writes when null).
        const { markVcrReviewStarted } = await import('@/lib/vcrPlanReviewStart');
        await markVcrReviewStarted(approverRowId);
        queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      } else if (targetColumn === 'todo') {
        // Drag back from In Progress → clear the marker so it returns to To Do.
        const { clearVcrReviewStarted } = await import('@/lib/vcrPlanReviewStart');
        await clearVcrReviewStarted(approverRowId);
        queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      }
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
    const isVcrDeliveryPlan = task.userTask.type === 'vcr_delivery_plan' || meta?.action === 'create_vcr_delivery_plan';
    const vcrHandoverId = isVcrDeliveryPlan ? (meta?.vcr_id || meta?.handover_point_id || meta?.source_ref_id) as string | undefined : undefined;

    // ── VCR delivery plan: Done → back triggers recall (or blocked dialog) ──
    if (isVcrDeliveryPlan && vcrHandoverId && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
      try {
        const { data: rows } = await (supabase as any)
          .from('v_vcr_plan_approver_tasks')
          .select('execution_plan_status')
          .eq('handover_point_id', vcrHandoverId)
          .limit(1);
        const first = rows?.[0];
        const status = first?.execution_plan_status;
        if (status === 'SUBMITTED') {
          await recallVcrPlan(vcrHandoverId);
          return;
        }
      } catch (err) {
        console.error('[Kanban] VCR recall pre-check failed', err);
      }
      // Fall through to generic warning for non-SUBMITTED states (e.g. APPROVED).
    }

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
  }, [moveTaskToColumn, recallVcrPlan, queryClient]);

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

  const handleWithdrawCancel = useCallback(() => {
    if (withdrawSubmitting) return;
    setWithdrawState(null);
  }, [withdrawSubmitting]);

  const handleWithdrawConfirm = useCallback(async (reason: string) => {
    if (!withdrawState) return;
    setWithdrawSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc('withdraw_vcr_plan_approval', {
        p_approver_row_id: withdrawState.approverRowId,
        p_reason: reason,
      });
      if (error) throw error;
      const payload = data as { scope?: string; approvers_reset?: number } | null;
      if (payload?.scope === 'phase1_cascade') {
        toast.success(`Approvals reset (${payload.approvers_reset ?? 0}) — plan returned to Phase 1`);
      } else {
        toast.success('Decision withdrawn — back to Pending');
      }
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-approval-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      setWithdrawState(null);
    } catch (err: any) {
      const msg: string = err?.message || String(err);
      if (msg.includes('42501') || /forbidden/i.test(msg)) {
        toast.error('You can only withdraw your own decision');
      } else if (/nothing to withdraw/i.test(msg)) {
        toast.error('This decision is already pending');
      } else {
        toast.error(msg);
      }
      setWithdrawState(null);
    } finally {
      setWithdrawSubmitting(false);
    }
  }, [withdrawState, queryClient]);

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

  // Lens partition. "My reviews" surfaces vcr/pssr approval bundles only;
  // "My work" hides them. Both derive from the same input list.
  const isReviewBundle = (u: UnifiedTask): boolean => {
    const bt = (u.bundleTask as { type?: string } | undefined)?.type;
    return bt === 'vcr_approval_bundle' || bt === 'pssr_approval_bundle';
  };
  const workTasks = useMemo(() => tasks.filter(u => !isReviewBundle(u)), [tasks]);
  const reviewBundles = useMemo(() => tasks.filter(isReviewBundle), [tasks]);

  // Aggregate awaiting count across all review bundles (badge on the toggle).
  // Reads the trigger-maintained `approver_awaiting_items` counter, which
  // correctly excludes not-yet-submitted items and REJECTED prereqs. Falls
  // back to (total - decided) only for legacy rows missing the field.
  const awaitingTotal = useMemo(() => {
    let n = 0;
    for (const u of reviewBundles) {
      const m = (u.bundleTask?.metadata || {}) as Record<string, any>;
      const total = Number(m.approver_total_items ?? 0);
      const decided = Number(m.approver_decided_items ?? 0);
      n += m.approver_awaiting_items != null
        ? Number(m.approver_awaiting_items)
        : Math.max(0, total - decided);
    }
    return n;
  }, [reviewBundles]);

  const columnData = useMemo(() => {
    const source = lens === 'reviews' ? reviewBundles : workTasks;
    return COLUMNS.map(col => {
      const filtered = source.filter(t =>
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
  }, [workTasks, reviewBundles, lens, COLUMNS, columnSort]);

  // Reviews-lens decision buckets. Approval bundles are re-columned by their
  // review state, not by kanbanColumn.
  interface ReviewBucketDef { key: 'needs' | 'in_progress' | 'waiting' | 'done'; label: string; hint?: string; dim?: boolean; }
  const REVIEW_BUCKETS: ReviewBucketDef[] = [
    { key: 'needs', label: 'Needs my decision' },
    { key: 'in_progress', label: 'In review progress' },
    { key: 'waiting', label: 'Waiting on delivering parties', hint: 'Nothing submitted yet', dim: true },
    { key: 'done', label: 'Done' },
  ];
  const reviewBuckets = useMemo(() => {
    const buckets: Record<ReviewBucketDef['key'], UnifiedTask[]> = { needs: [], in_progress: [], waiting: [], done: [] };
    for (const u of reviewBundles) {
      if (u.kanbanColumn === 'done') { buckets.done.push(u); continue; }
      const m = (u.bundleTask?.metadata || {}) as Record<string, any>;
      const total = Number(m.approver_total_items ?? u.bundleTask?.sub_items?.length ?? 0);
      const decided = Number(m.approver_decided_items ?? 0);
      const awaiting = m.approver_awaiting_items != null
        ? Number(m.approver_awaiting_items)
        : Math.max(0, total - decided);
      if (awaiting > 0 && decided > 0) buckets.in_progress.push(u);
      else if (awaiting > 0) buckets.needs.push(u);
      else buckets.waiting.push(u);
    }
    return buckets;
  }, [reviewBundles]);


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
        <ProjectGroup key={project} projectName={project} tasks={tasks} onTaskClick={handleTaskClick} accentClass={col.accent} />
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
        <ProjectGroup key={category} projectName={category} tasks={tasks} onTaskClick={handleTaskClick} accentClass={col.accent} />
      ));
    }

    // Default (no explicit grouping) — flat card list. VCR sub-clustering
    // was removed in v3; project grouping is the sole grouping tier.
    return (
      <>
        {columnTasks.map(task => {
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
        })}
      </>
    );
  };

  const reviewerMap = reviewerSummaries || new Map<string, ReviewerSummary>();
  const p2aApprovalMap = p2aApprovalSummaries || new Map<string, P2AApprovalSummary>();
  const oraApprovalMap = oraApprovalSummaries || new Map<string, ORAApprovalSummary>();

  // Collision guard for verb-stripped titles: only strips "Deliver" today,
  // but if two cards share the same stripped title we keep the originals.
  const strippedTitleCollisions = useMemo(() => {
    const stripFor = (task: UnifiedTask): { stripped: string; original: string } => {
      let title = task.title || '';
      if (task.project) {
        const escaped = task.project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        title = title.replace(new RegExp(`\\s*[–\\-]\\s*${escaped}\\s*$`), '');
        title = title.replace(new RegExp(`^\\s*${escaped}\\s*[:\\-–]\\s*`, 'i'), '');
      }
      const normalized = shortenInlineVCRCode(title);
      return { stripped: stripLeadingTaskVerb(normalized), original: normalized };
    };
    const byStripped = new Map<string, Set<string>>();
    for (const task of tasks) {
      // Bundle cards render their own titles — skip.
      if (task.bundleTask) continue;
      const { stripped, original } = stripFor(task);
      if (!stripped || stripped === original) continue;
      const set = byStripped.get(stripped) || new Set<string>();
      set.add(original);
      byStripped.set(stripped, set);
    }
    const collisions = new Set<string>();
    for (const [stripped, originals] of byStripped) {
      if (originals.size > 1) collisions.add(stripped);
    }
    return collisions;
  }, [tasks]);

  return (
    <TitleCollisionContext.Provider value={strippedTitleCollisions}>
    <ORAApprovalContext.Provider value={oraApprovalMap}>
    <P2AApprovalContext.Provider value={p2aApprovalMap}>
    <ReviewerSummaryContext.Provider value={reviewerMap}>
    <>
      {/* Lens toggle — portalled into the page toolbar so it shares a row
          with the search field. Falls back to inline rendering if the slot
          hasn't mounted yet. Persisted per user. */}
      <LensTogglePortal>
        <div className="inline-flex rounded-md border border-border/60 bg-card/40 p-0.5">
          <button
            type="button"
            onClick={() => setLens('work')}
            className={cn(
              'text-[12px] px-3 py-1 rounded transition-colors',
              lens === 'work' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            My work
          </button>
          <button
            type="button"
            onClick={() => setLens('reviews')}
            className={cn(
              'text-[12px] px-3 py-1 rounded transition-colors inline-flex items-center gap-1.5',
              lens === 'reviews' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            My reviews
            {awaitingTotal > 0 && (
              <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {awaitingTotal}
              </span>
            )}
          </button>
        </div>
      </LensTogglePortal>


      {lens === 'reviews' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
          {REVIEW_BUCKETS.map(bucket => {
            const bTasks = reviewBuckets[bucket.key];
            const isEmpty = bTasks.length === 0;
            return (
              <div key={bucket.key} className="bg-card/40 dark:bg-muted/20 rounded-xl border border-border/60 flex flex-col min-h-[60vh] overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-border/40">
                  <span className="text-[13px] font-medium text-foreground truncate">{bucket.label}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground/70">{bTasks.length}</span>
                </div>
                {isEmpty ? (
                  <div className="flex-1 flex items-stretch p-3">
                    <div className="flex-1 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-center px-4 py-8">
                      <p className="text-[11px] text-muted-foreground/60">{bucket.hint || 'Nothing here.'}</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 max-h-[calc(100vh-320px)]">
                    <div className={cn('px-3 pb-3 pt-2 space-y-2.5', bucket.dim && 'opacity-60')}>
                      {bTasks.map(task => (
                        <div key={task.id} className="space-y-1">
                          <KanbanCardWithChildren task={task} onTaskClick={handleTaskClick} />
                          {bucket.dim && (
                            <p className="text-[10px] text-muted-foreground/70 pl-3">{bucket.hint}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            );
          })}
        </div>
      ) : (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch max-w-[1220px] mx-auto">
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
                <div className="bg-card/40 dark:bg-muted/20 rounded-xl border border-border/60 flex flex-col h-full min-h-[60vh] overflow-hidden w-full max-w-[380px] mx-auto">
                  {/* Column header — subtle per-column tint strip (body stays neutral) */}
                  <div className={cn("flex items-center justify-between gap-2 px-3 pt-3 pb-2 border-b border-border/40", col.headerTint)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <ColIcon className={cn("h-3.5 w-3.5 shrink-0", col.iconColor)} strokeWidth={2.25} />
                      <span className="text-sm font-semibold text-foreground truncate">{col.label}</span>
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
                      <div className="px-3 pb-3 pt-1 space-y-2.5">
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
      )}

      <TaskDetailSheet
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <VCRItemsToReviewPanel
        bundle={approvalBundle}
        open={approvalBundleOpen}
        onOpenChange={(o) => {
          setApprovalBundleOpen(o);
          if (!o) setApprovalBundle(null);
        }}
      />

      <MyVCRItemsPanel
        bundle={myItemsBundle}
        open={myItemsOpen}
        onOpenChange={(o) => {
          setMyItemsOpen(o);
          if (!o) setMyItemsBundle(null);
        }}
      />

      {vcrItemTask && (
        <VCRItemTaskListSheet
          open={vcrItemTaskOpen}
          onOpenChange={(o) => {
            setVcrItemTaskOpen(o);
            if (!o) setVcrItemTask(null);
          }}
          role={vcrItemTask.role}
          projectId={vcrItemTask.projectId}
          projectLabel={vcrItemTask.projectLabel}
          rows={vcrItemTask.rows as any}
        />
      )}



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

      <WithdrawDecisionDialog
        open={!!withdrawState}
        state={withdrawState}
        onCancel={handleWithdrawCancel}
        onConfirm={handleWithdrawConfirm}
        submitting={withdrawSubmitting}
      />

      {/* VCR interdisciplinary summary task launcher */}
      {interTaskTarget && (
        <InterdisciplinaryTaskModal
          open={!!interTaskTarget}
          onOpenChange={(o) => { if (!o) setInterTaskTarget(null); }}
          handoverPointId={interTaskTarget.handoverPointId}
          projectId={interTaskTarget.projectId}
          vcrCode={interTaskTarget.vcrCode}
          vcrName={interTaskTarget.vcrName}
          projectPrefix={interTaskTarget.projectPrefix}
          taskId={interTaskTarget.taskId}
        />
      )}

      {/* Schedule SoF meeting task launcher */}
      {sofTaskTarget && (
        <ScheduleSofMeetingModal
          open={!!sofTaskTarget}
          onOpenChange={(o) => { if (!o) setSofTaskTarget(null); }}
          handoverPointId={sofTaskTarget.handoverPointId}
          projectId={sofTaskTarget.projectId}
          vcrCode={sofTaskTarget.vcrCode}
          vcrName={sofTaskTarget.vcrName}
          projectPrefix={sofTaskTarget.projectPrefix}
          taskId={sofTaskTarget.taskId}
        />
      )}



      {/* Schedule PAC meeting task launcher */}
      {pacTaskTarget && (
        <SchedulePacMeetingModal
          open={!!pacTaskTarget}
          onOpenChange={(o) => { if (!o) setPacTaskTarget(null); }}
          handoverPointId={pacTaskTarget.handoverPointId}
          projectId={pacTaskTarget.projectId}
          vcrCode={pacTaskTarget.vcrCode}
          vcrName={pacTaskTarget.vcrName}
          projectPrefix={pacTaskTarget.projectPrefix}
          taskId={pacTaskTarget.taskId}
        />
      )}

      {/* Qualification review task launcher */}
      {qualTaskTarget && (
        <QualificationReviewLauncher
          open={!!qualTaskTarget}
          onOpenChange={(o) => { if (!o) setQualTaskTarget(null); }}
          qualificationId={qualTaskTarget.qualificationId}
          taskId={qualTaskTarget.taskId}
          vcrCode={qualTaskTarget.vcrCode}
          vcrName={qualTaskTarget.vcrName}
        />
      )}

      {/* Witness & Hold task launcher (delivery bundle + review) */}
      {whTaskTarget && (
        <WitnessHoldTaskLauncher
          open={!!whTaskTarget}
          onOpenChange={(o) => { if (!o) setWhTaskTarget(null); }}
          taskType={whTaskTarget.taskType}
          handoverPointId={whTaskTarget.handoverPointId}
          itpActivityId={whTaskTarget.itpActivityId}
          deliveringPartyRoleId={whTaskTarget.deliveringPartyRoleId}
          subItemActivityIds={whTaskTarget.subItemActivityIds}
          vcrCode={whTaskTarget.vcrCode}
          vcrName={whTaskTarget.vcrName}
        />
      )}

      {/* Training task launcher (owner action + reviewer decision) */}
      {trainingTaskTarget && (
        <TrainingTaskLauncher
          open={!!trainingTaskTarget}
          onOpenChange={(o) => { if (!o) setTrainingTaskTarget(null); }}
          trainingId={trainingTaskTarget.trainingId}
        />
      )}

    </>
    </ReviewerSummaryContext.Provider>
    </P2AApprovalContext.Provider>
    </ORAApprovalContext.Provider>
    </TitleCollisionContext.Provider>
  );
};
