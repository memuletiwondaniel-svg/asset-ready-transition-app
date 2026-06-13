import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

/**
 * VCR Plan approval tasks for the current user.
 *
 * Backed by `v_vcr_plan_approver_tasks` (Phase-1 two-phase gate). Only
 * actionable rows surface in My Tasks — non-actionable Phase-2 rows do
 * NOT appear as "waiting" stubs (per spec).
 */
export interface VCRPlanApprovalTask {
  approver_row_id: string;
  handover_point_id: string;
  vcr_code: string;
  vcr_name: string | null;
  project_id: string | null;
  project_code: string | null;
  role_key: string;
  role_label: string;
  phase: number | null;
  total_count: number;
  approved_count: number;
  execution_plan_status: 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';
}

export function useVCRPlanApprovalTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vcr-plan-approval-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as VCRPlanApprovalTask[];
      const { data, error } = await (supabase as any)
        .from('v_vcr_plan_approver_tasks')
        .select('approver_row_id, handover_point_id, vcr_code, vcr_name, project_id, project_code, role_key, role_label, phase, total_count, approved_count, execution_plan_status, is_actionable, user_id')
        .eq('user_id', user.id)
        .eq('is_actionable', true);
      if (error) throw error;
      return (data || []) as VCRPlanApprovalTask[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * Plan-level rollup for a single VCR — drives the status pill.
 * Returns the rollup from any approver row (all rows share the rollup
 * fields). When no rows exist or no ORA Lead row exists, the pill shows
 * "Plan misconfigured".
 */
export interface VCRPlanRollup {
  execution_plan_status: 'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED';
  phase: number | null;
  total_count: number;
  approved_count: number;
  any_rejected: boolean;
  has_ora_lead: boolean;
  rejectors: Array<{ role_label: string; user_id: string }> | null;
  my_actionable_row_id: string | null;
}

export function useVCRPlanRollup(handoverPointId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['vcr-plan-rollup', handoverPointId, user?.id],
    queryFn: async () => {
      if (!handoverPointId) return null;
      const { data, error } = await (supabase as any)
        .from('v_vcr_plan_approver_tasks')
        .select('execution_plan_status, phase, total_count, approved_count, any_rejected, has_ora_lead, rejectors, approver_row_id, user_id, is_actionable')
        .eq('handover_point_id', handoverPointId);
      if (error) throw error;
      const rows = (data || []) as any[];
      if (rows.length === 0) {
        // Fall back to handover_point row for status (Draft VCRs have no approvers yet).
        const { data: hp } = await (supabase as any)
          .from('p2a_handover_points')
          .select('execution_plan_status')
          .eq('id', handoverPointId)
          .maybeSingle();
        return {
          execution_plan_status: (hp?.execution_plan_status || 'DRAFT'),
          phase: null,
          total_count: 0,
          approved_count: 0,
          any_rejected: false,
          has_ora_lead: false,
          rejectors: null,
          my_actionable_row_id: null,
        } as VCRPlanRollup;
      }
      const first = rows[0];
      const mine = rows.find(r => r.user_id === user?.id && r.is_actionable);
      return {
        execution_plan_status: first.execution_plan_status,
        phase: first.phase,
        total_count: first.total_count,
        approved_count: first.approved_count,
        any_rejected: first.any_rejected,
        has_ora_lead: first.has_ora_lead,
        rejectors: first.rejectors,
        my_actionable_row_id: mine?.approver_row_id ?? null,
      } as VCRPlanRollup;
    },
    enabled: !!handoverPointId,
    staleTime: 30 * 1000,
  });
}

/** Human label for the status pill, per spec. */
export function vcrPlanPillLabel(r: VCRPlanRollup): { label: string; tone: 'muted' | 'amber' | 'red' | 'green' | 'destructive' } {
  if (r.execution_plan_status === 'APPROVED') return { label: 'Approved', tone: 'green' };
  if (r.execution_plan_status === 'CHANGES_REQUESTED') {
    const who = r.rejectors?.[0]?.role_label || 'approver';
    return { label: `Changes requested — ${who}`, tone: 'red' };
  }
  // When approvers exist with a calculated phase, prefer the phase-aware
  // label even if the handover_point's execution_plan_status is still
  // 'DRAFT' (status promotion can lag behind approver row creation).
  if (r.total_count > 0) {
    if (!r.has_ora_lead) return { label: 'Plan misconfigured — contact admin', tone: 'destructive' };
    if (r.any_rejected) {
      const who = r.rejectors?.[0]?.role_label || 'approver';
      return { label: `Changes requested — ${who}`, tone: 'red' };
    }
    if (r.phase === 1) return { label: 'Awaiting ORA Lead review', tone: 'amber' };
    if (r.phase === 2) return { label: `${r.approved_count} of ${r.total_count} approved`, tone: 'amber' };
    return { label: 'Submitted', tone: 'amber' };
  }
  if (r.execution_plan_status === 'DRAFT') return { label: 'Draft', tone: 'muted' };
  return { label: 'Submitted', tone: 'amber' };
}
