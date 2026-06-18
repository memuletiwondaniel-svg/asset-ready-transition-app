import { useMemo, useRef } from 'react';
import {
  ClipboardCheck,
  RefreshCw,
  Activity,
  ListTodo,
  ClipboardList,
} from 'lucide-react';
import { isPast } from 'date-fns';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserP2AApprovals } from '@/hooks/useUserP2AApprovals';
import { useUserORPActivities } from '@/hooks/useUserORPActivities';
import { useUserOWLItems } from '@/hooks/useUserOWLItems';
import { useUserTasks, type UserTask } from '@/hooks/useUserTasks';
import { useVCRPlanApprovalTasks } from '@/hooks/useVCRPlanApprovalTasks';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { computeSmartPriority, smartPriorityToLegacy, type SmartPriorityResult, type SmartPriorityLevel } from './smartPriority';
import React from 'react';

/** Normalize project codes like "DP200" → "DP-200", strip project names */
function normalizeProjectCode(code?: string): string | undefined {
  if (!code) return undefined;
  // If it contains " - " (e.g. "DP200 - Test a Test"), take only the code part
  const raw = code.includes(' - ') ? code.split(' - ')[0].trim() : code.trim();
  // Insert hyphen if missing between letters and digits (e.g. DP200 → DP-200)
  return raw.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
}

/**
 * Add N business days (Mon–Fri) to an ISO timestamp, returning an ISO string.
 * Calendar-day approximation: skips Saturdays/Sundays. Public holidays not
 * considered in v1. If `fromISO` is falsy/invalid or n<=0, returns undefined.
 */
export function addBusinessDays(fromISO: string | undefined | null, n: number): string | undefined {
  if (!fromISO || n <= 0) return undefined;
  const d = new Date(fromISO);
  if (isNaN(d.getTime())) return undefined;
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString();
}

/** SLA business-days policy. Returns 0 when no SLA should be applied. */
function slaDaysFor(kind: 'approval_review' | 'plan_creation' | 'none'): number {
  if (kind === 'approval_review') return 5;
  if (kind === 'plan_creation') return 10;
  return 0;
}

export type CategoryFilter = 'all' | 'pssr' | 'ora' | 'owl' | 'vcr' | 'p2a' | 'action';

export interface UnifiedTask {
  id: string;
  category: CategoryFilter;
  categoryLabel: string;
  categoryColor: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  project?: string;
  projectId?: string;
  status: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  /** When the task reached the Done column (decided_at / updated_at / completed_at). Null if unknown. */
  completedAt?: string | null;
  priority: 'high' | 'medium' | 'low';
  smartPriority: SmartPriorityResult;
  navigateTo?: string;
  isNew: boolean;
  progressPercentage?: number;
  completedItems?: number;
  totalItems?: number;
  isWaiting?: boolean;
  userTask?: UserTask;
  durationDays?: number;
  // Kanban status mapping
  kanbanColumn: 'todo' | 'in_progress' | 'waiting' | 'done';
  // Flag for tasks that went through external approval (ORA Plan, P2A Plan)
  isApprovalProtected?: boolean;
  // Parent/child nesting (parent_task_id from user_tasks)
  parentTaskId?: string | null;
  children?: UnifiedTask[];
  // Raw bundle task (vcr_*_bundle / pssr_*_bundle) for action-surface dialogs.
  bundleTask?: any;
  // Optional secondary muted reference pill (e.g. "VCR-05") rendered next
  // to the project pill for self-describing cards.
  extraPill?: string;
  // VCR Plan Approval payload — drives the click → drawer route for cards
  // sourced from v_vcr_plan_approver_tasks.
  vcrPlanApproval?: {
    approverRowId: string;
    handoverPointId: string;
    vcrCode: string;
    vcrName: string;
    projectCode?: string;
    projectId?: string;
    roleKey: string;
    roleLabel: string;
    phase: number | null;
    rowStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    reviewStartedAt?: string | null;
    reviewMaxStep?: number | null;
  };
}

export const FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Actions' },
  { value: 'pssr', label: 'PSSR' },
  { value: 'ora', label: 'ORA' },
  { value: 'owl', label: 'OWL' },
  { value: 'vcr', label: 'VCR' },
  { value: 'p2a', label: 'P2A' },
];

