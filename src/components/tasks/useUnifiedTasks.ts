import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  RefreshCw,
  Activity,
  ListTodo,
  ClipboardList,
} from 'lucide-react';
import { isPast } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { usePSSRsAwaitingReview } from '@/hooks/usePSSRItemApprovals';
import { useUserP2AApprovals } from '@/hooks/useUserP2AApprovals';
import { useUserORPActivities } from '@/hooks/useUserORPActivities';
import { useUserOWLItems } from '@/hooks/useUserOWLItems';
import { useUserVCRBundleTasks } from '@/hooks/useUserVCRBundleTasks';
import { useUserTasks, type UserTask } from '@/hooks/useUserTasks';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { computeSmartPriority, smartPriorityToLegacy, type SmartPriorityResult, type SmartPriorityLevel } from './smartPriority';
import React from 'react';

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

function mapToKanbanColumn(task: { status: string; isWaiting?: boolean; progressPercentage?: number }): 'todo' | 'in_progress' | 'waiting' | 'done' {
  if (task.isWaiting) return 'waiting';
  const s = task.status.toLowerCase();
  if (['completed', 'done', 'approved', 'closed', 'sof_approved'].includes(s)) return 'done';
  if (['in_progress', 'in progress', 'under_review', 'pending review', 'pending_lead_review'].includes(s) || (task.progressPercentage && task.progressPercentage > 0 && task.progressPercentage < 100)) return 'in_progress';
  if (s === 'waiting') return 'waiting';
  return 'todo';
}

export function useUnifiedTasks(userId: string) {
  const { isNewSinceLastLogin } = useUserLastLogin();

  const { data: pssrs, isLoading: pssrLoading } = usePSSRsAwaitingReview(userId);
  const { approvals, isLoading: handoverLoading } = useUserP2AApprovals();
  const { activities, isLoading: oraLoading } = useUserORPActivities();
  const { items: owlItems, isLoading: owlLoading } = useUserOWLItems();
  const { bundleTasks, isLoading: bundleLoading } = useUserVCRBundleTasks();
  const { tasks: userTasks, loading: tasksLoading, updateTaskStatus } = useUserTasks();

  // Fetch ORA plan activity dates for tasks that reference an ora_plan_activity_id
  const oraActivityIds = useMemo(() => {
    return (userTasks || [])
      .map(t => (t.metadata as Record<string, any>)?.ora_plan_activity_id)
      .filter(Boolean) as string[];
  }, [userTasks]);

  const { data: oraActivityDates } = useQuery({
    queryKey: ['ora-activity-dates', oraActivityIds],
    queryFn: async () => {
      if (oraActivityIds.length === 0) return {};
      const { data, error } = await supabase
        .from('ora_plan_activities')
        .select('id, start_date, end_date, duration_days')
        .in('id', oraActivityIds);
      if (error) throw error;
      const map: Record<string, { start_date: string | null; end_date: string | null; duration_days: number | null }> = {};
      (data || []).forEach((a: any) => { map[a.id] = a; });
      return map;
    },
    enabled: oraActivityIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = pssrLoading || handoverLoading || oraLoading || owlLoading || bundleLoading || tasksLoading;

  const allTasks = useMemo<UnifiedTask[]>(() => {
    const tasks: UnifiedTask[] = [];

    (userTasks || []).forEach(t => {
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
      }

      const isWaiting = t.status === 'waiting';
      // Enrich ORA tasks with dates from ora_plan_activities if not in metadata
      const oraActId = meta?.ora_plan_activity_id;
      const oraAct = oraActId && oraActivityDates ? oraActivityDates[oraActId] : null;
      const startDate = meta?.start_date || oraAct?.start_date || undefined;
      const endDate = meta?.end_date || oraAct?.end_date || undefined;
      const durationDays = meta?.duration_days || meta?.duration_med || oraAct?.duration_days || undefined;
      const sp = computeSmartPriority({
        category,
        categoryLabel,
        startDate,
        endDate,
        dueDate: t.due_date || undefined,
        durationDays,
        progressPercentage: undefined,
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
        project: meta?.project_code || meta?.project_name || undefined,
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
        kanbanColumn: mapToKanbanColumn({ status: t.status, isWaiting }),
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
        project: item.project_number || undefined,
        status: item.stage,
        createdAt: item.created_at,
        priority: smartPriorityToLegacy(spP2a.level),
        smartPriority: spP2a,
        navigateTo: `/p2a-handover/${item.handover_id}`,
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

    (bundleTasks || []).forEach(task => {
      const isPSSR = task.type === 'pssr_checklist_bundle' || task.type === 'pssr_approval_bundle';
      const isApproval = task.type === 'vcr_approval_bundle' || task.type === 'pssr_approval_bundle';
      const isWaiting = task.status === 'waiting';
      const completed = task.sub_items.filter(i => i.completed).length;
      const total = task.sub_items.length;
      const pct = task.progress_percentage;

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
        project: isPSSR ? task.metadata?.project_name : task.metadata?.project_code,
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
          ? (task.metadata?.pssr_id ? `/pssr/${task.metadata.pssr_id}/review` : '/my-tasks')
          : (task.metadata?.vcr_id ? `/p2a-handover?vcr=${task.metadata.vcr_id}` : '/p2a-handover'),
        kanbanColumn: mapToKanbanColumn({ status: task.status, isWaiting, progressPercentage: pct }),
      });
    });

    // Sort by smart priority score (highest first), then by due date, then by created
    return tasks.sort((a, b) => {
      if (a.isWaiting && !b.isWaiting) return 1;
      if (!a.isWaiting && b.isWaiting) return -1;
      // Primary: smart priority score (descending — higher score = more urgent)
      const scoreDiff = b.smartPriority.score - a.smartPriority.score;
      if (Math.abs(scoreDiff) >= 5) return scoreDiff;
      // Secondary: due date
      const aDue = a.dueDate || a.endDate;
      const bDue = b.dueDate || b.endDate;
      if (aDue && bDue) return new Date(aDue).getTime() - new Date(bDue).getTime();
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [pssrs, approvals, activities, owlItems, bundleTasks, userTasks, oraActivityDates, isNewSinceLastLogin]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allTasks.length };
    allTasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [allTasks]);

  return { allTasks, isLoading, categoryCounts, updateTaskStatus };
}
