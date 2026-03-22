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
          ? (meta?.completion_percentage ?? undefined)
          : (oraAct as any)?.completion_percentage ?? meta?.completion_percentage ?? undefined;

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

      const sp = computeSmartPriority({
        category,
        categoryLabel,
        startDate,
        endDate,
        dueDate: t.due_date || undefined,
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
        dueDate: t.due_date || undefined,
        startDate,
        endDate,
        createdAt: t.created_at,
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
      });
    });

    (pssrs || []).forEach(item => {
      const pssrId = item.pssr?.id;
      if (!pssrId) return;
      if (tasks.some(t => t.userTask?.metadata?.pssr_id === pssrId)) return;
      const spPssr = computeSmartPriority({
        category: 'pssr', categoryLabel: 'PSSR Review',
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
      const spP2a = computeSmartPriority({
        category: 'p2a', categoryLabel: 'P2A Approval',
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
        createdAt: item.created_at,
        priority: smartPriorityToLegacy(spP2a.level),
        smartPriority: spP2a,
        navigateTo: `/my-tasks`,
        isNew: isNewSinceLastLogin(item.created_at),
        kanbanColumn: 'todo',
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
      const completed = subItems.filter((i: any) => i.completed).length;
      const total = subItems.length;
      const pct = task.progress_percentage || 0;
      const meta = (task.metadata || {}) as Record<string, any>;

      const bundleCat: CategoryFilter = isPSSR ? 'pssr' : 'vcr';
      const bundleLabel = isPSSR
        ? (isApproval ? 'PSSR Review' : 'PSSR Checklist')
        : (isApproval ? 'VCR Review' : 'VCR Checklist');
      const spBundle = computeSmartPriority({
        category: bundleCat, categoryLabel: bundleLabel,
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
        createdAt: task.created_at,
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
      });
    });

    // Sort by smart priority score (highest first), then by due date, then by created
    return tasks.sort((a, b) => {
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
  }, [pssrs, approvals, activities, owlItems, bundleTasks, userTasks, oraActivityDates, p2aActivityProgress, isNewSinceLastLogin]);

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