interface KanbanMappingInput {
  status: string;
  isWaiting?: boolean;
  progressPercentage?: number;
  // For workflow tasks, the underlying plan status overrides task status
  planStatus?: string;
  isWorkflowTask?: boolean;
}

function mapToKanbanColumn(task: KanbanMappingInput): 'todo' | 'in_progress' | 'waiting' | 'done' {
  // For workflow tasks (Create ORA Plan, etc.), check the plan status first
  if (task.isWorkflowTask && task.planStatus) {
    const ps = task.planStatus.toUpperCase();
    if (['APPROVED', 'COMPLETED'].includes(ps)) return 'done';
  }

  if (task.isWaiting) return 'waiting';
  const s = task.status.toLowerCase();
  if (['completed', 'done', 'approved', 'closed', 'sof_approved'].includes(s)) return 'done';
  if (['in_progress', 'in progress', 'under_review', 'pending review', 'pending_lead_review'].includes(s)) return 'in_progress';
  if (s === 'waiting') return 'waiting';
  return 'todo';
}

export function useUnifiedTasks(userId: string) {
  const { isNewSinceLastLogin } = useUserLastLogin();

  const { data: pssrs, isLoading: pssrLoading } = usePSSRsAwaitingReview(userId);
  const { approvals, isLoading: handoverLoading } = useUserP2AApprovals();
  const { activities, isLoading: oraLoading } = useUserORPActivities();
  const { items: owlItems, isLoading: owlLoading } = useUserOWLItems();
  // Bundle tasks and ORA activity dates now come from the same useUserTasks query (no extra network calls)
  const { tasks: userTasks, bundleTasks, oraActivityDates, p2aActivityProgress, loading: tasksLoading, updateTaskStatus } = useUserTasks();
  const { data: vcrPlanApprovals } = useVCRPlanApprovalTasks();

  // Show cards incrementally: only block on the primary user_tasks hook for first load.
  // Other hooks (PSSR, P2A approvals, ORA, OWL) add cards as they resolve.
  const hasLoadedOnce = useRef(false);
  const isLoading = !hasLoadedOnce.current && tasksLoading;
  if (!tasksLoading) {
    hasLoadedOnce.current = true;
  }

  const allTasks = useMemo<UnifiedTask[]>(() => {
    const tasks: UnifiedTask[] = [];

    // Deduplicate P2A approval tasks: when a plan goes through multiple review cycles,
    // old completed tasks remain alongside new ones. Keep only the most recent per plan+user.
    const deduped = (() => {
      const p2aApprovalMap = new Map<string, typeof userTasks extends (infer T)[] ? T : never>();
      const result: typeof userTasks = [];
      for (const t of (userTasks || [])) {
        const meta = t.metadata as Record<string, any> | null;
        if (meta?.source === 'p2a_handover' && t.type === 'approval' && meta?.plan_id) {
          const key = `${meta.plan_id}::${meta.approver_role || ''}`;
          const existing = p2aApprovalMap.get(key);
          if (!existing || new Date(t.created_at) > new Date(existing.created_at)) {
            p2aApprovalMap.set(key, t);
          }
        } else {
          result.push(t);
        }
      }
      result.push(...p2aApprovalMap.values());
      return result;
    })();

    deduped.forEach(t => {
      const meta = t.metadata as Record<string, any> | null;
      const source = meta?.source;
      const action = meta?.action;

      let category: CategoryFilter = 'action';
      let categoryLabel = 'Task';
      let categoryColor = 'bg-muted text-muted-foreground';
      let icon: React.ElementType = ClipboardCheck;

      if (source === 'ora_workflow' || t.type === 'ora_plan_creation' || action === 'create_ora_plan') {
        category = 'ora';
        categoryLabel = action === 'create_ora_plan' ? 'ORA Plan' : t.type === 'ora_plan_review' ? 'ORA Review' : 'ORA Activity';
        categoryColor = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
        icon = Activity;
      } else if (t.type === 'ora_plan_review') {
        category = 'ora';
        categoryLabel = 'ORA Review';
        categoryColor = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        icon = Activity;
      } else if (action === 'create_vcr_delivery_plan' || t.type === 'vcr_delivery_plan') {
        category = 'vcr';
        categoryLabel = 'VCR Plan';
        categoryColor = 'bg-teal-500/10 text-teal-600 border-teal-500/20';
        icon = ClipboardList;
      } else if (source === 'pssr_workflow' || meta?.pssr_id) {
        category = 'pssr';
        categoryLabel = 'PSSR Review';
        categoryColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        icon = ClipboardCheck;
      } else if (source === 'p2a_handover') {
        category = 'p2a';
        categoryLabel = 'P2A Approval';
        categoryColor = 'bg-teal-500/10 text-teal-600 border-teal-500/20';
        icon = RefreshCw;
      } else if (source === 'task_review') {
        category = 'action';
        categoryLabel = 'Review';
        categoryColor = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        icon = ClipboardCheck;
      }

      const isWaiting = t.status === 'waiting';
      // Use pre-fetched ORA activity dates (no waterfall query)
      const oraActId = meta?.ora_plan_activity_id;
      const oraAct = oraActId && oraActivityDates ? oraActivityDates[oraActId] : null;
      // Prefer live ORA activity dates (DB source of truth) over metadata (may be stale from creation time)
      const startDate = oraAct?.start_date || meta?.start_date || undefined;
      const endDate = oraAct?.end_date || meta?.end_date || undefined;
      const durationDays = meta?.duration_days || meta?.duration_med || oraAct?.duration_days || undefined;

      // For P2A plan creation tasks, prefer the DB-sourced P2A-01 activity progress
      // over stale metadata (which may not be reset after draft deletion).
      // If the DB lookup has no entry, default to 0 rather than trusting stale metadata.
      const isP2aCreationTask = action === 'create_p2a_plan';
      const isP2aApprovalTask = source === 'p2a_handover';
      let resolvedProgress = isP2aCreationTask
        ? (p2aActivityProgress[t.id] ?? 0)
        : isP2aApprovalTask
          ? (meta?.completion_percentage ?? (t as any).progress_percentage ?? undefined)
          : (oraAct as any)?.completion_percentage ?? meta?.completion_percentage ?? (t as any).progress_percentage ?? undefined;

      // Guard: if the P2A plan is in DRAFT status (or ORA activity is IN_PROGRESS),
      // progress cannot exceed 86% (95% = submitted, 100% = approved).
      // Check both metadata and ORA activity status to handle stale data.
      const metaPlanStatus = meta?.plan_status?.toUpperCase?.();
      const oraActStatus = (oraAct as any)?.status;
      const isDraftOrInProgress = metaPlanStatus === 'DRAFT' || (isP2aCreationTask && oraActStatus === 'IN_PROGRESS' && metaPlanStatus !== 'ACTIVE');
      if (isP2aCreationTask && isDraftOrInProgress && resolvedProgress > 86) {
        resolvedProgress = 86;
      }
      // Ensure P2A tasks with 0% and pending status stay in "todo"
      if (isP2aCreationTask && t.status === 'pending' && (resolvedProgress === 0 || resolvedProgress === undefined)) {
        resolvedProgress = 0;
      }

      // Detect workflow tasks backed by external approvals (moved up for progress tier usage)
      const isOraPlanCreation = action === 'create_ora_plan' || t.type === 'ora_plan_creation';
      const isP2aPlanCreation = action === 'create_p2a_plan' || t.type === 'p2a_plan_creation';
      const isAdHocReview = source === 'task_review';
      const planStatus = meta?.plan_status;
      const isWorkflowTask = isOraPlanCreation || isP2aPlanCreation;
      // Ad-hoc review tasks are approval-protected once completed (reviewer made a decision)
      const isApprovalProtected = (isWorkflowTask && ['APPROVED', 'COMPLETED', 'ACTIVE'].includes(planStatus?.toUpperCase?.() || ''))
        || (isAdHocReview && t.status === 'completed');

      // ── ORA Plan progress tiers (mirrors P2A: 83/95/100) ──
      if (isOraPlanCreation) {
        const oraMetaPlanStatus = metaPlanStatus;
        if (oraMetaPlanStatus === 'APPROVED' || oraMetaPlanStatus === 'COMPLETED') {
          resolvedProgress = 100;
        } else if (oraMetaPlanStatus === 'PENDING_APPROVAL' || oraMetaPlanStatus === 'ACTIVE') {
          resolvedProgress = 95;
        } else if (oraMetaPlanStatus === 'DRAFT') {
          if (resolvedProgress == null || resolvedProgress > 83) resolvedProgress = 83;
        } else if (t.status === 'pending' && (resolvedProgress === 0 || resolvedProgress == null)) {
          resolvedProgress = 0;
        }
        // Reconciliation guard: if task is NOT completed but plan says APPROVED/PENDING_APPROVAL, treat as DRAFT
        if (t.status !== 'completed' && (oraMetaPlanStatus === 'APPROVED' || oraMetaPlanStatus === 'PENDING_APPROVAL' || oraMetaPlanStatus === 'ACTIVE')) {
          resolvedProgress = 83;
        }
      }

      // ─── Resolve effective due date (Step 1 policy) ───
      // Precedence: real t.due_date → inherited ORA endDate (no SLA) → SLA fallback.
      let slaKind: 'approval_review' | 'plan_creation' | 'none' = 'none';
      if (isAdHocReview || source === 'p2a_handover' || t.type === 'ora_plan_review') {
        slaKind = 'approval_review';
      } else if (isOraPlanCreation || isP2aPlanCreation || action === 'create_vcr_delivery_plan' || t.type === 'vcr_delivery_plan') {
        slaKind = 'plan_creation';
      }
      const realDueDate = t.due_date || undefined;
      const inheritedEnd = endDate; // ORA activity end_date — keep as-is, no SLA
      const slaDue = !realDueDate && !inheritedEnd
        ? addBusinessDays(t.created_at, slaDaysFor(slaKind))
        : undefined;
      const resolvedDueDate = realDueDate || slaDue;

      const sp = computeSmartPriority({
        category,
        categoryLabel,
        startDate,
        endDate,
        dueDate: resolvedDueDate,
        durationDays,
        progressPercentage: resolvedProgress,
        isWaiting,
        createdAt: t.created_at,
      });

      tasks.push({
        id: `ut-${t.id}`,
        category,
        categoryLabel,
        categoryColor,
        icon,
        title: t.title,
        subtitle: t.description || undefined,
        project: normalizeProjectCode(meta?.project_code) || undefined,
        projectId: meta?.project_id || undefined,
        status: t.status,
        dueDate: resolvedDueDate,
        startDate,
        endDate,
        createdAt: t.created_at,
        completedAt: t.status === 'completed' ? (t.updated_at ?? null) : null,
        priority: smartPriorityToLegacy(sp.level),
        smartPriority: sp,
        isNew: isNewSinceLastLogin(t.created_at),
        userTask: t,
        isWaiting,
        durationDays,
        progressPercentage: resolvedProgress,
        kanbanColumn: mapToKanbanColumn({
          status: t.status,
          isWaiting,
          progressPercentage: resolvedProgress,
          planStatus,
          isWorkflowTask,
        }),
        isApprovalProtected,
        parentTaskId: t.parent_task_id ?? null,
      });
    });

    (pssrs || []).forEach(item => {
      const pssrId = item.pssr?.id;
      if (!pssrId) return;
      if (tasks.some(t => t.userTask?.metadata?.pssr_id === pssrId)) return;
      const pssrDue = addBusinessDays(item.pendingSince, slaDaysFor('approval_review'));
      const spPssr = computeSmartPriority({
        category: 'pssr', categoryLabel: 'PSSR Review',
        dueDate: pssrDue,
        createdAt: item.pendingSince,
      });
      tasks.push({
        id: `pssr-${pssrId}`,
        category: 'pssr',
        categoryLabel: 'PSSR Review',
        categoryColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        icon: ClipboardCheck,
        title: item.pssr?.pssr_id || 'PSSR Review',
        subtitle: item.pssr?.title || undefined,
        project: item.pssr?.project_name || undefined,
        status: 'Pending Review',
        dueDate: pssrDue,
        createdAt: item.pendingSince,
        priority: smartPriorityToLegacy(spPssr.level),
        smartPriority: spPssr,
        navigateTo: `/pssr/${pssrId}/review`,
        isNew: isNewSinceLastLogin(item.pendingSince),
        kanbanColumn: 'todo',
      });
    });

    (approvals || []).forEach(item => {
      if (tasks.some(t => t.userTask?.metadata?.plan_id === item.handover_id)) return;
      const p2aDue = addBusinessDays(item.created_at, slaDaysFor('approval_review'));
      const spP2a = computeSmartPriority({
        category: 'p2a', categoryLabel: 'P2A Approval',
        dueDate: p2aDue,
        createdAt: item.created_at,
      });
      tasks.push({
        id: `p2a-${item.id}`,
        category: 'p2a',
        categoryLabel: 'P2A Approval',
        categoryColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
        icon: RefreshCw,
        title: item.handover_name || 'Handover Approval',
        project: normalizeProjectCode(item.project_number) || undefined,
        status: item.stage,
        dueDate: p2aDue,
        createdAt: item.created_at,
        priority: smartPriorityToLegacy(spP2a.level),
        smartPriority: spP2a,
        navigateTo: `/my-tasks`,
        isNew: isNewSinceLastLogin(item.created_at),
        kanbanColumn: 'todo',
      });
    });

    // VCR Plan approval tasks — actionable rows from v_vcr_plan_approver_tasks.
    // Two-phase gate: Phase 1 = ORA Lead pending; Phase 2 = remaining approvers.
    // Non-actionable Phase-2 rows are NOT surfaced as waiting stubs (per spec).
    (vcrPlanApprovals || []).forEach((item: any) => {
      // task_created_at is the moment this row became actionable to this user:
      //   - Phase 1 (ora_lead) → row's own created_at
      //   - Phase 2 (other roles) → ORA Lead's decided_at (fan-out moment)
      // (See v_vcr_plan_approver_tasks definition.)
      const created: string | null = item.task_created_at ?? null;
      const createdForPriority = created || new Date().toISOString();
      // SLA: 5 business days from the ACTIONABLE-FROM moment for this user
      // (createdForPriority = task_created_at = fan-out moment for Phase-2).
      // Only applied to still-open rows; decided rows keep neutral due date.
      const rowStatusForDue = String(item.row_status || '').toUpperCase();
      const isDecidedForDue = rowStatusForDue === 'APPROVED' || rowStatusForDue === 'REJECTED';
      const vcrPlanDue = !isDecidedForDue
        ? addBusinessDays(createdForPriority, slaDaysFor('approval_review'))
        : undefined;
      const sp = computeSmartPriority({
        category: 'vcr', categoryLabel: 'VCR Plan Approval',
        dueDate: vcrPlanDue,
        createdAt: createdForPriority,
      });
      // Short VCR code: "VCR-DP300-05" → "VCR-05" (project context is in the project pill).
      const codeParts = (item.vcr_code || '').split('-').filter(Boolean);
      const shortCode = codeParts.length >= 2
        ? `${codeParts[0]}-${codeParts[codeParts.length - 1]}`
        : item.vcr_code;
      const vcrName: string = item.vcr_name || item.vcr_code;
      const rowStatus = String(item.row_status || '').toUpperCase();
      const isApproved = rowStatus === 'APPROVED';
      const isRejected = rowStatus === 'REJECTED';
      const isDecided = isApproved || isRejected;
      const status = isApproved ? 'Approved' : isRejected ? 'Changes requested' : 'Pending';
      const reviewStartedAt: string | null = item.review_started_at ?? null;
      const reviewMaxStep: number | null = (item.review_max_step ?? null) as number | null;
      const kanbanColumn: 'todo' | 'in_progress' | 'done' = isDecided
        ? 'done'
        : (reviewStartedAt ? 'in_progress' : 'todo');
      // Review wizard has 10 steps. Show real progress on the In Progress card.
      const VCR_REVIEW_TOTAL_STEPS = 10;
      const reviewedSteps = reviewMaxStep != null
        ? Math.min(reviewMaxStep + 1, VCR_REVIEW_TOTAL_STEPS)
        : (reviewStartedAt ? 1 : 0);
      const reviewProgressPct = Math.round((reviewedSteps / VCR_REVIEW_TOTAL_STEPS) * 100);
      tasks.push({
        id: `vcr-plan-${item.approver_row_id}`,
        category: 'vcr',
        categoryLabel: 'VCR Plan Approval',
        categoryColor: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
        icon: ClipboardCheck,
        title: `Review & Approve VCR Plan: ${vcrName}`,
        project: normalizeProjectCode(item.project_code) || undefined,
        projectId: item.project_id || undefined,
        extraPill: shortCode,
        status,
        dueDate: vcrPlanDue,
        createdAt: createdForPriority,
        priority: smartPriorityToLegacy(sp.level),
        smartPriority: sp,
        completedAt: isDecided ? (item.decided_at ?? null) : null,
        // Only mark "new" when we have a real timestamp AND the user hasn't decided yet.
        isNew: !isDecided && created ? isNewSinceLastLogin(created) : false,
        kanbanColumn,
        isApprovalProtected: isDecided,
        progressPercentage: kanbanColumn === 'in_progress' ? reviewProgressPct : undefined,
        vcrPlanApproval: {
          approverRowId: item.approver_row_id,
          handoverPointId: item.handover_point_id,
          vcrCode: item.vcr_code,
          vcrName,
          projectCode: item.project_code || undefined,
          projectId: item.project_id || undefined,
          roleKey: item.role_key,
          roleLabel: item.role_label,
          phase: item.phase ?? null,
          rowStatus: (rowStatus || null) as 'PENDING' | 'APPROVED' | 'REJECTED' | null,
          reviewStartedAt,
          reviewMaxStep,
        },
      });

    });

    const openOWL = (owlItems || []).filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
    openOWL.forEach(item => {
      const projectName = typeof item.project === 'object' && item.project !== null
        ? (item.project as any).project_title || (item.project as any).name || undefined
        : undefined;
      const spOwl = computeSmartPriority({
        category: 'owl', categoryLabel: 'OWL',
        dueDate: item.due_date || undefined,
        createdAt: item.created_at,
      });
      tasks.push({
        id: `owl-${item.id}`,
        category: 'owl',
        categoryLabel: 'OWL',
        categoryColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        icon: ListTodo,
        title: item.title,
        project: projectName,
        status: item.status === 'IN_PROGRESS' ? 'In Progress' : 'Open',
        dueDate: item.due_date || undefined,
        createdAt: item.created_at,
        priority: smartPriorityToLegacy(spOwl.level),
        smartPriority: spOwl,
        navigateTo: '/outstanding-work-list',
        isNew: isNewSinceLastLogin(item.created_at),
        kanbanColumn: item.status === 'IN_PROGRESS' ? 'in_progress' : 'todo',
      });
    });

    // Bundle tasks now come from the same useUserTasks query (no separate hook)
    (bundleTasks || []).forEach((task: any) => {
      const isPSSR = task.type === 'pssr_checklist_bundle' || task.type === 'pssr_approval_bundle';
      const isApproval = task.type === 'vcr_approval_bundle' || task.type === 'pssr_approval_bundle';
      const isWaiting = task.status === 'waiting';
      const subItems = (task.sub_items || []) as any[];
      const meta = (task.metadata || {}) as Record<string, any>;
      const pct = task.progress_percentage || 0;

      // Display consistency (VCR approval bundles): the Kanban column/status
      // and progress bar are maintained by the DB recompute trigger
      // (recompute_vcr_approval_bundle_progress) from THIS approver's ledger
      // rows. The n/M label must come from that SAME source — not a parallel
      // sub_items.completed count, which reflects the per-item "fully
      // accepted by all roles" state and disagrees with progress/status as
      // soon as one approver finishes ahead of the others.
      const isVcrApproval = task.type === 'vcr_approval_bundle';
      const metaDecided = typeof meta?.approver_decided_items === 'number'
        ? meta.approver_decided_items as number
        : undefined;
      const metaTotal = typeof meta?.approver_total_items === 'number'
        ? meta.approver_total_items as number
        : undefined;
      const completed = isVcrApproval && metaDecided !== undefined
        ? metaDecided
        : subItems.filter((i: any) => i.completed).length;
      const total = isVcrApproval && metaTotal !== undefined
        ? metaTotal
        : subItems.length;

      const bundleCat: CategoryFilter = isPSSR ? 'pssr' : 'vcr';
      const bundleLabel = isPSSR
        ? (isApproval ? 'PSSR Review' : 'PSSR Checklist')
        : (isApproval ? 'VCR Review' : 'VCR Checklist');
      // Approval bundles (vcr_approval_bundle / pssr_approval_bundle) are
      // review work → 5 BD SLA from task.created_at. Checklist bundles get
      // no SLA fallback (author work, no fabricated date).
      const bundleDue = isApproval
        ? addBusinessDays(task.created_at, slaDaysFor('approval_review'))
        : undefined;
      const spBundle = computeSmartPriority({
        category: bundleCat, categoryLabel: bundleLabel,
        dueDate: bundleDue,
        progressPercentage: pct,
        isWaiting,
        createdAt: task.created_at,
      });
      tasks.push({
        id: `bundle-${task.id}`,
        category: bundleCat,
        categoryLabel: bundleLabel,
        categoryColor: isPSSR
          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        icon: isApproval ? ClipboardCheck : ClipboardList,
        title: task.title,
        project: isPSSR ? meta?.project_name : normalizeProjectCode(meta?.project_code),
        status: `${completed}/${total}`,
        dueDate: bundleDue,
        createdAt: task.created_at,
        completedAt: task.status === 'completed' ? (task.updated_at ?? null) : null,
        priority: smartPriorityToLegacy(spBundle.level),
        smartPriority: spBundle,
        isNew: isNewSinceLastLogin(task.created_at),
        progressPercentage: pct,
        completedItems: completed,
        totalItems: total,
        isWaiting,
        navigateTo: isPSSR
          ? (meta?.pssr_id ? `/pssr/${meta.pssr_id}/review` : '/my-tasks')
          : '/my-tasks',
        kanbanColumn: mapToKanbanColumn({ status: task.status, isWaiting, progressPercentage: pct }),
        bundleTask: task,
      });
    });

    // Sort by smart priority score (highest first), then by due date, then by created
    const sorted = tasks.sort((a, b) => {
      if (a.isWaiting && !b.isWaiting) return 1;
      if (!a.isWaiting && b.isWaiting) return -1;
      const scoreDiff = b.smartPriority.score - a.smartPriority.score;
      if (Math.abs(scoreDiff) >= 5) return scoreDiff;
      const aDue = a.dueDate || a.endDate;
      const bDue = b.dueDate || b.endDate;
      if (aDue && bDue) return new Date(aDue).getTime() - new Date(bDue).getTime();
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Group by parent_task_id (single source of truth — fan-out triggers populate this FK).
    // Children attach under their parent; only top-level tasks remain in the list.
    const byUserTaskId = new Map<string, UnifiedTask>();
    for (const ut of sorted) {
      if (ut.userTask?.id) byUserTaskId.set(ut.userTask.id, ut);
    }
    const topLevel: UnifiedTask[] = [];
    for (const ut of sorted) {
      const pid = ut.parentTaskId;
      if (pid && byUserTaskId.has(pid)) {
        const parent = byUserTaskId.get(pid)!;
        (parent.children ||= []).push(ut);
      } else {
        topLevel.push(ut);
      }
    }
    // Sort children by display_order (then created)
    for (const p of topLevel) {
      if (p.children?.length) {
        p.children.sort((a, b) => {
          const ao = a.userTask?.display_order ?? 0;
          const bo = b.userTask?.display_order ?? 0;
          if (ao !== bo) return ao - bo;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      }
    }
    return topLevel;
  }, [pssrs, approvals, activities, owlItems, bundleTasks, userTasks, oraActivityDates, p2aActivityProgress, vcrPlanApprovals, isNewSinceLastLogin]);

  // Stabilization: never return an empty array if we previously had data
  const stableTasksRef = useRef<UnifiedTask[]>([]);
  const stableTasks = useMemo(() => {
    if (allTasks.length > 0) {
      stableTasksRef.current = allTasks;
      return allTasks;
    }
    if (stableTasksRef.current.length > 0 && !isLoading) {
      return stableTasksRef.current;
    }
    return allTasks;
  }, [allTasks, isLoading]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: stableTasks.length };
    stableTasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [stableTasks]);

  return { allTasks: stableTasks, isLoading, categoryCounts, updateTaskStatus };
}
