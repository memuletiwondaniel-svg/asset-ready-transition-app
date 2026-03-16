import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, ZoomIn, ZoomOut, ChevronRight, ChevronDown, ChevronsUpDown, GitBranch, Columns3, Route, BookOpen, PenLine, FileText, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { AddFromCatalogDialog } from '@/components/ora/wizard/AddFromCatalogDialog';

import { WizardActivity } from '@/components/ora/wizard/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

import { ORAActivityTaskSheet } from '@/components/tasks/ORAActivityTaskSheet';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { P2APlanCreationWizard } from '@/components/widgets/p2a-wizard/P2APlanCreationWizard';
import { P2AWorkspaceOverlay } from '@/components/widgets/P2AWorkspaceOverlay';
import { VCRExecutionPlanWizard } from '@/components/widgets/vcr-wizard/VCRExecutionPlanWizard';
import { getStatusLabel, getStatusBadgeClasses } from './utils/statusStyles';
import { cn } from '@/lib/utils';
import { useGanttBarResize } from '@/hooks/useGanttBarResize';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { generateLeafTasks } from '@/utils/generateLeafTasks';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface ORPGanttChartProps {
  planId: string;
  deliverables: any[];
  searchQuery?: string;
  hideToolbar?: boolean;
  readOnly?: boolean;
}

