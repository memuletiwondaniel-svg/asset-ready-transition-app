import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTaskComments } from '@/hooks/useTaskComments';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { 
  Clock, CheckCircle2, Play, Upload, MessageSquare, 
  Paperclip, X, Loader2, AlertTriangle, Trash2, GitBranch, Plus, FileText, ChevronRight, Send, RotateCcw,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast, differenceInDays, addDays, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import type { UserTask } from '@/hooks/useUserTasks';
import { sortP2AFeedEntries } from './p2aActivityFeedUtils';
import { TaskReviewersSection } from './TaskReviewersSection';
import { TaskAttachmentsSection } from './TaskAttachmentsSection';

import { useTaskReviewers } from '@/hooks/useTaskReviewers';

interface ORAActivityTaskSheetProps {
  task: UserTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReadOnly?: boolean;
  /** When set, overrides the initial status (e.g. pre-select "COMPLETED" when dragged to Done) */
  initialStatusOverride?: ActivityStatus;
  /** Called when user wants to open the P2A wizard/workspace — parent handles rendering */
  onOpenP2AWizard?: (projectId: string, projectCode: string, openWorkspace?: boolean) => void;
  /** Called when user wants to open the VCR Plan wizard — parent handles rendering */
  onOpenVCRWizard?: (vcrId: string, vcrCode: string, vcrName: string, projectId: string, projectCode: string) => void;
  /** Navigate to previous/next activity in the list (persistent panel mode) */
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

type ActivityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_STEPS: { value: ActivityStatus; label: string; icon: React.ElementType }[] = [
  { value: 'NOT_STARTED', label: 'Not Started', icon: Clock },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: Play },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

const ID_BADGE_PALETTE = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const ORAActivityTaskSheet: React.FC<ORAActivityTaskSheetProps> = ({
  task,
  open,
  onOpenChange,
  isReadOnly = false,
  initialStatusOverride,
  onOpenP2AWizard,
  onOpenVCRWizard,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ActivityStatus>('NOT_STARTED');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [editName, setEditName] = useState('');
  const [originalName, setOriginalName] = useState('');

  // Editable dates
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);

  // Prerequisites
  const [predecessorIds, setPredecessorIds] = useState<string[]>([]);
  const [originalPredecessorIds, setOriginalPredecessorIds] = useState<string[]>([]);

  // Original values for dirty tracking
  const [originalStatus, setOriginalStatus] = useState<ActivityStatus>('NOT_STARTED');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalStartDate, setOriginalStartDate] = useState<Date | undefined>();
  const [originalEndDate, setOriginalEndDate] = useState<Date | undefined>();
  const [originalProgressPct, setOriginalProgressPct] = useState(0);

  const metadata = task?.metadata as Record<string, any> | undefined;
  const metaOraActivityId = metadata?.ora_plan_activity_id as string | undefined;
  const metaPlanId = metadata?.plan_id as string | undefined;
  const metaProjectId = metadata?.project_id as string | undefined;
  const metaProjectCode = metadata?.project_code as string | undefined;

  const rawOraActivityId = useMemo(() => {
    const raw = metaOraActivityId || '';
    if (raw.startsWith('ora-')) return raw.slice(4);
    if (raw.startsWith('ws-')) return raw.slice(3);
    return raw;
  }, [metaOraActivityId]);

  // Fetch the actual ora_plan_activities record as single source of truth
  const { data: dbActivity } = useQuery({
    queryKey: ['ora-activity-detail', rawOraActivityId, metaProjectId],
    queryFn: async () => {
      const client = supabase as any;
      // Try direct lookup by ID first
      if (rawOraActivityId) {
        const { data } = await client
          .from('ora_plan_activities')
          .select('id, activity_code, name, description, status, completion_percentage, start_date, end_date, duration_days, orp_plan_id, parent_id, source_ref_id')
          .eq('id', rawOraActivityId)
          .maybeSingle();
        if (data) return data;
      }
      // Fallback: find by project_id + P2A activity code/name pattern
      if (metaProjectId) {
        const { data: plans } = await client
          .from('orp_plans')
          .select('id')
          .eq('project_id', metaProjectId)
          .limit(1);
        if (plans?.[0]) {
          const { data: activities } = await client
            .from('ora_plan_activities')
            .select('id, activity_code, name, description, status, completion_percentage, start_date, end_date, duration_days, orp_plan_id, parent_id, source_ref_id')
            .eq('orp_plan_id', plans[0].id);
          const match = activities?.find((a: any) => 
            a.activity_code === 'EXE-10' || a.activity_code === 'P2A-01' || 
            a.name?.toLowerCase().includes('p2a')
          );
          if (match) return match;
        }
      }
      return null;
    },
    enabled: open && !!(rawOraActivityId || metaProjectId),
    staleTime: 30_000,
  });

  // Fetch predecessors from wizard_state for this activity
  const resolvedPlanId = dbActivity?.orp_plan_id || metaPlanId;
  const resolvedActivityId = dbActivity?.id || rawOraActivityId;

  const { data: wizardPredecessors } = useQuery({
    queryKey: ['ora-activity-predecessors', resolvedPlanId, resolvedActivityId],
    queryFn: async () => {
      if (!resolvedPlanId || !resolvedActivityId) return [];
      const { data: planRow } = await (supabase as any)
        .from('orp_plans')
        .select('wizard_state')
        .eq('id', resolvedPlanId)
        .single();
      if (!planRow?.wizard_state) return [];
      const ws = planRow.wizard_state as any;
      const wsActivities: any[] = ws.activities || [];
      const match = wsActivities.find((a: any) => {
        const aId = String(a.id || '');
        return aId === resolvedActivityId || aId === `ora-${resolvedActivityId}` || aId === `ws-${resolvedActivityId}`;
      });
      return match?.predecessorIds || [];
    },
    enabled: open && !!resolvedPlanId && !!resolvedActivityId,
    staleTime: 30_000,
  });

  // Use DB activity as source of truth, falling back to task metadata
  const activityName = dbActivity?.name || metadata?.activity_name || task?.title || '';
  const activityCode = dbActivity?.activity_code || metadata?.activity_code || '';
  const startDate = dbActivity?.start_date || metadata?.start_date as string | undefined;
  const endDate = dbActivity?.end_date || metadata?.end_date as string | undefined;
  const planId = resolvedPlanId;
  const deliverableId = metadata?.deliverable_id as string | undefined;
  const oraActivityId = metaOraActivityId;
  const projectId = metaProjectId;
  const projectCode = metaProjectCode;
  const isP2AActivity = activityCode === 'EXE-10' || activityCode === 'P2A-01' || metadata?.action === 'create_p2a_plan' || activityName?.toLowerCase().includes('p2a');
  const isVCRActivity = !isP2AActivity && (metadata?.action === 'create_vcr_delivery_plan' || activityCode?.startsWith('VCR-'));
  const metaVcrId = metadata?.vcr_id as string | undefined;
  const metaVcrCode = metadata?.vcr_code as string | undefined;
  const metaVcrName = metadata?.vcr_name as string | undefined;
  const metaVcrSeqCode = metadata?.vcr_seq_code as string | undefined;
  const isOverdue = editEndDate && isPast(editEndDate) && status !== 'COMPLETED';

  // Check if task has ad-hoc reviewers (for submit button label)
  const { totalCount: reviewerCount, allApproved: allReviewersApproved, reviewers: taskReviewersList } = useTaskReviewers(!isP2AActivity && !isVCRActivity ? task?.id : undefined);
  const hasReviewers = !isP2AActivity && !isVCRActivity && reviewerCount > 0;

  // Detect if task was reverted from Done (has reviewers with PENDING status while task is in_progress)
  // This means the user needs to resubmit — show save/submit button even when isDirty is false
  const needsResubmission = hasReviewers && task?.status === 'in_progress' && taskReviewersList.some(r => r.status === 'PENDING') && !isReadOnly;

  const realOraActivityId = resolvedActivityId;

  // Check if P2A plan exists for "Continue" vs "Create" label
  const { data: existingP2APlan } = useQuery({
    queryKey: ['p2a-plan-exists-sheet', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await (supabase as any)
        .from('p2a_handover_plans')
        .select('id, status, created_by')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!projectId && isP2AActivity,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  // Reconciliation guard: if the task is NOT in the Done column (i.e., status !== 'completed'),
  // treat the plan as DRAFT regardless of what p2a_handover_plans says. This prevents
  // stale ACTIVE/COMPLETED status from showing "Pending Approval" when the card was reverted.
  const rawP2aPlanStatus = existingP2APlan?.status as string | undefined;
  const taskIsNotDone = task?.status !== 'completed';
  const p2aPlanStatus = (taskIsNotDone && rawP2aPlanStatus && ['ACTIVE', 'COMPLETED', 'APPROVED'].includes(rawP2aPlanStatus))
    ? 'DRAFT'
    : rawP2aPlanStatus;
  const p2aPlanIsSubmitted = existingP2APlan && p2aPlanStatus && ['ACTIVE', 'COMPLETED', 'APPROVED'].includes(p2aPlanStatus);
  const p2aPlanIsFullyApproved = existingP2APlan && p2aPlanStatus && ['COMPLETED', 'APPROVED'].includes(p2aPlanStatus);
  const p2aSheetCtaLabel = p2aPlanIsFullyApproved
    ? 'View P2A Plan'
    : p2aPlanIsSubmitted
      ? 'View P2A Plan'
      : existingP2APlan
        ? 'Continue P2A Plan'
        : 'Start P2A Plan';

  // ── VCR Plan status query with draft detection ──
  const { data: vcrPlanStepCounts } = useQuery({
    queryKey: ['vcr-plan-draft-check-ora', metaVcrId],
    queryFn: async () => {
      if (!metaVcrId) return { hasDraft: false, status: 'DRAFT' as string };
      const [hpResult, training, procedures, criticalDocs, registers, logsheets] = await Promise.all([
        (supabase as any).from('p2a_handover_points').select('execution_plan_status').eq('id', metaVcrId).maybeSingle(),
        (supabase as any).from('p2a_vcr_training').select('id', { count: 'exact', head: true }).eq('handover_point_id', metaVcrId),
        (supabase as any).from('p2a_vcr_procedures').select('id', { count: 'exact', head: true }).eq('handover_point_id', metaVcrId),
        (supabase as any).from('p2a_vcr_critical_docs').select('id', { count: 'exact', head: true }).eq('handover_point_id', metaVcrId),
        (supabase as any).from('p2a_vcr_register_selections').select('id', { count: 'exact', head: true }).eq('handover_point_id', metaVcrId),
        (supabase as any).from('p2a_vcr_logsheets').select('id', { count: 'exact', head: true }).eq('handover_point_id', metaVcrId),
      ]);
      const totalItems = (training.count || 0) + (procedures.count || 0) + (criticalDocs.count || 0) + (registers.count || 0) + (logsheets.count || 0);
      const status = hpResult.data?.execution_plan_status || 'DRAFT';
      return { hasDraft: totalItems > 0, status };
    },
    enabled: !!metaVcrId && isVCRActivity,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const vcrHasDraft = vcrPlanStepCounts?.hasDraft || false;
  const vcrPlanStatus = vcrPlanStepCounts?.status || 'DRAFT';
  const vcrPlanIsApproved = vcrPlanStatus === 'APPROVED';
  const vcrPlanIsSubmitted = vcrPlanStatus === 'SUBMITTED';
  const vcrSheetCtaLabel = vcrPlanIsApproved
    ? 'View VCR Plan'
    : vcrPlanIsSubmitted
      ? 'View VCR Plan'
      : vcrHasDraft
        ? 'Continue VCR Plan'
        : 'Develop VCR Plan';

  const getVCRStatusBadge = () => {
    if (!vcrPlanStatus) return null;
    switch (vcrPlanStatus) {
      case 'DRAFT':
        return <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-600 border-slate-500/30">Draft</Badge>;
      case 'SUBMITTED':
        return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">Pending Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Approved</Badge>;
      default:
        return null;
    }
  };

  // Fetch ALL approver decisions (not just rejections) for the unified feed
  const { data: p2aApproverDecisions } = useQuery({
    queryKey: ['p2a-approver-decisions', existingP2APlan?.id],
    queryFn: async () => {
      if (!existingP2APlan?.id) return [];
      if (existingP2APlan.status === 'DRAFT') return [];
      const { data } = await (supabase as any)
        .from('p2a_handover_approvers')
        .select('id, user_id, role_name, status, comments, approved_at')
        .eq('handover_id', existingP2APlan.id)
        .not('approved_at', 'is', null)
        .order('approved_at', { ascending: false });
      if (!data || data.length === 0) return [];
      // Resolve profiles for each approver
      const userIds = [...new Set(data.filter((d: any) => d.user_id).map((d: any) => d.user_id))];
      let profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds as string[]);
        if (profiles) {
          for (const p of profiles) {
            const avatarUrl = p.avatar_url
              ? p.avatar_url.startsWith('http')
                ? p.avatar_url
                : supabase.storage.from('user-avatars').getPublicUrl(p.avatar_url).data.publicUrl
              : null;
            profileMap[p.user_id] = { full_name: p.full_name || '', avatar_url: avatarUrl };
          }
        }
      }
      return data.map((d: any) => ({
        ...d,
        full_name: profileMap[d.user_id]?.full_name || d.role_name,
        avatar_url: profileMap[d.user_id]?.avatar_url || null,
        cycle: null, // current cycle
      }));
    },
    enabled: !!existingP2APlan?.id && isP2AActivity,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch archived approver history for previous cycles
  const { data: p2aApproverHistory } = useQuery({
    queryKey: ['p2a-approver-history', existingP2APlan?.id],
    queryFn: async () => {
      if (!existingP2APlan?.id) return [];
      const { data } = await (supabase as any)
        .from('p2a_approver_history')
        .select('id, user_id, role_name, status, comments, approved_at, cycle')
        .eq('handover_id', existingP2APlan.id)
        .order('approved_at', { ascending: false });
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.filter((d: any) => d.user_id).map((d: any) => d.user_id))];
      let profileMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds as string[]);
        if (profiles) {
          for (const p of profiles) {
            const avatarUrl = p.avatar_url
              ? p.avatar_url.startsWith('http')
                ? p.avatar_url
                : supabase.storage.from('user-avatars').getPublicUrl(p.avatar_url).data.publicUrl
              : null;
            profileMap[p.user_id] = { full_name: p.full_name || '', avatar_url: avatarUrl };
          }
        }
      }
      return data.map((d: any) => ({
        ...d,
        full_name: profileMap[d.user_id]?.full_name || d.role_name,
        avatar_url: profileMap[d.user_id]?.avatar_url || null,
      }));
    },
    enabled: !!existingP2APlan?.id && isP2AActivity,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch sibling activities from DB for prerequisites picker
  const { data: dbSiblingActivities } = useQuery({
    queryKey: ['ora-sibling-activities', planId, realOraActivityId],
    queryFn: async () => {
      if (!planId || !realOraActivityId) return [];
      const { data, error } = await (supabase as any)
        .from('ora_plan_activities')
        .select('id, activity_code, name')
        .eq('orp_plan_id', planId)
        .neq('id', realOraActivityId);
      if (error) return [];
      return data || [];
    },
    enabled: !!planId && !!realOraActivityId,
  });

  // Fetch rejection/revert context from plan-level fields (unified source)
  const { data: p2aDraftContext } = useQuery({
    queryKey: ['p2a-draft-context-sheet', existingP2APlan?.id],
    queryFn: async () => {
      if (!existingP2APlan?.id) return null;
      const { data } = await (supabase as any)
        .from('p2a_handover_plans')
        .select('last_rejection_comment, last_rejected_by_name, last_rejected_by_role, last_rejected_at')
        .eq('id', existingP2APlan.id)
        .single();
      if (!data?.last_rejection_comment) return null;
      const isReverted = data.last_rejected_by_role === 'Reverted';
      return {
        role_name: isReverted ? (data.last_rejected_by_name || 'User') : (data.last_rejected_by_role || 'Approver'),
        comments: data.last_rejection_comment,
        approved_at: data.last_rejected_at,
        rejector_name: data.last_rejected_by_name,
        type: isReverted ? 'reverted' as const : 'rejected' as const,
      };
    },
    enabled: !!existingP2APlan?.id && isP2AActivity && p2aPlanStatus === 'DRAFT',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const p2aRejectionInfo = p2aApproverDecisions?.find((d: any) => d.status === 'REJECTED') || null;

  const effectiveP2aRejection = p2aDraftContext || (p2aRejectionInfo ? {
    role_name: p2aRejectionInfo.role_name,
    comments: p2aRejectionInfo.comments,
    approved_at: p2aRejectionInfo.approved_at,
    rejector_name: p2aRejectionInfo.full_name,
    type: 'rejected' as const,
  } : null);

  const showP2aRejectionBanner =
    isP2AActivity &&
    p2aPlanStatus === 'DRAFT' &&
    !!effectiveP2aRejection;

  const getP2AStatusBadge = () => {
    if (!p2aPlanStatus) return null;
    switch (p2aPlanStatus) {
      case 'DRAFT':
        return <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-600 border-slate-500/30">Draft</Badge>;
      case 'ACTIVE':
        return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">Pending Approval</Badge>;
      case 'COMPLETED':
      case 'APPROVED':
        return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Approved</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">Archived</Badge>;
      default:
        return null;
    }
  };

  // Duration computed from editable dates
  const durationDays = useMemo(() => {
    if (editStartDate && editEndDate) {
      return differenceInDays(editEndDate, editStartDate);
    }
    return null;
  }, [editStartDate, editEndDate]);

  const idColors = activityCode
    ? ID_BADGE_PALETTE[hashCode(activityCode) % ID_BADGE_PALETTE.length]
    : ID_BADGE_PALETTE[0];

  // Task-scoped comments (isolated per card — no cross-task merging)
  const { comments: taskScopedComments, isLoading: commentsLoading, addComment: addTaskComment, isAddingComment: isAdding } = useTaskComments(task?.id);

  // Initialize values when sheet opens — prefer dbActivity over task metadata
  useEffect(() => {
    if (open && task) {
      const db = dbActivity as any;
      const initDesc = db?.description || metadata?.description || task?.description || '';
      const dbStatus = db?.status as ActivityStatus | undefined;
      const taskStatus = task?.status;
      const baseStatus: ActivityStatus = dbStatus || (taskStatus === 'completed' ? 'COMPLETED'
        : taskStatus === 'in_progress' ? 'IN_PROGRESS' : 'NOT_STARTED');
      const initStatus: ActivityStatus = initialStatusOverride || baseStatus;
      const initProgress = db?.completion_percentage ?? metadata?.completion_percentage ?? (initStatus === 'COMPLETED' ? 100 : initStatus === 'IN_PROGRESS' ? 50 : 0);
      const initName = db?.name || metadata?.activity_name || task?.title || '';
      setEditName(initName);
      setOriginalName(initName);
      setDescription(initDesc);
      setOriginalDescription(initDesc);
      setStatus(initStatus);
      setOriginalStatus(baseStatus);
      setComment('');
      setFiles([]);
      setProgressPct(initProgress);
      setOriginalProgressPct(initProgress);
      setShowCalendar(false);

      const sd = startDate ? parseISO(startDate) : undefined;
      const ed = endDate ? parseISO(endDate) : undefined;
      setEditStartDate(sd);
      setEditEndDate(ed);
      setOriginalStartDate(sd);
      setOriginalEndDate(ed);

      const preds: string[] = wizardPredecessors || metadata?.predecessor_ids || [];
      setPredecessorIds(preds);
      setOriginalPredecessorIds(preds);
    }
  }, [open, task?.id, dbActivity?.id, wizardPredecessors]);

  const isDirty = useMemo(() => {
    const datesChanged = editStartDate?.getTime() !== originalStartDate?.getTime() ||
                         editEndDate?.getTime() !== originalEndDate?.getTime();
    const progressChanged = progressPct !== originalProgressPct;
    const predsChanged = JSON.stringify(predecessorIds) !== JSON.stringify(originalPredecessorIds);
    const nameChanged = editName !== originalName;
    return status !== originalStatus || 
           description !== originalDescription || 
           files.length > 0 || 
           datesChanged ||
           progressChanged ||
           predsChanged ||
           nameChanged ||
           comment.trim().length > 0;
  }, [status, originalStatus, description, originalDescription, files.length, editStartDate, editEndDate, originalStartDate, originalEndDate, progressPct, originalProgressPct, predecessorIds, originalPredecessorIds, editName, originalName, comment]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      await addTaskComment(comment.trim());
      setComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!task || !user) return;
    
    // Validate mandatory submission comment for approval submissions
    if (status === 'COMPLETED' && hasReviewers && !submissionComment.trim()) {
      toast.error('Please add submission notes for the approvers before submitting.');
      return;
    }
    
    setSaving(true);

    try {
      const uploadedPaths: string[] = [];
      for (const file of files) {
        const path = `ora-evidence/${planId}/${deliverableId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('orp-attachments').upload(path, file);
        if (!error) uploadedPaths.push(path);
      }

      if (realOraActivityId && planId) {
        const completionPct = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? progressPct : 0;
        const upsertData: Record<string, any> = {
          id: realOraActivityId,
          orp_plan_id: planId,
          activity_code: activityCode || 'UNKNOWN',
          name: editName || task.title || 'Unnamed',
          status,
          completion_percentage: completionPct,
          source_type: 'wizard',
        };
        if (description !== originalDescription) {
          upsertData.description = description;
        }
        // Use editable dates
        if (editStartDate) {
          upsertData.start_date = format(editStartDate, 'yyyy-MM-dd');
        }
        if (editEndDate) {
          upsertData.end_date = format(editEndDate, 'yyyy-MM-dd');
        }
        if (editStartDate && editEndDate) {
          upsertData.duration_days = differenceInDays(editEndDate, editStartDate);
        }
        if (status === 'COMPLETED') {
          upsertData.end_date = new Date().toISOString().split('T')[0];
        }
        await (supabase as any)
          .from('ora_plan_activities')
          .upsert(upsertData, { onConflict: 'id' });

        // Also update wizard_state if dates or predecessors changed
        const datesChanged = editStartDate?.getTime() !== originalStartDate?.getTime() ||
                             editEndDate?.getTime() !== originalEndDate?.getTime();
        const predsChanged = JSON.stringify(predecessorIds) !== JSON.stringify(originalPredecessorIds);
        const nameChanged = editName !== originalName;
        if (datesChanged || predsChanged || nameChanged) {
          const { data: planRow } = await (supabase as any)
            .from('orp_plans')
            .select('wizard_state')
            .eq('id', planId)
            .single();

          if (planRow?.wizard_state) {
            const ws = planRow.wizard_state as any;
            const wsActivities: any[] = ws.activities || [];
            const updatedActivities = wsActivities.map((a: any) => {
              const aId = String(a.id || '');
              if (aId === realOraActivityId || aId === `ora-${realOraActivityId}` || aId === `ws-${realOraActivityId}` || aId === (oraActivityId || '__none__')) {
                const updated: any = { ...a };
                if (nameChanged) {
                  updated.activity = editName;
                  updated.name = editName;
                }
                if (datesChanged) {
                  updated.startDate = editStartDate ? format(editStartDate, 'yyyy-MM-dd') : a.startDate;
                  updated.start_date = editStartDate ? format(editStartDate, 'yyyy-MM-dd') : a.start_date;
                  updated.endDate = editEndDate ? format(editEndDate, 'yyyy-MM-dd') : a.endDate;
                  updated.end_date = editEndDate ? format(editEndDate, 'yyyy-MM-dd') : a.end_date;
                }
                if (predsChanged) {
                  updated.predecessorIds = predecessorIds;
                }
                return updated;
              }
              return a;
            });
            await (supabase as any)
              .from('orp_plans')
              .update({ wizard_state: { ...ws, activities: updatedActivities } })
              .eq('id', planId);
          }
        }
      }

      if (deliverableId && deliverableId !== realOraActivityId) {
        const completionPct = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? progressPct : 0;
        await supabase
          .from('orp_plan_deliverables')
          .update({ 
            status, 
            completion_percentage: completionPct,
          })
          .eq('id', deliverableId);
      }

      const taskStatus = status === 'COMPLETED' ? 'completed' : status === 'IN_PROGRESS' ? 'in_progress' : 'pending';
      const completionPctForMeta = status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? progressPct : 0;
      const updatedMetadata = {
        ...(metadata || {}),
        completion_percentage: completionPctForMeta,
        ...(editStartDate ? { start_date: format(editStartDate, 'yyyy-MM-dd') } : {}),
        ...(editEndDate ? { end_date: format(editEndDate, 'yyyy-MM-dd') } : {}),
      };
      const submittedTaskIds: string[] = [];
      const isRealTaskId = task.id && !task.id.startsWith('ws-') && !task.id.startsWith('ora-');
      if (isRealTaskId) {
        await supabase
          .from('user_tasks')
          .update({
            status: taskStatus,
            metadata: updatedMetadata,
            due_date: editEndDate ? format(editEndDate, 'yyyy-MM-dd') : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        // When reverting from completed and task has reviewers, clean up reviewer tasks
        if (originalStatus === 'COMPLETED' && taskStatus !== 'completed' && hasReviewers) {
          await (supabase as any).rpc('reopen_task', {
            p_task_id: task.id,
            p_reason: 'Task reopened — status changed back to ' + status,
          });
          queryClient.invalidateQueries({ queryKey: ['task-reviewers', task.id] });
          queryClient.invalidateQueries({ queryKey: ['task-reviewers-summary'] });
        }

        if (taskStatus === 'completed') {
          submittedTaskIds.push(task.id);
        }
      } else if (realOraActivityId) {
        // Cross-linkage: when saving from Gantt context (ws-/ora- prefixed IDs),
        // find the matching user_task by ora_plan_activity_id metadata
        try {
          const { data: linkedTasks } = await supabase
            .from('user_tasks')
            .select('id')
            .filter('metadata->>ora_plan_activity_id', 'eq', realOraActivityId);

          await supabase
            .from('user_tasks')
            .update({
              status: taskStatus,
              metadata: updatedMetadata,
              due_date: editEndDate ? format(editEndDate, 'yyyy-MM-dd') : undefined,
              updated_at: new Date().toISOString(),
            })
            .filter('metadata->>ora_plan_activity_id', 'eq', realOraActivityId);

          if (taskStatus === 'completed' && linkedTasks?.length) {
            submittedTaskIds.push(...linkedTasks.map((t: any) => t.id));
          }
        } catch (syncErr) {
          console.error('Cross-linkage sync failed:', syncErr);
        }
      }

      // Use atomic submission RPC when submitting for approval with reviewers
      if (taskStatus === 'completed' && hasReviewers && submissionComment.trim()) {
        const taskIdsToSubmit = submittedTaskIds.length > 0 ? submittedTaskIds : (isRealTaskId ? [task.id] : []);
        for (const submittedTaskId of taskIdsToSubmit) {
          const { error } = await (supabase as any).rpc('submit_task_for_approval', {
            p_task_id: submittedTaskId,
            p_comment: submissionComment.trim(),
          });
          if (error) {
            console.error('Failed atomic submission for task:', submittedTaskId, error);
          }
        }
      } else if (taskStatus === 'completed' && hasReviewers && submittedTaskIds.length > 0) {
        // Fallback: ensure reviewer tasks even without submission comment
        await Promise.all(
          submittedTaskIds.map(async (submittedTaskId) => {
            const { error } = await (supabase as any).rpc('ensure_reviewer_tasks_for_task', {
              p_task_id: submittedTaskId,
            });
            if (error) console.error('Failed to ensure reviewer tasks:', submittedTaskId, error);
          })
        );
      }

      // Auto-log status change as task_comments entry (only for non-submission status changes)
      if (status !== originalStatus && !(status === 'COMPLETED' && hasReviewers) && task?.id && user) {
        const statusLabel = STATUS_STEPS.find(s => s.value === status)?.label || status;
        try {
          await (supabase as any)
            .from('task_comments')
            .insert({
              task_id: task.id,
              user_id: user.id,
              comment: statusLabel,
              comment_type: 'status_change',
            });
        } catch (commentErr) {
          console.error('Failed to log status change comment:', commentErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['ora-activity-detail'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
      queryClient.invalidateQueries({ queryKey: ['ora-activity-comments', realOraActivityId] });

      setSubmissionComment('');
      toast.success(status === 'COMPLETED' ? 'Activity marked as completed' : 'Activity progress saved');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to save activity progress');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !user) return;
    setDeleting(true);

    try {
      if (realOraActivityId) {
        await (supabase as any).from('ora_plan_activities').delete().eq('id', realOraActivityId);
      }
      const isRealTaskId = task.id && !task.id.startsWith('ws-') && !task.id.startsWith('ora-');
      if (isRealTaskId) {
        await supabase.from('user_tasks').delete().eq('id', task.id);
      }

      if (planId) {
        const { data: planRow } = await (supabase as any)
          .from('orp_plans')
          .select('wizard_state')
          .eq('id', planId)
          .single();

        if (planRow?.wizard_state) {
          const ws = planRow.wizard_state as any;
          const wsActivities: any[] = ws.activities || [];
          const updatedActivities = wsActivities.filter((a: any) => {
            const aId = String(a.id || '');
            return aId !== realOraActivityId &&
                   aId !== `ora-${realOraActivityId}` &&
                   aId !== `ws-${realOraActivityId}` &&
                   aId !== (oraActivityId || '__none__');
          });
          await (supabase as any)
            .from('orp_plans')
            .update({ wizard_state: { ...ws, activities: updatedActivities } })
            .eq('id', planId);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });

      toast.success('Activity deleted');
      onOpenChange(false);
    } catch (err) {
      toast.error('Failed to delete activity');
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange} modal={true}>
      <SheetContent 
        className="w-full sm:max-w-lg p-0 flex flex-col h-full !z-[60]" 
        overlayClassName="!z-[60]"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y px-4 sm:px-6 pt-6 pb-4 -webkit-overflow-scrolling-touch">
          {/* Breadcrumb */}
          {projectCode && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
              <span>ORA Plan</span>
              <ChevronRight className="h-3 w-3" />
              {activityCode && <span className="font-mono">{activityCode}</span>}
              {activityCode && <ChevronRight className="h-3 w-3" />}
              <span className="truncate max-w-[180px]">{activityName || 'Activity'}</span>
            </div>
          )}
          {/* Header */}
          {(hasPrev || hasNext) && (
            <div className="flex items-center gap-1 mb-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!hasPrev}
                onClick={(e) => { e.stopPropagation(); onNavigatePrev?.(); }}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!hasNext}
                onClick={(e) => { e.stopPropagation(); onNavigateNext?.(); }}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <span className="text-[10px] text-muted-foreground ml-1">Navigate activities</span>
            </div>
          )}
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {activityCode && (
                <Badge className={cn(
                  "text-[11px] font-mono font-semibold border-0 px-2.5 py-0.5",
                  idColors.bg, idColors.text
                )}>
                  {activityCode}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}
              {/* Mini progress ring */}
              <div className="ml-auto flex items-center gap-1.5">
                <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
                  <circle cx="11" cy="11" r="9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                  <circle
                    cx="11" cy="11" r="9" fill="none"
                    stroke={progressPct >= 100 ? 'hsl(var(--chart-2))' : 'hsl(var(--primary))'}
                    strokeWidth="2.5"
                    strokeDasharray={`${(progressPct / 100) * 56.5} 56.5`}
                    strokeLinecap="round"
                    transform="rotate(-90 11 11)"
                  />
                </svg>
                <span className="text-[10px] font-semibold text-muted-foreground">{progressPct}%</span>
              </div>
            </div>
            <SheetTitle className="sr-only">Activity Details</SheetTitle>
             <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Activity name..."
              className="text-base sm:text-lg font-semibold leading-snug mt-1.5 border-0 shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent w-full truncate"
              disabled={isReadOnly}
            />
          </SheetHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="w-full h-8 p-0.5 grid grid-cols-4 gap-0.5">
              <TabsTrigger value="details" className="text-[11px] h-7 px-1 data-[state=active]:shadow-sm">Details</TabsTrigger>
              <TabsTrigger value="deps" className="text-[11px] h-7 px-1 data-[state=active]:shadow-sm">Dependencies</TabsTrigger>
              <TabsTrigger value="files" className="text-[11px] h-7 px-1 data-[state=active]:shadow-sm">Files</TabsTrigger>
              <TabsTrigger value="activity" className="text-[11px] h-7 px-1 data-[state=active]:shadow-sm">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-3">
          <div className="space-y-5">
            {/* Description */}
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Description</p>
              <Textarea
                placeholder="Add a description for this activity..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none text-sm border-primary/20 focus-visible:ring-primary/30"
                disabled={isReadOnly}
              />
            </div>

            {/* Schedule: Start, End, Duration on one row */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Schedule</p>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                {/* Start Date */}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">Start Date</p>
                  <button
                    type="button"
                    onClick={() => !isReadOnly && setShowCalendar(v => !v)}
                    disabled={isReadOnly}
                    className={cn(
                      "w-full h-9 px-2 sm:px-3 rounded-md border text-xs sm:text-sm text-left transition-colors hover:bg-muted/50 truncate",
                      editStartDate ? "text-foreground" : "text-muted-foreground",
                      showCalendar && "ring-1 ring-primary/40"
                    )}
                  >
                    {editStartDate ? format(editStartDate, 'MMM d, yyyy') : 'Set date'}
                  </button>
                </div>

                {/* End Date */}
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">End Date</p>
                  <button
                    type="button"
                    onClick={() => !isReadOnly && setShowCalendar(v => !v)}
                    disabled={isReadOnly}
                    className={cn(
                      "w-full h-9 px-2 sm:px-3 rounded-md border text-xs sm:text-sm text-left transition-colors hover:bg-muted/50 truncate",
                      editEndDate ? "text-foreground" : "text-muted-foreground",
                      isOverdue && "border-destructive/50 text-destructive",
                      showCalendar && "ring-1 ring-primary/40"
                    )}
                  >
                    {editEndDate ? format(editEndDate, 'MMM d, yyyy') : 'Set date'}
                  </button>
                </div>

                {/* Duration */}
                <div className="shrink-0">
                  <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">Duration</p>
                  <div className="flex items-center gap-0.5 h-9">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-xs"
                      disabled={isReadOnly || !editStartDate || !editEndDate || (durationDays !== null && durationDays <= 1)}
                      onClick={() => {
                        if (editStartDate && editEndDate && durationDays && durationDays > 1) {
                          setEditEndDate(addDays(editEndDate, -1));
                        }
                      }}
                    >
                      −
                    </Button>
                    <span className="font-semibold text-sm text-foreground w-8 text-center">{durationDays !== null ? `${durationDays}d` : '—'}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-xs"
                      disabled={isReadOnly || !editStartDate || !editEndDate}
                      onClick={() => {
                        if (editStartDate && editEndDate) {
                          setEditEndDate(addDays(editEndDate, 1));
                        }
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Collapsible range calendar */}
              {showCalendar && (
                <div className="border rounded-lg p-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Calendar
                    mode="range"
                    selected={editStartDate && editEndDate ? { from: editStartDate, to: editEndDate } : editStartDate ? { from: editStartDate, to: undefined } : undefined}
                    onSelect={(range) => {
                      if (range?.from) setEditStartDate(range.from);
                      else setEditStartDate(undefined);
                      if (range?.to) setEditEndDate(range.to);
                      else if (range?.from && !range?.to) setEditEndDate(undefined);
                      else setEditEndDate(undefined);
                    }}
                    numberOfMonths={1}
                    className="p-2 pointer-events-auto"
                    classNames={{
                      day_today: "bg-muted text-muted-foreground font-medium",
                    }}
                  />
                  {/* Smart date shortcuts */}
                  <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                    {[
                      { label: 'Today', fn: () => { setEditStartDate(new Date()); } },
                      { label: '+1w', fn: () => { if (editStartDate) setEditEndDate(addDays(editStartDate, 7)); } },
                      { label: '+2w', fn: () => { if (editStartDate) setEditEndDate(addDays(editStartDate, 14)); } },
                      { label: '+1m', fn: () => { if (editStartDate) setEditEndDate(addDays(editStartDate, 30)); } },
                      { label: '+3m', fn: () => { if (editStartDate) setEditEndDate(addDays(editStartDate, 90)); } },
                    ].map((shortcut) => (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={shortcut.fn}
                        className="text-[10px] font-medium px-2 py-1 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* P2A Activity: Show wizard CTA instead of status toggle */}
            {isP2AActivity ? (
              <div className="pt-2 space-y-3">
                {/* P2A Plan Status Badge */}
                {getP2AStatusBadge() && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">P2A Plan Status:</span>
                    {getP2AStatusBadge()}
                  </div>
                )}

                {/* Draft context banner — rejection or revert */}
                {showP2aRejectionBanner && effectiveP2aRejection && (
                  effectiveP2aRejection.type === 'reverted' ? (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1" style={{ borderLeft: '3px solid hsl(38, 92%, 50%)' }}>
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Plan reverted to Draft by {effectiveP2aRejection.rejector_name || effectiveP2aRejection.role_name}
                      </div>
                      <p className="text-xs text-amber-700/80 dark:text-amber-300/70 italic pl-5">
                        "{effectiveP2aRejection.comments}"
                      </p>
                      {effectiveP2aRejection.approved_at && (
                        <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 pl-5">
                          {format(new Date(effectiveP2aRejection.approved_at), 'MMM d, yyyy')}
                        </p>
                      )}
                      <p className="text-[10px] text-amber-600/60 dark:text-amber-400/50 pl-5">
                        You can continue editing and resubmit when ready.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Plan rejected by {effectiveP2aRejection.role_name || 'approver'}
                      </div>
                      <p className="text-xs text-foreground/80 italic pl-5">
                        "{effectiveP2aRejection.comments || 'No rejection comment was provided.'}"
                      </p>
                      {effectiveP2aRejection.approved_at && (
                        <p className="text-[10px] text-muted-foreground pl-5">
                          {format(new Date(effectiveP2aRejection.approved_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  )
                )}

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p2aPlanIsFullyApproved
                    ? 'The P2A handover plan has been approved. Open the workspace to view details.'
                    : p2aPlanIsSubmitted
                      ? 'The P2A handover plan has been submitted and is awaiting approval. No changes are permitted while under review.'
                      : existingP2APlan
                        ? 'You have a saved draft for the P2A Plan. Click below to continue where you left off.'
                        : 'This activity requires creating the Project to Asset (P2A) handover plan. Click below to launch the planning wizard and get started.'}
                </p>
                {p2aPlanIsSubmitted && !p2aPlanIsFullyApproved && (
                  <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                    ⏳ The plan is under review. You can view the submitted plan but editing is disabled until the review is complete.
                  </p>
                )}
                <Button
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  onClick={() => {
                    onOpenChange(false);
                    if (onOpenP2AWizard && projectId) {
                      onOpenP2AWizard(projectId, projectCode || '', !!p2aPlanIsFullyApproved);
                    }
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {p2aSheetCtaLabel}
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            ) : isVCRActivity ? (
              <div className="pt-2 space-y-3">
                {/* VCR Plan Status Badge */}
                {getVCRStatusBadge() && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">VCR Plan Status:</span>
                    {getVCRStatusBadge()}
                  </div>
                )}

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {vcrPlanIsApproved
                    ? `The VCR Plan for ${metaVcrName || 'this VCR'} has been approved. Click below to view the finalized plan.`
                    : vcrPlanIsSubmitted
                      ? `The VCR Plan for ${metaVcrName || 'this VCR'} has been submitted and is awaiting approval.`
                      : vcrHasDraft
                        ? `You have a saved draft for the VCR Plan for ${metaVcrName || 'this VCR'}. Continue where you left off to define training, procedures, and other building blocks.`
                        : `Configure the VCR Plan for ${metaVcrName || 'this VCR'}. Define training, procedures, critical documents, and other building blocks.`}
                </p>
                {vcrPlanIsSubmitted && (
                  <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
                    ⏳ The plan is under review. You can view the submitted plan but editing is disabled until the review is complete.
                  </p>
                )}
                <Button
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  onClick={() => {
                    onOpenChange(false);
                    if (onOpenVCRWizard && metaVcrId && projectId) {
                      onOpenVCRWizard(metaVcrId, metaVcrCode || '', metaVcrName || '', projectId, projectCode || '');
                    }
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {vcrSheetCtaLabel}
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            ) : (
              <>
                {/* Status Toggle */}
                <div className="pt-2">
                  <p className="text-sm font-medium mb-3 text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                    {(isP2AActivity ? STATUS_STEPS.filter(s => s.value !== 'COMPLETED') : STATUS_STEPS).map((step) => {
                      const Icon = step.icon;
                      const isActive = status === step.value;
                      return (
                        <button
                          key={step.value}
                          onClick={() => !isReadOnly && setStatus(step.value)}
                          onTouchEnd={(e) => {
                            if (!isReadOnly) {
                              e.preventDefault();
                              setStatus(step.value);
                            }
                          }}
                          disabled={isReadOnly}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-3 sm:py-2 px-2 sm:px-3 rounded-md text-xs sm:text-xs font-medium transition-all whitespace-nowrap touch-manipulation",
                            isActive && step.value === 'NOT_STARTED' && "bg-slate-200 text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-200",
                            isActive && step.value === 'IN_PROGRESS' && "bg-amber-500 text-white shadow-sm dark:bg-amber-600",
                            isActive && step.value === 'COMPLETED' && "bg-emerald-500 text-white shadow-sm dark:bg-emerald-600",
                            !isActive && "text-muted-foreground hover:text-foreground hover:bg-background/50"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{step.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {status === 'IN_PROGRESS' && (
                    <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Progress</p>
                        <span className="text-sm font-semibold text-amber-600">{progressPct}%</span>
                      </div>
                      <Slider
                    value={[progressPct]}
                    onValueChange={(val) => {
                      if (isReadOnly) return;
                      const newPct = val[0];
                      setProgressPct(newPct);
                      // Auto-promote status when user starts working (progress > 0)
                      if (newPct > 0 && status === 'NOT_STARTED') {
                        setStatus('IN_PROGRESS');
                      } else if (newPct === 0 && status === 'IN_PROGRESS') {
                        // Auto-demote status if user sets progress back to 0
                        setStatus('NOT_STARTED');
                      }
                    }}
                    max={100}
                    step={5}
                    disabled={isReadOnly}
                    className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:bg-background [&_.bg-primary]:bg-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}
            </div>
              </>
            )}
          </div>
            </TabsContent>

            <TabsContent value="deps" className="mt-3">
            <div className="space-y-5">
            {/* Prerequisites */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                Prerequisites
              </p>
              {predecessorIds.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {predecessorIds.map((predId) => {
                    const siblings: any[] = (metadata?.sibling_activities as any[] || []).length > 0 ? metadata?.sibling_activities : (dbSiblingActivities || []);
                    const match = siblings.find((s: any) => s.id === predId || s.activity_code === predId);
                    return (
                      <div key={predId} className="flex items-center gap-2 p-2 bg-muted/40 rounded-md text-xs">
                        {match?.activity_code && (
                          <Badge variant="outline" className="text-[9px] font-mono shrink-0">{match.activity_code}</Badge>
                        )}
                        <span className="truncate flex-1">{match?.name || predId}</span>
                        <button
                          onClick={() => setPredecessorIds(prev => prev.filter(p => p !== predId))}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {(() => {
                const siblings: any[] = (metadata?.sibling_activities as any[] || []).length > 0 ? metadata?.sibling_activities : (dbSiblingActivities || []);
                const available = siblings.filter((s: any) => !predecessorIds.includes(s.id) && !predecessorIds.includes(s.activity_code));
                if (available.length === 0 && predecessorIds.length === 0) return <p className="text-[10px] text-muted-foreground">No activities available to add as prerequisites.</p>;
                if (available.length === 0) return null;
                return (
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (val && !predecessorIds.includes(val)) {
                        setPredecessorIds(prev => [...prev, val]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Plus className="h-3 w-3" />
                        <span>Add prerequisite...</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((s: any) => (
                        <SelectItem key={s.id} value={s.activity_code || s.id} className="text-xs">
                          <span className="font-mono text-muted-foreground mr-1">{s.activity_code}</span>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
            </div>
            </TabsContent>

            <TabsContent value="files" className="mt-3">
            <div className="space-y-5">
            {/* Attachments */}
            {task?.id && (
              <TaskAttachmentsSection
                taskId={task.id}
                isReadOnly={isReadOnly}
              />
            )}

            {/* Approvers — only for non-P2A tasks */}
            {!isP2AActivity && task?.id && (
              <TaskReviewersSection
                taskId={task.id}
                isReadOnly={isReadOnly}
                isTaskOwner={true}
                onDecisionMade={async () => {
                  queryClient.invalidateQueries({ queryKey: ['ora-activity-comments'] });
                  queryClient.invalidateQueries({ queryKey: ['task-comments'] });
                  queryClient.invalidateQueries({ queryKey: ['task-reviewers-summary'] });
                  queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
                }}
              />
            )}
            </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-3">
            <div className="space-y-5">
            {/* Comments & Activity Feed */}
            {(() => {
              // Build unified activity feed merging comments + approver decisions
              const approverEntries = isP2AActivity ? (p2aApproverDecisions || []).map((d: any) => ({
                id: `approver-${d.id}`,
                type: 'approval_action' as const,
                status: d.status,
                role_name: d.role_name,
                comment: d.comments,
                full_name: d.full_name,
                avatar_url: d.avatar_url,
                timestamp: d.approved_at,
                cycle: null as number | null,
              })) : [];
              // Add archived history entries with cycle info
              const historyEntries = isP2AActivity ? (p2aApproverHistory || []).map((d: any) => ({
                id: `history-${d.id}`,
                type: 'approval_action' as const,
                status: d.status,
                role_name: d.role_name,
                comment: d.comments,
                full_name: d.full_name,
                avatar_url: d.avatar_url,
                timestamp: d.approved_at,
                cycle: d.cycle as number | null,
              })) : [];
              const commentEntries = taskScopedComments.map((c) => ({
                id: c.id,
                type: c.comment_type === 'submission' ? 'submission' as const
                  : c.comment_type === 'reopened' ? 'reopened' as const
                  : 'comment' as const,
                status: null,
                role_name: null,
                comment: c.comment,
                full_name: c.full_name,
                avatar_url: c.avatar_url,
                timestamp: c.created_at,
                cycle: null as number | null,
              }));
              const activityFeed = sortP2AFeedEntries(
                [...commentEntries, ...approverEntries, ...historyEntries]
                  .filter((e) => e.timestamp)
              );
              const feedCount = activityFeed.length;

              return (
                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">
                    Activity Feed
                    {feedCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">{feedCount}</Badge>
                    )}
                  </p>
                  <div className="flex gap-2 mb-3">
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[60px] resize-none text-sm"
                    />
                    <Button size="sm" variant="secondary" onClick={handleAddComment} disabled={!comment.trim() || isAdding}>
                      {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : feedCount > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {activityFeed.map((entry) => (
                        <div key={entry.id} className="flex gap-2.5">
                          <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                            {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
                            <AvatarFallback className="text-[9px] font-medium bg-muted">
                              {(entry.full_name || '?').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            {(() => {
                              const rawComment = (entry.comment || '').trim();
                              const normalizedComment = rawComment.replace('Status changed to ', '');
                              const isStatusChange =
                                ['Completed', 'In Progress', 'Not Started'].includes(normalizedComment) ||
                                rawComment.startsWith('Status changed to ');
                              const isReopened = entry.type === 'reopened';

                              // Check if this task has review/approval activity
                              const hasReviewActivity = activityFeed.some(
                                (e) => e.type === 'approval_action' || e.type === 'submission' ||
                                       (e.comment?.startsWith('✅') || e.comment?.startsWith('❌'))
                              );
                              const isCompletedStatus = normalizedComment === 'Completed';
                              const isNotStartedStatus = normalizedComment === 'Not Started';

                              const isDecisionFromComment =
                                entry.type === 'comment' &&
                                (rawComment.startsWith('✅') ||
                                  rawComment.startsWith('❌') ||
                                  /^approved\b/i.test(rawComment) ||
                                  /^rejected\b/i.test(rawComment));

                              const isApprovalFromComment =
                                isDecisionFromComment &&
                                (rawComment.startsWith('✅') || /^approved\b/i.test(rawComment));

                              const isVoidedDecision =
                                entry.type === 'comment' &&
                                (rawComment.startsWith('⚠️') || /voided\s+(their|decision)/i.test(rawComment));

                              const cleanedDecisionComment = rawComment
                                .replace(/^[✅❌⚠️]\s*/, '')
                                .replace(/^(Approved|Rejected)(\s+by\s+[^\n]+)?\s*\n?/i, '')
                                .replace(/^Decision\s+voided\s*[-–—]\s*/i, '')
                                .replace(/^.*?\bvoided\s+their\b.*?\bdecision\b\.?\s*/i, '')
                                .trim();

                              if (entry.type === 'submission' || (entry.type === 'approval_action' && entry.status === 'SUBMITTED')) {
                                return (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      >
                                        Submitted
                                      </Badge>
                                    </div>
                                    {rawComment ? (
                                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{rawComment}</p>
                                    ) : null}
                                  </>
                                );
                              }

                              if (entry.type === 'approval_action' && entry.status === 'REVERTED') {
                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    >
                                      Reverted to Draft
                                    </Badge>
                                  </div>
                                );
                              }

                              if (entry.type === 'approval_action') {
                                return (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0 h-4 border-0 font-semibold",
                                          entry.status === 'APPROVED'
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}
                                      >
                                        {entry.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                                      </Badge>
                                    </div>
                                    {cleanedDecisionComment ? (
                                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{cleanedDecisionComment}</p>
                                    ) : null}
                                  </>
                                );
                              }

                              if (isDecisionFromComment) {
                                return (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0 h-4 border-0 font-semibold",
                                          isApprovalFromComment
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}
                                      >
                                        {isApprovalFromComment ? 'Approved' : 'Rejected'}
                                      </Badge>
                                    </div>
                                    {cleanedDecisionComment ? (
                                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{cleanedDecisionComment}</p>
                                    ) : null}
                                  </>
                                );
                              }

                              if (isVoidedDecision) {
                                return (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400"
                                      >
                                        Decision Voided
                                      </Badge>
                                    </div>
                                    {cleanedDecisionComment ? (
                                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mt-1">{cleanedDecisionComment}</p>
                                    ) : null}
                                  </>
                                );
                              }

                              if (isReopened) {
                                const reasonText = rawComment
                                  .replace(/^Task reopened\s*[-–—]?\s*/i, '')
                                  .trim();
                                return (
                                  <>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-4 border-0 font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    >
                                      Not Completed
                                    </Badge>
                                    {reasonText ? (
                                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed mt-1">{reasonText}</p>
                                    ) : null}
                                  </>
                                );
                              }

                              if (isStatusChange) {
                                const displayLabel = isCompletedStatus && hasReviewActivity ? 'Submitted'
                                  : isNotStartedStatus ? 'Not Completed'
                                  : normalizedComment;
                                const statusColor = (isCompletedStatus && hasReviewActivity)
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : isNotStartedStatus
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : isCompletedStatus
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : normalizedComment.includes('In Progress')
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-muted text-muted-foreground";
                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] px-1.5 py-0 h-4 border-0 font-semibold",
                                        statusColor
                                      )}
                                    >
                                      {displayLabel}
                                    </Badge>
                                  </div>
                                );
                              }

                              return rawComment ? (
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{rawComment}</p>
                              ) : null;
                            })()}
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {entry.full_name}
                              {entry.role_name ? ` · ${entry.role_name}` : ''}
                              {entry.cycle ? ` · Round ${entry.cycle}` : ''}
                              {' · '}
                              {formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })()}
            </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Pinned footer */}
        <div className="border-t bg-background px-3 sm:px-6 py-3 sm:py-4 shrink-0 safe-area-inset-bottom space-y-3">
          {/* Mandatory submission comment when submitting for approval */}
          {!isReadOnly && status === 'COMPLETED' && hasReviewers && (isDirty || needsResubmission) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Submission Notes <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Add notes for the approvers before submitting..."
                value={submissionComment}
                onChange={(e) => setSubmissionComment(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            {!isReadOnly && metadata?.source !== 'ora_workflow' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[200]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Activity</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this activity and its associated task. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </Button>

              {!isReadOnly && (isDirty || needsResubmission) && !(isP2AActivity && status === 'COMPLETED') && !(isVCRActivity && status === 'COMPLETED') && (
                <Button
                  size="sm"
                  className={cn(
                    "gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200",
                    status === 'COMPLETED'
                      ? hasReviewers
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                      : ""
                  )}
                  onClick={handleSave}
                  disabled={saving || (status === 'COMPLETED' && hasReviewers && !submissionComment.trim())}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === 'COMPLETED' ? (
                    hasReviewers ? (
                      <>
                        <Send className="h-4 w-4" />
                        Submit for Approval
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Completed
                      </>
                    )
                  ) : (
                    'Save'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    </>
  );
};
