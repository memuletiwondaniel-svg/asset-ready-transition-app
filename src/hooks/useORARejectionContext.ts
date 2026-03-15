import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ORARejectionContext {
  role_name: string;
  comments: string | null;
  approved_at: string | null;
  rejector_name: string | null;
}

/**
 * Unified rejection context for ORA plans.
 * Reads from plan-level fields first (persisted by trigger),
 * falls back to orp_approval_history, then live approvals.
 */
export function useORARejectionContext(planId: string | undefined, planStatus: string | undefined) {
  return useQuery({
    queryKey: ['ora-rejection-context', planId],
    queryFn: async (): Promise<ORARejectionContext | null> => {
      if (!planId) return null;
      const client = supabase as any;

      // Primary: plan-level rejection fields
      const { data: plan } = await client
        .from('orp_plans')
        .select('last_rejection_comment, last_rejected_by_name, last_rejected_by_role, last_rejected_at')
        .eq('id', planId)
        .single();

      if (plan?.last_rejection_comment) {
        return {
          role_name: plan.last_rejected_by_role || 'Approver',
          comments: plan.last_rejection_comment,
          approved_at: plan.last_rejected_at || null,
          rejector_name: plan.last_rejected_by_name || null,
        };
      }

      // Fallback: latest REJECTED entry from history
      const { data: historyRow } = await client
        .from('orp_approval_history')
        .select('role_name, comments, approved_at')
        .eq('orp_plan_id', planId)
        .eq('status', 'REJECTED')
        .order('approved_at', { ascending: false })
        .limit(1);

      if (historyRow?.[0]) {
        return {
          role_name: historyRow[0].role_name,
          comments: historyRow[0].comments,
          approved_at: historyRow[0].approved_at,
          rejector_name: null,
        };
      }

      // Final fallback: live approvals
      const { data: approverRow } = await client
        .from('orp_approvals')
        .select('approver_role, comments, approved_at')
        .eq('orp_plan_id', planId)
        .eq('status', 'REJECTED')
        .order('approved_at', { ascending: false })
        .limit(1);

      if (approverRow?.[0]) {
        return {
          role_name: approverRow[0].approver_role,
          comments: approverRow[0].comments,
          approved_at: approverRow[0].approved_at,
          rejector_name: null,
        };
      }

      return null;
    },
    enabled: !!planId && planStatus === 'DRAFT',
    staleTime: 0,
    refetchOnMount: 'always' as const,
  });
}