const ZOOM_LEVELS = [0.15, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const ROW_HEIGHT = 40;

const COL_WIDTHS = {
  index: 36,
  id: 90,
  name: 260,
  start: 72,
  end: 72,
  duration: 48,
  status: 96,
};

// Sequential hue rotation palette for ID badges
const ID_BADGE_PALETTE = [
  { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
  { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400' },
  { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-400' },
  { bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-700 dark:text-cyan-400' },
  { bg: 'bg-pink-500/15', text: 'text-pink-700 dark:text-pink-400' },
];

type ColumnKey = 'index' | 'id' | 'start' | 'end' | 'duration' | 'status';
const TOGGLEABLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'index', label: '#' },
  { key: 'id', label: 'ID' },
  { key: 'start', label: 'Start' },
  { key: 'end', label: 'End' },
  { key: 'duration', label: 'Days' },
  { key: 'status', label: 'Status' },
];

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  IDN: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
  ASS: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  SEL: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  DEF: { bg: 'bg-teal-500/15', text: 'text-teal-700 dark:text-teal-400' },
  EXE: { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-400' },
  OPR: { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
  VCR: { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-400' },
};

const BAR_COLORS: Record<string, string> = {
  IDN: 'bg-blue-400 dark:bg-blue-500',
  ASS: 'bg-amber-400 dark:bg-amber-500',
  SEL: 'bg-emerald-400 dark:bg-emerald-500',
  DEF: 'bg-teal-400 dark:bg-teal-500',
  EXE: 'bg-indigo-400 dark:bg-indigo-500',
  OPR: 'bg-purple-400 dark:bg-purple-500',
  VCR: 'bg-rose-400 dark:bg-rose-500',
};

const BAR_COLORS_MUTED: Record<string, string> = {
  IDN: 'bg-blue-200 dark:bg-blue-800',
  ASS: 'bg-amber-200 dark:bg-amber-800',
  SEL: 'bg-emerald-200 dark:bg-emerald-800',
  DEF: 'bg-teal-200 dark:bg-teal-800',
  EXE: 'bg-indigo-200 dark:bg-indigo-800',
  OPR: 'bg-purple-200 dark:bg-purple-800',
  VCR: 'bg-rose-200 dark:bg-rose-800',
};

const ZOOM_PRESETS = [
  { label: '6M', days: 180 },
  { label: '12M', days: 365 },
  { label: '24M', days: 730 },
];

function getPhasePrefix(code: string): string {
  if (!code) return '';
  if (code.startsWith('VCR-')) return 'VCR';
  return code.split('-')[0];
}

function getParentCode(code: string): string | null {
  if (!code) return null;
  const lastDotIdx = code.lastIndexOf('.');
  if (lastDotIdx === -1) return null;
  return code.substring(0, lastDotIdx);
}

function getCodeDepth(code: string): number {
  if (!code) return 0;
  return (code.match(/\./g) || []).length;
}

function normalizeOraActivityId(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/^(ora-|ws-)/, '');
}

function getDeliverableActivityCandidates(deliverable: any): string[] {
  const candidates = [
    normalizeOraActivityId(deliverable?.deliverable?.id),
    normalizeOraActivityId(deliverable?.id),
    normalizeOraActivityId(deliverable?.metadata?.ora_plan_activity_id),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

type GanttTaskLike = {
  id: string;
  user_id?: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  type: string;
  status: string;
  display_order: number;
  created_at: string;
  metadata: Record<string, any>;
};

type ActivityTaskMapEntry = {
  taskId?: string;
  taskStatus?: string;
  activityTask?: GanttTaskLike;
  reviewTask?: GanttTaskLike;
};

interface FlatRow {
  deliverable: any;
  depth: number;
  hasChildren: boolean;
  activityCode: string;
}

function buildHierarchyFromCodes(deliverables: any[]): {
  childrenMap: Map<string | null, any[]>;
  codeToDeliverable: Map<string, any>;
} {
  const codeToDeliverable = new Map<string, any>();
  deliverables.forEach(d => {
    const code = d.deliverable?.activity_code;
    if (code) codeToDeliverable.set(code, d);
  });

  const childrenMap = new Map<string | null, any[]>();
  deliverables.forEach(d => {
    const code = d.deliverable?.activity_code || '';
    const parentCode = getParentCode(code);
    const parentKey = parentCode && codeToDeliverable.has(parentCode) ? parentCode : null;
    if (!childrenMap.has(parentKey)) childrenMap.set(parentKey, []);
    childrenMap.get(parentKey)!.push(d);
  });

  return { childrenMap, codeToDeliverable };
}

function buildVisibleRows(
  childrenMap: Map<string | null, any[]>,
  expandedCodes: Set<string>,
  parentKey: string | null = null,
  depth: number = 0
): FlatRow[] {
  const children = childrenMap.get(parentKey) || [];
  const rows: FlatRow[] = [];
  for (const d of children) {
    const code = d.deliverable?.activity_code || '';
    const hasChildren = (childrenMap.get(code) || []).length > 0;
    rows.push({ deliverable: d, depth, hasChildren, activityCode: code });
    if (hasChildren && expandedCodes.has(code)) {
      rows.push(...buildVisibleRows(childrenMap, expandedCodes, code, depth + 1));
    }
  }
  return rows;
}

function getParentDateRange(
  code: string,
  childrenMap: Map<string | null, any[]>
): { minStart: Date | null; maxEnd: Date | null } {
  const children = childrenMap.get(code) || [];
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  for (const d of children) {
    if (d.start_date) {
      const s = parseISO(d.start_date);
      if (!minStart || s < minStart) minStart = s;
    }
    if (d.end_date) {
      const e = parseISO(d.end_date);
      if (!maxEnd || e > maxEnd) maxEnd = e;
    }
    const childCode = d.deliverable?.activity_code || '';
    const sub = getParentDateRange(childCode, childrenMap);
    if (sub.minStart && (!minStart || sub.minStart < minStart)) minStart = sub.minStart;
    if (sub.maxEnd && (!maxEnd || sub.maxEnd > maxEnd)) maxEnd = sub.maxEnd;
  }

  return { minStart, maxEnd };
}

// Critical path computation
function computeCriticalPath(rows: FlatRow[], getBarPos: (s: string, e: string) => { left: number; width: number }): Set<string> {
  // Build leaf activities with dates and predecessor info
  const leaves = rows.filter(r => !r.hasChildren && r.deliverable.start_date && r.deliverable.end_date);
  if (leaves.length === 0) return new Set();

  // Build code/id lookup
  const codeToIdx = new Map<string, number>();
  leaves.forEach((r, i) => {
    const code = r.deliverable.deliverable?.activity_code;
    const id = r.deliverable.deliverable?.id || r.deliverable.id;
    if (code) codeToIdx.set(code, i);
    if (id) codeToIdx.set(id, i);
    // Also strip prefixes
    if (id && typeof id === 'string') {
      const stripped = id.replace(/^(ora-|ws-)/, '');
      codeToIdx.set(stripped, i);
    }
  });

  const n = leaves.length;
  const durations: number[] = leaves.map(r => differenceInDays(parseISO(r.deliverable.end_date), parseISO(r.deliverable.start_date)));
  const successors: number[][] = Array.from({ length: n }, () => []);
  const predecessors: number[][] = Array.from({ length: n }, () => []);

  leaves.forEach((r, i) => {
    const predIds: string[] = r.deliverable._predecessorIds || [];
    predIds.forEach(predCode => {
      const predIdx = codeToIdx.get(predCode);
      if (predIdx !== undefined && predIdx !== i) {
        predecessors[i].push(predIdx);
        successors[predIdx].push(i);
      }
    });
  });

  // Forward pass: earliest start/finish
  const es = new Array(n).fill(0);
  const ef = new Array(n).fill(0);
  // Topological order (BFS using in-degree)
  const inDeg = predecessors.map(p => p.length);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (inDeg[i] === 0) queue.push(i);
  const order: number[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of successors[u]) {
      es[v] = Math.max(es[v], es[u] + durations[u]);
      inDeg[v]--;
      if (inDeg[v] === 0) queue.push(v);
    }
  }
  for (let i = 0; i < n; i++) ef[i] = es[i] + durations[i];

  // Project end
  const projectEnd = Math.max(...ef);

  // Backward pass: latest start/finish
  const lf = new Array(n).fill(projectEnd);
  const ls = new Array(n).fill(0);
  for (let i = order.length - 1; i >= 0; i--) {
    const u = order[i];
    for (const v of successors[u]) {
      lf[u] = Math.min(lf[u], ls[v]);
    }
    ls[u] = lf[u] - durations[u];
  }

  // Critical = zero float
  const criticalSet = new Set<string>();
  for (let i = 0; i < n; i++) {
    if (Math.abs(es[i] - ls[i]) < 1) {
      criticalSet.add(leaves[i].deliverable.id);
    }
  }
  return criticalSet;
}

export const ORPGanttChart: React.FC<ORPGanttChartProps> = ({ planId, deliverables, searchQuery: externalSearchQuery, hideToolbar = false, readOnly = false }) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);
  const [showP2AWizard, setShowP2AWizard] = useState(false);
  const [showP2AWorkspace, setShowP2AWorkspace] = useState(false);
  const [showVCRWizard, setShowVCRWizard] = useState(false);
  const [vcrWizardTarget, setVcrWizardTarget] = useState<{ id: string; vcr_code: string; name: string } | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [selectedOraActivity, setSelectedOraActivity] = useState<any>(null);
  const [selectedReviewTask, setSelectedReviewTask] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [showRelationships, setShowRelationships] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => new Set(['index', 'id', 'start', 'status']));
  const [hasInitialZoom, setHasInitialZoom] = useState(false);

  // Fetch plan data for project info (needed for P2A wizard) and status (for auto-heal)
  const { data: planData } = useQuery({
    queryKey: ['orp-plan-basic', planId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('orp_plans')
        .select('project_id, status, project:projects(id, project_id_prefix, project_id_number, project_title)')
        .eq('id', planId)
        .single();
      return data;
    },
    enabled: !!planId,
    staleTime: 60_000,
  });

  // Auto-heal: generate missing leaf tasks for approved plans (handles retroactive gaps)
  const autoHealRanRef = useRef(false);
  useEffect(() => {
    if (autoHealRanRef.current) return;
    if (!planData || planData.status !== 'APPROVED') return;
    if (!deliverables || deliverables.length === 0) return;

    autoHealRanRef.current = true;
    generateLeafTasks(planId).then(({ created }) => {
      if (created > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        toast({ title: 'Tasks Generated', description: `${created} activity task(s) have been created for the Sr. ORA Engineer.` });
      }
    }).catch(err => {
      console.error('Auto-heal task generation failed:', err);
    });
  }, [planData, deliverables, planId, queryClient, toast]);

  // Reconciliation: clean up orphaned VCR activities when P2A plan is DRAFT
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (reconciledRef.current) return;
    if (!planData?.project_id) return;
    if (!existingP2APlanLoaded) return;

    const run = async () => {
      reconciledRef.current = true;
      try {
        const client = supabase as any;

        // Check if P2A plan is in DRAFT status
        const { data: p2aPlan } = await client
          .from('p2a_handover_plans')
          .select('id, status')
          .eq('project_id', planData.project_id)
          .limit(1)
          .maybeSingle();

        if (!p2aPlan || !['DRAFT', 'REJECTED'].includes(p2aPlan.status)) return;

        // Check if orphaned VCR activities exist
        const { data: orphanedVcr } = await client
          .from('ora_plan_activities')
          .select('id')
          .eq('orp_plan_id', planId)
          .in('source_type', ['p2a_vcr', 'vcr_delivery_plan'])
          .limit(1);

        if (!orphanedVcr || orphanedVcr.length === 0) return;

        console.log('[P2A Reconcile] Found orphaned VCR activities while P2A is DRAFT — cleaning up');

        // Delete VCR delivery plan user tasks
        await client
          .from('user_tasks')
          .delete()
          .eq('type', 'vcr_delivery_plan')
          .filter('metadata->>plan_id', 'eq', p2aPlan.id);

        // Delete approver tasks
        await client
          .from('user_tasks')
          .delete()
          .eq('type', 'p2a_approval')
          .filter('metadata->>plan_id', 'eq', p2aPlan.id);

        // Delete child activities first, then parents
        await client
          .from('ora_plan_activities')
          .delete()
          .eq('orp_plan_id', planId)
          .eq('source_type', 'vcr_delivery_plan');

        await client
          .from('ora_plan_activities')
          .delete()
          .eq('orp_plan_id', planId)
          .eq('source_type', 'p2a_vcr');

        // Delete ORI snapshot
        await client
          .from('ori_scores')
          .delete()
          .eq('project_id', planData.project_id)
          .eq('snapshot_type', 'p2a_approval');

        // Delete approval notifications
        await client
          .from('p2a_notifications')
          .delete()
          .eq('handover_id', p2aPlan.id)
          .eq('notification_type', 'p2a_plan_approved');

        console.log('[P2A Reconcile] Orphaned cascade artifacts cleaned up');

        // Refresh
        queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
        queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['ori-scores'] });
        queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      } catch (e) {
        console.error('[P2A Reconcile] Cleanup failed:', e);
      }
    };
    run();
  }, [planData, planId, queryClient]);

  const existingP2APlanLoaded = true; // flag for reconciliation dependency
  // Check if P2A plan exists for "Continue" vs "Create" CTA
  const { data: existingP2APlan } = useQuery({
    queryKey: ['p2a-plan-exists', planData?.project_id],
    queryFn: async () => {
      if (!planData?.project_id) return null;
      const { data } = await (supabase as any)
        .from('p2a_handover_plans')
        .select('id, status')
        .eq('project_id', planData.project_id)
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!planData?.project_id,
    staleTime: 30_000,
  });

  const p2aPlanIsSubmittedOrApproved = existingP2APlan && ['ACTIVE', 'COMPLETED', 'APPROVED'].includes(existingP2APlan.status);
  const p2aCtaLabel = p2aPlanIsSubmittedOrApproved ? 'View P2A Plan' : existingP2APlan ? 'Continue P2A Plan' : 'Develop P2A Plan';

  const activityIdsForTaskMap = useMemo(() => {
    const ids = new Set<string>();
    for (const d of deliverables || []) {
      for (const candidate of getDeliverableActivityCandidates(d)) {
        ids.add(candidate);
        ids.add(`ora-${candidate}`);
        ids.add(`ws-${candidate}`);
      }
    }
    return [...ids];
  }, [deliverables]);

  // Pre-fetch mapping by ORA activity ID for both authoring and review tasks
  const { data: activityTaskMap } = useQuery({
    queryKey: ['ora-activity-task-map', planId, activityIdsForTaskMap],
    queryFn: async () => {
      if (activityIdsForTaskMap.length === 0) return {};

      const { data } = await (supabase as any)
        .from('user_tasks')
        .select('id, user_id, title, description, due_date, priority, type, status, display_order, created_at, metadata')
        .in('metadata->>ora_plan_activity_id', activityIdsForTaskMap);

      const map: Record<string, ActivityTaskMapEntry> = {};

      for (const row of data || []) {
        const metadata = (row.metadata || {}) as Record<string, any>;
        const activityId = normalizeOraActivityId(metadata.ora_plan_activity_id as string | undefined);
        if (!activityId) continue;

        const task: GanttTaskLike = {
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          description: row.description,
          due_date: row.due_date,
          priority: row.priority,
          type: row.type,
          status: row.status,
          display_order: row.display_order,
          created_at: row.created_at,
          metadata,
        };

        const current = map[activityId] || {};
        const isReviewTask = row.type === 'review' || metadata.source === 'task_review';

        if (isReviewTask) {
          const sourceTaskId = metadata.source_task_id as string | undefined;
          const shouldReplaceReview =
            !current.reviewTask ||
            (task.user_id === user?.id && current.reviewTask.user_id !== user?.id) ||
            (current.reviewTask.status !== 'pending' && task.status === 'pending');
          if (shouldReplaceReview) current.reviewTask = task;
          if (!current.taskId && sourceTaskId) current.taskId = sourceTaskId;
        } else {
          const shouldReplaceActivity =
            !current.activityTask ||
            (task.user_id === user?.id && current.activityTask.user_id !== user?.id);
          if (shouldReplaceActivity) {
            current.taskId = row.id;
            current.taskStatus = row.status;
            current.activityTask = task;
          }
        }

        map[activityId] = current;
      }

      return map;
    },
    enabled: activityIdsForTaskMap.length > 0,
    staleTime: 30_000,
  });

  // Pre-fetch reviewer counts per source task for progress/status reconciliation
  const taskIdsForReviewerCheck = useMemo(() => {
    if (!activityTaskMap) return [];
    return [...new Set(Object.values(activityTaskMap).map(v => v.taskId).filter(Boolean) as string[])];
  }, [activityTaskMap]);

  const { data: pendingReviewerMap } = useQuery({
    queryKey: ['gantt-pending-reviewers', planId, taskIdsForReviewerCheck],
    queryFn: async () => {
      if (taskIdsForReviewerCheck.length === 0) return {};
      const { data } = await (supabase as any)
        .from('task_reviewers')
        .select('task_id, status')
        .in('task_id', taskIdsForReviewerCheck);
      const taskMap: Record<string, { total: number; pending: number; approved: number }> = {};
      for (const r of data || []) {
        if (!taskMap[r.task_id]) taskMap[r.task_id] = { total: 0, pending: 0, approved: 0 };
        taskMap[r.task_id].total++;
        if (r.status === 'PENDING') taskMap[r.task_id].pending++;
        if (r.status === 'APPROVED') taskMap[r.task_id].approved++;
      }
      return taskMap;
    },
    enabled: taskIdsForReviewerCheck.length > 0,
    staleTime: 30_000,
  });

  const getTaskEntryForDeliverable = useCallback((deliverable: any) => {
    const candidates = getDeliverableActivityCandidates(deliverable);
    for (const candidate of candidates) {
      const entry = activityTaskMap?.[candidate];
      if (entry) {
        return { activityId: candidate, taskEntry: entry };
      }
    }
    return { activityId: candidates[0] || '', taskEntry: undefined as ActivityTaskMapEntry | undefined };
  }, [activityTaskMap]);

  // Helper: reconcile status/progress for activities under ad-hoc review
  const getReconciledActivityState = useCallback((deliverable: any) => {
    const rawStatus = deliverable?.status || 'NOT_STARTED';
    const rawCompletion = deliverable?.completion_percentage || 0;

    const { taskEntry } = getTaskEntryForDeliverable(deliverable);
    if (!taskEntry) return { status: rawStatus, completion: rawCompletion };

    const reviewState = taskEntry.taskId ? pendingReviewerMap?.[taskEntry.taskId] : undefined;
    const reviewTaskStatus = taskEntry.reviewTask?.status?.toLowerCase();
    const sourceTaskStatus = (taskEntry.activityTask?.status || taskEntry.taskStatus || '').toLowerCase();

    const hasReviewWorkflow = !!taskEntry.reviewTask || !!(reviewState && reviewState.total > 0);
    const hasPendingApprovals = (reviewState?.pending || 0) > 0 || (reviewTaskStatus === 'pending' || reviewTaskStatus === 'waiting');
    const allApproved = !!reviewState && reviewState.total > 0 && reviewState.approved === reviewState.total;
    const submittedForApproval = sourceTaskStatus === 'completed' || rawStatus === 'COMPLETED' || rawCompletion >= 100;

    if (allApproved) {
      return { status: 'COMPLETED', completion: 100 };
    }

    if (hasReviewWorkflow && hasPendingApprovals && submittedForApproval) {
      return { status: 'IN_PROGRESS', completion: 95 };
    }

    return { status: rawStatus, completion: rawCompletion };
  }, [getTaskEntryForDeliverable, pendingReviewerMap]);

  const projectCode = planData?.project
    ? `${planData.project.project_id_prefix || ''}-${planData.project.project_id_number || ''}`
    : '';
  const projectName = planData?.project?.project_title || '';

  // Get existing activity IDs for catalog exclusion
  const existingActivityIds = useMemo(() => deliverables.map((d: any) => d.id?.replace('ora-', '') || d.id), [deliverables]);

  const handleAddFromCatalog = useCallback(async (newActivities: WizardActivity[]) => {
    const client = supabase as any;
    for (const a of newActivities) {
      await client.from('ora_plan_activities').insert({
        orp_plan_id: planId,
        name: a.activity,
        activity_code: a.activityCode,
        description: a.description,
        source_type: 'catalog',
        source_ref_id: a.id,
        status: 'NOT_STARTED',
        duration_days: a.durationDays,
        parent_id: a.parentActivityId,
      });
    }
    // Also append to wizard_state
    const { data: plan } = await client.from('orp_plans').select('wizard_state').eq('id', planId).single();
    if (plan?.wizard_state?.activities) {
      const updatedActivities = [...plan.wizard_state.activities, ...newActivities.map(a => ({ ...a, selected: true }))];
      await client.from('orp_plans').update({ wizard_state: { ...plan.wizard_state, activities: updatedActivities } }).eq('id', planId);
    }
    queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
    setShowCatalogDialog(false);
    toast({ title: `${newActivities.length} activit${newActivities.length > 1 ? 'ies' : 'y'} added` });
  }, [planId, queryClient, toast]);

  const handleAddCustom = useCallback(async () => {
    // Auto-generate activity code from existing activities
    const existingCodes = deliverables.map((d: any) => d.deliverable?.activity_code || '').filter(Boolean);
    let maxNum = 0;
    let prefix = 'CUSTOM';
    for (const code of existingCodes) {
      const match = code.match(/^([A-Z]+)-(\d+)/);
      if (match) {
        prefix = match[1];
        maxNum = Math.max(maxNum, parseInt(match[2]));
      }
    }
    const newCode = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
    const newName = 'New Custom Activity';

    const client = supabase as any;
    const { data: inserted } = await client.from('ora_plan_activities').insert({
      orp_plan_id: planId,
      name: newName,
      activity_code: newCode,
      description: '',
      source_type: 'custom',
      status: 'NOT_STARTED',
    }).select().single();

    // Also append to wizard_state
    const { data: plan } = await client.from('orp_plans').select('wizard_state').eq('id', planId).single();
    if (plan?.wizard_state?.activities) {
      const newActivity = {
        id: inserted?.id || `custom-${Date.now()}`,
        activityCode: newCode,
        activity: newName,
        description: '',
        phaseId: null,
        parentActivityId: null,
        durationHigh: null,
        durationMed: null,
        durationLow: null,
        selected: true,
        durationDays: null,
        startDate: '',
        endDate: '',
        predecessorIds: [],
      };
      const updatedActivities = [...plan.wizard_state.activities, newActivity];
      await client.from('orp_plans').update({ wizard_state: { ...plan.wizard_state, activities: updatedActivities } }).eq('id', planId);
    }

    await queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
    toast({ title: 'Custom activity added' });

    // Open the activity sheet for editing
    if (inserted) {
      const siblingActivities = deliverables.map((d: any) => ({
        id: d.deliverable?.id || d.id,
        name: d.deliverable?.name || 'Unnamed',
        activity_code: d.deliverable?.activity_code || '',
      }));
      setSelectedOraActivity({
        id: `gantt-${inserted.id}`,
        title: newName,
        status: 'not_started',
        metadata: {
          deliverable_id: inserted.id,
          ora_plan_activity_id: inserted.id,
          start_date: null,
          end_date: null,
          completion_percentage: 0,
          predecessor_ids: [],
          sibling_activities: siblingActivities,
        },
        priority: 'medium',
        created_at: new Date().toISOString(),
      });
    }
  }, [planId, queryClient, toast, deliverables]);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const leftPanelWidth = useMemo(() => {
    let w = COL_WIDTHS.name;
    for (const key of visibleColumns) {
      w += COL_WIDTHS[key];
    }
    return w;
  }, [visibleColumns]);

  const searchQuery = externalSearchQuery ?? internalSearchQuery;

  const filteredDeliverables = useMemo(() => {
    if (!searchQuery.trim()) return deliverables;
    const query = searchQuery.toLowerCase();
    return deliverables.filter(d =>
      d.deliverable?.name?.toLowerCase().includes(query) ||
      d.deliverable?.activity_code?.toLowerCase().includes(query)
    );
  }, [deliverables, searchQuery]);

  const { childrenMap } = useMemo(() => buildHierarchyFromCodes(filteredDeliverables), [filteredDeliverables]);

  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => new Set<string>());
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSortColumn = useCallback((col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else { setSortColumn(null); setSortDirection('asc'); }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const STATUS_ORDER: Record<string, number> = { COMPLETED: 0, IN_PROGRESS: 1, NOT_STARTED: 2 };

  const unsortedRows = useMemo(
    () => buildVisibleRows(childrenMap, expandedCodes),
    [childrenMap, expandedCodes]
  );

  const visibleRows = useMemo(() => {
    if (!sortColumn) return unsortedRows;
    // Only sort leaf (non-parent) rows at root level when sorting
    const sorted = [...unsortedRows];
    sorted.sort((a, b) => {
      const da = a.deliverable;
      const db = b.deliverable;
      let cmp = 0;
      switch (sortColumn) {
        case 'index':
          cmp = 0;
          break;
        case 'id':
          cmp = (da.deliverable?.activity_code || '').localeCompare(db.deliverable?.activity_code || '');
          break;
        case 'activity':
          cmp = (da.deliverable?.name || '').localeCompare(db.deliverable?.name || '');
          break;
        case 'start':
          cmp = (da.start_date || '').localeCompare(db.start_date || '');
          break;
        case 'end':
          cmp = (da.end_date || '').localeCompare(db.end_date || '');
          break;
        case 'duration': {
          const durA = da.start_date && da.end_date ? differenceInDays(parseISO(da.end_date), parseISO(da.start_date)) : 0;
          const durB = db.start_date && db.end_date ? differenceInDays(parseISO(db.end_date), parseISO(db.start_date)) : 0;
          cmp = durA - durB;
          break;
        }
        case 'status': {
          const sA = STATUS_ORDER[(getReconciledActivityState(da).status || 'NOT_STARTED').toUpperCase()] ?? 2;
          const sB = STATUS_ORDER[(getReconciledActivityState(db).status || 'NOT_STARTED').toUpperCase()] ?? 2;
          cmp = sA - sB;
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [unsortedRows, sortColumn, sortDirection, getReconciledActivityState]);

  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };

  const expandAll = () => {
    const codes = new Set<string>();
    for (const [key] of childrenMap) {
      if (key !== null) codes.add(key);
    }
    filteredDeliverables.forEach(d => {
      const code = d.deliverable?.activity_code;
      if (code && (childrenMap.get(code) || []).length > 0) codes.add(code);
    });
    setExpandedCodes(codes);
  };

  const collapseAll = () => setExpandedCodes(new Set());

  // Date range
  const dates = useMemo(() => {
    return filteredDeliverables
      .filter(d => d.start_date && d.end_date)
      .flatMap(d => [parseISO(d.start_date), parseISO(d.end_date)]);
  }, [filteredDeliverables]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (!dates.length) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const padMin = addDays(min, -7);
    const padMax = addDays(max, 14);
    return { minDate: padMin, maxDate: padMax, totalDays: Math.max(differenceInDays(padMax, padMin), 60) };
  }, [dates]);

  const dayWidth = 28 * zoomLevel;
  const timelineWidth = totalDays * dayWidth;

  const monthMarkers = useMemo(() => {
    const markers: { label: string; left: number }[] = [];
    let current = new Date(minDate);
    current.setDate(1);
    if (current < minDate) current.setMonth(current.getMonth() + 1);
    while (current <= maxDate) {
      const dayOffset = differenceInDays(current, minDate);
      markers.push({ label: format(current, 'MMM yyyy'), left: dayOffset * dayWidth });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [minDate, maxDate, dayWidth]);

  const weekMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let i = 0; i < totalDays; i += 7) markers.push(i * dayWidth);
    return markers;
  }, [totalDays, dayWidth]);

  const getBarPosition = useCallback((startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const left = differenceInDays(start, minDate) * dayWidth;
    const width = Math.max(differenceInDays(end, start) * dayWidth, 8);
    return { left, width };
  }, [minDate, dayWidth]);

  // Critical path IDs
  const criticalPathIds = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();
    return computeCriticalPath(visibleRows, getBarPosition);
  }, [showCriticalPath, visibleRows, getBarPosition]);

  const handleBarResize = useCallback(async (activityId: string, newStart: Date, newEnd: Date) => {
    const startStr = format(newStart, 'yyyy-MM-dd');
    const endStr = format(newEnd, 'yyyy-MM-dd');
    const durationDays = differenceInDays(newEnd, newStart);

    // Strip prefix to get the real DB id
    const dbId = activityId.replace(/^(ora-|ws-)/, '');
    const isWizardActivity = activityId.startsWith('ws-');

    // Cancel in-flight queries to prevent stale data from overwriting optimistic updates
    await queryClient.cancelQueries({ queryKey: ['orp-plan'] });

    // Optimistically update the query cache so bars don't snap back
    queryClient.setQueriesData({ queryKey: ['orp-plan'] }, (old: any) => {
      if (!old?.deliverables) return old;
      return {
        ...old,
        deliverables: old.deliverables.map((d: any) =>
          d.id === activityId
            ? { ...d, start_date: startStr, end_date: endStr, duration_days: durationDays }
            : d
        ),
      };
    });

    try {
      // Always update wizard_state for both ora- and ws- activities
      const { data: plan } = await supabase
        .from('orp_plans')
        .select('wizard_state')
        .eq('id', planId)
        .single();

      if (plan?.wizard_state) {
        const ws = plan.wizard_state as any;
        if (ws.activities && Array.isArray(ws.activities)) {
          const updated = ws.activities.map((a: any) =>
            a.id === dbId
              ? { ...a, startDate: startStr, start_date: startStr, endDate: endStr, end_date: endStr }
              : a
          );
          await supabase
            .from('orp_plans')
            .update({ wizard_state: { ...ws, activities: updated } })
            .eq('id', planId);
        }
      }

      // Also persist to ora_plan_activities table
      if (isWizardActivity) {
        await supabase
          .from('ora_plan_activities')
          .upsert({
            id: dbId,
            orp_plan_id: planId,
            name: '',
            activity_code: '',
            source_type: 'wizard',
            status: 'NOT_STARTED',
            start_date: startStr,
            end_date: endStr,
            duration_days: durationDays,
          }, { onConflict: 'id' });
      } else {
        await supabase
          .from('ora_plan_activities')
          .update({ start_date: startStr, end_date: endStr, duration_days: durationDays })
          .eq('id', dbId);
      }
    } catch (err) {
      console.error('Failed to update activity dates:', err);
      // On error, invalidate to refetch correct state
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
    }
  }, [queryClient, planId]);

  const { draggingId, previewLeft, previewWidth, handleMouseDown, wasDragging } = useGanttBarResize({
    minDate,
    dayWidth,
    onResize: handleBarResize,
  });

  const handleZoomIn = useCallback(() => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    if (idx < ZOOM_LEVELS.length - 1) setZoomLevel(ZOOM_LEVELS[idx + 1]);
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    if (idx > 0) setZoomLevel(ZOOM_LEVELS[idx - 1]);
  }, [zoomLevel]);

  const setZoomToFitDays = (targetDays: number) => {
    if (!scrollContainerRef.current) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const newZoom = containerWidth / (targetDays * 28);
    const closest = ZOOM_LEVELS.reduce((prev, curr) =>
      Math.abs(curr - newZoom) < Math.abs(prev - newZoom) ? curr : prev
    );
    setZoomLevel(closest);
  };

  useEffect(() => {
    if (!hasInitialZoom && scrollContainerRef.current && dates.length > 0) {
      const timer = setTimeout(() => {
        setZoomToFitDays(180);
        setHasInitialZoom(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dates.length, hasInitialZoom]);

  const isAllExpanded = useMemo(() => {
    const parentCodes: string[] = [];
    filteredDeliverables.forEach(d => {
      const code = d.deliverable?.activity_code;
      if (code && (childrenMap.get(code) || []).length > 0) parentCodes.push(code);
    });
    return parentCodes.length > 0 && parentCodes.every(c => expandedCodes.has(c));
  }, [expandedCodes, filteredDeliverables, childrenMap]);

  const todayPosition = useMemo(() => {
    const today = new Date();
    const offset = differenceInDays(today, minDate) * dayWidth;
    return offset;
  }, [minDate, dayWidth]);

  const openActivitySheet = useCallback((deliverable: any) => {
    // Allow opening in view-only mode too (readOnly is enforced in the sheet)
    const actCode = deliverable.deliverable?.activity_code || '';
    const { activityId: resolvedActivityId, taskEntry } = getTaskEntryForDeliverable(deliverable);

    // Special handling for P2A-01 activity: open overlay sheet (not wizard directly)
    // This ensures the user sees the contextual CTA (Start / Continue / View)
    const isP2aActivity = actCode === 'P2A-01' || actCode === 'EXE-10' || deliverable.deliverable?.name?.toLowerCase().includes('p2a');
    if (isP2aActivity) {
      // Build metadata with P2A context so the overlay sheet renders the P2A section
      const siblingActivities = filteredDeliverables
        .filter(d => d.deliverable?.activity_code && d.id !== deliverable.id)
        .map(d => ({
          id: d.id,
          activity_code: d.deliverable?.activity_code,
          name: d.deliverable?.name,
        }));

      const rawProgress = deliverable.completion_percentage || 0;
      const cappedProgress = (existingP2APlan?.status === 'DRAFT' && rawProgress > 86) ? 86 : rawProgress;

      const p2aMetadata = {
        ...(taskEntry?.activityTask?.metadata || {}),
        action: 'create_p2a_plan',
        activity_name: deliverable.deliverable?.name,
        activity_code: actCode,
        description: deliverable.deliverable?.description || '',
        plan_id: planId,
        project_id: planData?.project_id,
        project_code: projectCode,
        deliverable_id: deliverable.deliverable?.id || deliverable.id,
        ora_plan_activity_id: resolvedActivityId || deliverable.deliverable?.id || deliverable.id,
        start_date: deliverable.start_date,
        end_date: deliverable.end_date,
        completion_percentage: cappedProgress,
        predecessor_ids: deliverable._predecessorIds || [],
        sibling_activities: siblingActivities,
      };

      if (taskEntry?.activityTask) {
        setSelectedOraActivity({
          ...taskEntry.activityTask,
          title: taskEntry.activityTask.title || 'Develop P2A Plan',
          description: taskEntry.activityTask.description ?? deliverable.deliverable?.description ?? '',
          status: taskEntry.activityTask.status || (existingP2APlan?.status === 'ACTIVE' || existingP2APlan?.status === 'COMPLETED'
            ? 'completed'
            : deliverable.status === 'COMPLETED' ? 'completed' : deliverable.status === 'IN_PROGRESS' ? 'in_progress' : 'pending'),
          metadata: p2aMetadata,
        });
      } else {
        setSelectedOraActivity({
          id: deliverable.id,
          title: 'Develop P2A Plan',
          description: deliverable.deliverable?.description || '',
          type: 'ora_activity',
          status: existingP2APlan?.status === 'ACTIVE' || existingP2APlan?.status === 'COMPLETED'
            ? 'completed'
            : deliverable.status === 'COMPLETED' ? 'completed' : deliverable.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
          metadata: p2aMetadata,
          priority: 'medium',
          created_at: deliverable.created_at || new Date().toISOString(),
        });
      }
      return;
    }

    // Special handling for VCR activities: open overlay sheet with VCR context
    const isVcrActivity = actCode.startsWith('VCR-') || deliverable.deliverable?.source_type === 'vcr_delivery_plan';
    if (isVcrActivity) {
      const siblingActivities = filteredDeliverables
        .filter(d => d.deliverable?.activity_code && d.id !== deliverable.id)
        .map(d => ({
          id: d.id,
          activity_code: d.deliverable?.activity_code,
          name: d.deliverable?.name,
        }));

      setSelectedOraActivity({
        id: taskEntry?.activityTask?.id || deliverable.id,
        title: deliverable.deliverable?.name || '',
        description: deliverable.deliverable?.description || '',
        type: 'ora_activity',
        status: deliverable.status === 'COMPLETED' ? 'completed' : deliverable.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
        metadata: {
          action: 'create_vcr_delivery_plan',
          activity_name: deliverable.deliverable?.name,
          activity_code: actCode,
          description: deliverable.deliverable?.description || '',
          plan_id: planId,
          project_id: planData?.project_id,
          project_code: projectCode,
          deliverable_id: deliverable.deliverable?.id || deliverable.id,
          ora_plan_activity_id: resolvedActivityId || deliverable.deliverable?.id || deliverable.id,
          vcr_id: deliverable.deliverable?.source_ref_id,
          vcr_code: deliverable.deliverable?.source_ref_id, // will be resolved via metadata
          vcr_name: deliverable.deliverable?.name?.replace(/^Develop VCR-\d+ Plan\s*[–-]\s*/, '') || '',
          vcr_seq_code: actCode,
          start_date: deliverable.start_date,
          end_date: deliverable.end_date,
          completion_percentage: deliverable.completion_percentage || 0,
          predecessor_ids: deliverable._predecessorIds || [],
          sibling_activities: siblingActivities,
        },
        priority: 'medium',
        created_at: deliverable.created_at || new Date().toISOString(),
      });
      return;
    }

    // Build list of sibling activities for prerequisite picker
    const siblingActivities = filteredDeliverables
      .filter(d => d.deliverable?.activity_code && d.id !== deliverable.id)
      .map(d => ({
        id: d.id,
        activity_code: d.deliverable?.activity_code,
        name: d.deliverable?.name,
      }));

    const reconciledState = getReconciledActivityState(deliverable);
    const reconciledTaskStatus = reconciledState.status === 'COMPLETED'
      ? 'completed'
      : reconciledState.status === 'IN_PROGRESS'
        ? 'in_progress'
        : 'pending';

    const mergedMetadata = {
      ...(taskEntry?.activityTask?.metadata || {}),
      activity_name: deliverable.deliverable?.name,
      activity_code: deliverable.deliverable?.activity_code,
      description: deliverable.deliverable?.description || taskEntry?.activityTask?.description || '',
      plan_id: (taskEntry?.activityTask?.metadata as Record<string, any> | undefined)?.plan_id || planId,
      project_id: (taskEntry?.activityTask?.metadata as Record<string, any> | undefined)?.project_id || planData?.project_id,
      project_code: (taskEntry?.activityTask?.metadata as Record<string, any> | undefined)?.project_code || projectCode,
      deliverable_id: deliverable.deliverable?.id || deliverable.id,
      ora_plan_activity_id: resolvedActivityId || deliverable.deliverable?.id || deliverable.id,
      start_date: deliverable.start_date,
      end_date: deliverable.end_date,
      completion_percentage: (() => {
        const isP2a = deliverable.deliverable?.activity_code === 'P2A-01' || deliverable.deliverable?.activity_code === 'EXE-10' || deliverable.deliverable?.name?.toLowerCase().includes('p2a');
        if (isP2a && existingP2APlan?.status === 'DRAFT' && reconciledState.completion > 86) return 86;
        return reconciledState.completion;
      })(),
      predecessor_ids: deliverable._predecessorIds || [],
      sibling_activities: siblingActivities,
    };

    const hasCurrentUserReviewTask = !!(taskEntry?.reviewTask && taskEntry.reviewTask.user_id === user?.id);
    const hasCurrentUserActivityTask = !!(taskEntry?.activityTask && taskEntry.activityTask.user_id === user?.id);

    // If this user only has a review task for this activity, mirror My Tasks behavior
    if (taskEntry?.reviewTask && hasCurrentUserReviewTask && !hasCurrentUserActivityTask) {
      setSelectedReviewTask(taskEntry.reviewTask);
      return;
    }

    // Prefer the real authoring task payload when available
    if (taskEntry?.activityTask) {
      setSelectedOraActivity({
        ...taskEntry.activityTask,
        title: taskEntry.activityTask.title || deliverable.deliverable?.name || '',
        description: taskEntry.activityTask.description ?? deliverable.deliverable?.description ?? '',
        status: taskEntry.activityTask.status || reconciledTaskStatus,
        metadata: mergedMetadata,
      });
      return;
    }

    // If no authoring task is directly visible, use review task for reviewers
    if (taskEntry?.reviewTask) {
      setSelectedReviewTask(taskEntry.reviewTask);
      return;
    }

    // Fallback to synthetic payload when no mapped task is visible to the current user
    setSelectedOraActivity({
      id: taskEntry?.taskId || deliverable.id,
      title: deliverable.deliverable?.name || '',
      description: deliverable.deliverable?.description || '',
      type: 'ora_activity',
      status: taskEntry?.activityTask?.status || reconciledTaskStatus,
      metadata: mergedMetadata,
      priority: 'medium',
      created_at: deliverable.created_at || new Date().toISOString(),
    });
  }, [planId, filteredDeliverables, planData?.project_id, projectCode, existingP2APlan, getTaskEntryForDeliverable, getReconciledActivityState, user?.id]);

  // Early return - no data
  if (!dates.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gantt Chart</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deliverables..." value={internalSearchQuery} onChange={(e) => setInternalSearchQuery(e.target.value)} className="pl-9" />
              </div>
              {!hideToolbar && !readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium gap-1 border-primary/30 text-primary hover:bg-primary/10">
                      <Plus className="w-3 h-3" /> Add Activity
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowCatalogDialog(true)}>
                      <BookOpen className="w-4 h-4 mr-2" /> From Catalog
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddCustom()}>
                      <PenLine className="w-4 h-4 mr-2" /> Custom Activity
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <p>No timeline data available</p>
              <p className="text-sm mt-2">Add start and end dates to deliverables to see the Gantt chart</p>
            </div>
          </div>
        </CardContent>
        <AddFromCatalogDialog open={showCatalogDialog} onOpenChange={setShowCatalogDialog} existingIds={existingActivityIds} onAdd={handleAddFromCatalog} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gantt Chart</CardTitle>
          <div className="flex items-center gap-2">
            {/* Search - always visible */}
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search deliverables..." value={internalSearchQuery} onChange={(e) => setInternalSearchQuery(e.target.value)} className="pl-9" />
            </div>

            <div className="w-2" />
            {/* Expand/Collapse toggle */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={isAllExpanded ? collapseAll : expandAll}>
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>{isAllExpanded ? 'Collapse All' : 'Expand All'}</p></TooltipContent>
              </Tooltip>

              <div className="w-px h-5 bg-border" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showRelationships ? 'default' : 'outline'}
                    size="icon"
                    className={cn("h-7 w-7", showRelationships && "bg-primary text-primary-foreground")}
                    onClick={() => setShowRelationships(!showRelationships)}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Relations</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showCriticalPath ? 'default' : 'outline'}
                    size="icon"
                    className={cn("h-7 w-7", showCriticalPath && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                    onClick={() => setShowCriticalPath(!showCriticalPath)}
                  >
                    <Route className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Critical Path</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7">
                        <Columns3 className="w-3.5 h-3.5" />
                      </Button>
                    </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="end">
                <div className="space-y-1">
                  {TOGGLEABLE_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer text-xs">
                      <Checkbox
                        checked={visibleColumns.has(col.key)}
                        onCheckedChange={() => toggleColumn(col.key)}
                        className="h-3.5 w-3.5"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Columns</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex-1 min-w-8" />

            <div className="flex items-center gap-1">
              {ZOOM_PRESETS.map(p => (
                <Button key={p.label} variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium" onClick={() => setZoomToFitDays(p.days)}>
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} disabled={zoomLevel === ZOOM_LEVELS[0]}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {!hideToolbar && !readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] font-medium gap-1 border-primary/30 text-primary hover:bg-primary/10">
                    <Plus className="w-3 h-3" /> Add Activity
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowCatalogDialog(true)}>
                    <BookOpen className="w-4 h-4 mr-2" /> From Catalog
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddCustom()}>
                    <PenLine className="w-4 h-4 mr-2" /> Custom Activity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg bg-background">
          {/* Scrollable area with sticky header */}
          <div className="max-h-[calc(95vh-280px)] overflow-auto rounded-lg" ref={scrollContainerRef}>
            {/* Sticky header row */}
            <div className="flex sticky top-0 z-20 bg-background">
              <div className="shrink-0 border-r bg-muted/30" style={{ width: leftPanelWidth }}>
                <div className="flex items-center h-9 border-b text-[10px] font-semibold text-muted-foreground uppercase tracking-wide select-none">
                  {visibleColumns.has('index') && <div className="px-1 text-center cursor-pointer hover:text-foreground transition-colors" style={{ width: COL_WIDTHS.index }} onClick={() => handleSortColumn('index')}>#</div>}
                  {visibleColumns.has('id') && (
                    <div className="px-1 border-r border-border/40 cursor-pointer hover:text-foreground transition-colors flex items-center gap-0.5" style={{ width: COL_WIDTHS.id }} onClick={() => handleSortColumn('id')}>
                      ID {sortColumn === 'id' ? (sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
                    </div>
                  )}
                  <div className="px-1.5 border-r border-border/40 cursor-pointer hover:text-foreground transition-colors flex items-center gap-0.5" style={{ width: COL_WIDTHS.name }} onClick={() => handleSortColumn('activity')}>
                    Activity {sortColumn === 'activity' ? (sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
                  </div>
                  {visibleColumns.has('start') && (
                    <div className="px-1 text-center cursor-pointer hover:text-foreground transition-colors flex items-center justify-center gap-0.5" style={{ width: COL_WIDTHS.start }} onClick={() => handleSortColumn('start')}>
                      Start {sortColumn === 'start' ? (sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
                    </div>
                  )}
                  {visibleColumns.has('end') && (
                    <div className="px-1 text-center cursor-pointer hover:text-foreground transition-colors flex items-center justify-center gap-0.5" style={{ width: COL_WIDTHS.end }} onClick={() => handleSortColumn('end')}>
                      End {sortColumn === 'end' ? (sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
                    </div>
                  )}
                  {visibleColumns.has('duration') && (
                    <div className="px-1 text-center cursor-pointer hover:text-foreground transition-colors flex items-center justify-center gap-0.5" style={{ width: COL_WIDTHS.duration }} onClick={() => handleSortColumn('duration')}>
                      Days {sortColumn === 'duration' ? (sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
                    </div>
                  )}
                  {visibleColumns.has('status') && (
                    <div className="px-1 text-center cursor-pointer hover:text-foreground transition-colors flex items-center justify-center gap-0.5" style={{ width: COL_WIDTHS.status }} onClick={() => handleSortColumn('status')}>
                      Status {sortColumn === 'status' ? (sortDirection === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div style={{ width: timelineWidth, minWidth: '100%' }}>
                  <div className="h-9 relative border-b bg-muted/20">
                    {monthMarkers.map((m, i) => (
                      <div key={i} className="absolute top-0 h-full flex items-center px-2 border-l border-border/40" style={{ left: m.left }}>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{m.label}</span>
                      </div>
                    ))}
                    {todayPosition > 0 && todayPosition < timelineWidth && (
                      <div className="absolute top-0 h-full flex flex-col items-center justify-end pb-0.5" style={{ left: todayPosition }}>
                        <span className="text-[8px] font-bold text-primary whitespace-nowrap bg-primary/10 px-1 rounded">{format(new Date(), 'dd MMM')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity rows */}
            <div className="flex">
              {/* Left panel rows */}
              <div className="shrink-0 border-r" style={{ width: leftPanelWidth }}>
                {visibleRows.map((row, index) => {
                  const { deliverable, depth, hasChildren, activityCode } = row;
                  const idColors = ID_BADGE_PALETTE[index % ID_BADGE_PALETTE.length];
                  const isExpanded = expandedCodes.has(activityCode);
                  const isParent = hasChildren;
                  const hasDates = deliverable.start_date && deliverable.end_date;
                  const durationDays = hasDates ? differenceInDays(parseISO(deliverable.end_date), parseISO(deliverable.start_date)) : null;
                  const isCritical = showCriticalPath && criticalPathIds.has(deliverable.id);

                  return (
                      <div
                      key={deliverable.id}
                      className={cn(
                        "flex items-center border-b last:border-b-0 transition-colors",
                        !readOnly && "cursor-pointer hover:bg-muted/30",
                        readOnly && "cursor-pointer hover:bg-muted/20",
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                        isParent && 'font-medium',
                        isCritical && 'bg-destructive/5'
                      )}
                      style={{ height: ROW_HEIGHT }}
                      onClick={() => openActivitySheet(deliverable)}
                    >
                      {visibleColumns.has('index') && (
                        <div className="px-1 text-center text-[10px] text-muted-foreground" style={{ width: COL_WIDTHS.index }}>
                          {index + 1}
                        </div>
                      )}
                      {visibleColumns.has('id') && (
                        <div className="px-1 flex items-center border-r border-border/40" style={{ width: COL_WIDTHS.id }}>
                          {activityCode ? (
                            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold whitespace-nowrap", idColors.bg, idColors.text)}>
                              {activityCode}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </div>
                      )}
                      <div className="px-1.5 overflow-hidden flex items-center gap-0.5 border-r border-border/40" style={{ width: COL_WIDTHS.name }}>
                        <div style={{ paddingLeft: depth * 16 }} className="flex items-center gap-1 min-w-0">
                          {hasChildren ? (
                            <button
                              className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-accent/50"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(activityCode); }}
                            >
                              {isExpanded
                                ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              }
                            </button>
                          ) : (
                            <span className="shrink-0 w-4" />
                          )}
                          <span className={cn(
                            "text-[11px] leading-snug",
                            isParent ? "font-semibold text-foreground" : "text-foreground/90",
                            isCritical && "text-destructive font-semibold"
                          )} title={deliverable.deliverable?.name}>
                            {deliverable.deliverable?.name}
                          </span>
                        </div>
                      </div>
                      {visibleColumns.has('start') && (
                        <div className="px-1 text-center" style={{ width: COL_WIDTHS.start }}>
                          <span className="text-[10px] text-muted-foreground">
                            {hasDates ? format(parseISO(deliverable.start_date), 'dd MMM') : '—'}
                          </span>
                        </div>
                      )}
                      {visibleColumns.has('end') && (
                        <div className="px-1 text-center" style={{ width: COL_WIDTHS.end }}>
                          <span className="text-[10px] text-muted-foreground">
                            {hasDates ? format(parseISO(deliverable.end_date), 'dd MMM') : '—'}
                          </span>
                        </div>
                      )}
                      {visibleColumns.has('duration') && (
                        <div className="px-1 text-center" style={{ width: COL_WIDTHS.duration }}>
                          <span className="text-[10px] font-medium">{durationDays !== null ? `${durationDays}d` : '—'}</span>
                        </div>
                      )}
                      {visibleColumns.has('status') && (() => {
                        const reconciled = getReconciledActivityState(deliverable);
                        return (
                          <div className="px-1 flex items-center justify-center" style={{ width: COL_WIDTHS.status }}>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-5", getStatusBadgeClasses(reconciled.status))}>
                              {getStatusLabel(reconciled.status)}
                            </Badge>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              {/* Timeline rows */}
              <div className="flex-1 overflow-x-auto">
                <div style={{ width: timelineWidth, minWidth: '100%' }} className="relative">
                  {visibleRows.map((row, index) => {
                    const { deliverable, hasChildren, activityCode } = row;
                    const prefix = getPhasePrefix(activityCode);
                    const barColor = BAR_COLORS[prefix] || 'bg-primary';
                    const isParent = hasChildren;
                    const hasDates = deliverable.start_date && deliverable.end_date;
                    const isCritical = showCriticalPath && criticalPathIds.has(deliverable.id);

                    let barPos: { left: number; width: number } | null = null;
                    if (isParent) {
                      const range = getParentDateRange(activityCode, childrenMap);
                      if (range.minStart && range.maxEnd) {
                        const start = range.minStart;
                        const end = range.maxEnd;
                        const left = differenceInDays(start, minDate) * dayWidth;
                        const width = Math.max(differenceInDays(end, start) * dayWidth, 8);
                        barPos = { left, width };
                      }
                    } else if (hasDates) {
                      barPos = getBarPosition(deliverable.start_date, deliverable.end_date);
                    }

                    return (
                      <div
                        key={deliverable.id}
                        className={cn(
                          "relative border-b last:border-b-0",
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/10',
                          isCritical && 'bg-destructive/5'
                        )}
                        style={{ height: ROW_HEIGHT }}
                      >
                        {weekMarkers.map((left, i) => (
                          <div key={i} className="absolute top-0 bottom-0 border-l border-border/15" style={{ left }} />
                        ))}
                        {todayPosition > 0 && todayPosition < timelineWidth && (
                          <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-primary/60 z-10" style={{ left: todayPosition }} />
                        )}

                        {barPos && isParent && (() => {
                          const mutedColor = BAR_COLORS_MUTED[prefix] || 'bg-muted';
                          const range = getParentDateRange(activityCode, childrenMap);
                          const parentDuration = range.minStart && range.maxEnd ? differenceInDays(range.maxEnd, range.minStart) : null;

                          return (
                            <div
                              className={cn(
                                "absolute top-2 rounded shadow-sm overflow-hidden",
                                mutedColor
                              )}
                              style={{ left: barPos.left, width: barPos.width, height: ROW_HEIGHT - 16 }}
                              title={`${deliverable.deliverable?.name} (summary)`}
                            >
                              <div className={cn("absolute h-full rounded-l", barColor, "opacity-40")} style={{ width: '100%' }} />
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-[9px] text-white font-medium drop-shadow-sm">
                                  {parentDuration !== null ? `${parentDuration}d` : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {barPos && !isParent && (() => {
                          const isDragging = draggingId === deliverable.id;
                          const barL = isDragging && previewLeft !== null ? previewLeft : barPos.left;
                          const barW = isDragging && previewWidth !== null ? previewWidth : barPos.width;
                          const mutedColor = BAR_COLORS_MUTED[prefix] || 'bg-muted';
                          const isP2aActivity = deliverable.deliverable?.activity_code === 'P2A-01' || deliverable.deliverable?.activity_code === 'EXE-10' || deliverable.deliverable?.name?.toLowerCase().includes('p2a');
                          const p2aPlanIsDraft = existingP2APlan && existingP2APlan.status === 'DRAFT';
                          // Reconcile progress: ad-hoc reviewer-aware cap, then P2A draft cap
                          const reconciledBar = getReconciledActivityState(deliverable);
                          const completion = (isP2aActivity && p2aPlanIsDraft && reconciledBar.completion > 86) ? 86 : reconciledBar.completion;

                          return (
                            <div
                              className={cn(
                                "absolute top-2 rounded shadow-sm overflow-hidden transition-all group",
                                mutedColor,
                                !readOnly && "cursor-grab hover:shadow-md",
                                isDragging && "ring-2 ring-primary/50 shadow-lg cursor-grabbing",
                                isCritical && "ring-2 ring-destructive/70"
                              )}
                              style={{ left: barL, width: barW, height: ROW_HEIGHT - 16 }}
                              onMouseDown={(e) => {
                                if (readOnly) return;
                                if (!(e.target as HTMLElement).dataset.edge) {
                                  handleMouseDown(e, 'move', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date));
                                }
                              }}
                              onClick={(e) => {
                                if (wasDragging()) {
                                  e.stopPropagation();
                                  return;
                                }
                                openActivitySheet(deliverable);
                              }}
                            >
                              <div
                                className={cn("absolute h-full rounded-l", barColor)}
                                style={{ width: `${completion}%` }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-[9px] text-white font-medium drop-shadow-sm">
                                  {completion}%
                                </span>
                              </div>
                              {!readOnly && (
                                <>
                                  <div
                                    data-edge="left"
                                    className="absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                                    onMouseDown={(e) => handleMouseDown(e, 'left', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date))}
                                  />
                                  <div
                                    data-edge="right"
                                    className="absolute right-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/30"
                                    onMouseDown={(e) => handleMouseDown(e, 'right', deliverable.id, barPos.left, barPos.width, parseISO(deliverable.start_date), parseISO(deliverable.end_date))}
                                  />
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                  {/* Critical path red connecting line */}
                  {showCriticalPath && criticalPathIds.size > 0 && (() => {
                    // Collect critical path bar centers sorted by left position
                    const criticalBars: { x: number; y: number; left: number; right: number }[] = [];
                    visibleRows.forEach((row, rowIdx) => {
                      if (!criticalPathIds.has(row.deliverable.id)) return;
                      if (row.hasChildren || !row.deliverable.start_date || !row.deliverable.end_date) return;
                      const pos = getBarPosition(row.deliverable.start_date, row.deliverable.end_date);
                      criticalBars.push({
                        x: pos.left + pos.width / 2,
                        y: rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2,
                        left: pos.left,
                        right: pos.left + pos.width,
                      });
                    });
                    criticalBars.sort((a, b) => a.left - b.left);

                    if (criticalBars.length < 2) return null;

                    // Build path connecting end of one bar to start of next, through center
                    let pathD = '';
                    for (let i = 0; i < criticalBars.length - 1; i++) {
                      const from = criticalBars[i];
                      const to = criticalBars[i + 1];
                      pathD += `M${from.right},${from.y} L${to.left},${to.y} `;
                    }

                    return (
                      <svg
                        className="absolute top-0 left-0 pointer-events-none z-15"
                        style={{ width: timelineWidth, height: visibleRows.length * ROW_HEIGHT }}
                      >
                        <path
                          d={pathD}
                          fill="none"
                          stroke="hsl(var(--destructive))"
                          strokeWidth="2"
                          strokeDasharray="6,3"
                          opacity="0.8"
                        />
                      </svg>
                    );
                  })()}

                  {/* Relationship arrows SVG overlay */}
                  {showRelationships && (
                    <svg
                      className="absolute top-0 left-0 pointer-events-none z-20"
                      style={{ width: timelineWidth, height: visibleRows.length * ROW_HEIGHT }}
                    >
                      <defs>
                        <marker id="rel-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--destructive))" />
                        </marker>
                      </defs>
                      {visibleRows.map((row, rowIdx) => {
                        const predecessorIds = row.deliverable._predecessorIds || [];
                        if (!predecessorIds.length) return null;

                        const hasDates = row.deliverable.start_date && row.deliverable.end_date;
                        if (!hasDates) return null;
                        const toPos = getBarPosition(row.deliverable.start_date, row.deliverable.end_date);
                        const toY = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                        const toX = toPos.left;

                        return predecessorIds.map((predCode: string) => {
                          const predIdx = visibleRows.findIndex(r => {
                            const code = r.deliverable.deliverable?.activity_code;
                            const id = r.deliverable.deliverable?.id || r.deliverable.id;
                            const strippedId = typeof id === 'string' ? id.replace(/^(ora-|ws-)/, '') : '';
                            return code === predCode || id === predCode || strippedId === predCode ||
                                   predCode === `ora-${strippedId}` || predCode === `ws-${strippedId}`;
                          });
                          if (predIdx === -1) return null;
                          const predRow = visibleRows[predIdx];
                          const predHasDates = predRow.deliverable.start_date && predRow.deliverable.end_date;
                          if (!predHasDates) return null;
                          const fromPos = getBarPosition(predRow.deliverable.start_date, predRow.deliverable.end_date);
                          const fromX = fromPos.left + fromPos.width;
                          const fromY = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

                          const midX = fromX + 10;
                          const path = `M${fromX},${fromY} L${midX},${fromY} L${midX},${toY} L${toX},${toY}`;

                          return (
                            <path
                              key={`${predCode}-${row.activityCode}`}
                              d={path}
                              fill="none"
                              stroke="hsl(var(--destructive))"
                              strokeWidth="1.5"
                              markerEnd="url(#rel-arrow)"
                              opacity="0.7"
                            />
                          );
                        });
                      })}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </CardContent>

      <AddFromCatalogDialog open={showCatalogDialog} onOpenChange={setShowCatalogDialog} existingIds={existingActivityIds} onAdd={handleAddFromCatalog} />
      <TaskDetailSheet
        task={selectedReviewTask}
        open={!!selectedReviewTask}
        onOpenChange={(open) => !open && setSelectedReviewTask(null)}
        onApprove={() => {}}
        onReject={() => {}}
      />
      <ORAActivityTaskSheet
        task={selectedOraActivity}
        open={!!selectedOraActivity}
        onOpenChange={(open) => !open && setSelectedOraActivity(null)}
        onOpenP2AWizard={(_projId, _projCode, openWorkspace) => {
          if (openWorkspace) {
            setShowP2AWorkspace(true);
          } else {
            setShowP2AWizard(true);
          }
        }}
        onOpenVCRWizard={(vcrId, vcrCode, vcrName) => {
          setVcrWizardTarget({ id: vcrId, vcr_code: vcrCode, name: vcrName });
          setShowVCRWizard(true);
        }}
      />
      {planData?.project_id && (
        <>
          <P2APlanCreationWizard
            open={showP2AWizard}
            onOpenChange={setShowP2AWizard}
            projectId={planData.project_id}
            projectCode={projectCode}
            projectName={projectName}
            onSuccess={() => {
              setShowP2AWizard(false);
              queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
              queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists'] });
            }}
            onOpenWorkspace={() => {
              setShowP2AWizard(false);
              setShowP2AWorkspace(true);
            }}
          />
          <P2AWorkspaceOverlay
            open={showP2AWorkspace}
            onOpenChange={setShowP2AWorkspace}
            projectId={planData.project_id}
            projectName={projectName}
            projectNumber={projectCode}
            onReturnToWizard={() => {
              setShowP2AWorkspace(false);
              setShowP2AWizard(true);
            }}
          />
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
              projectCode={projectCode}
            />
          )}
        </>
      )}
    </Card>
  );
};
