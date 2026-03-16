import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface P2ARejectionContext {
  role_name: string;
  comments: string | null;
  approved_at: string | null;
  rejector_name: string | null;
  type: 'rejected' | 'reverted';
}

/**
 * Unified rejection context for P2A plans.
 * Reads from plan-level fields first (persisted by trigger + cascade),
 * falls back to p2a_approver_history, then live approvers.
 */
export function useP2ARejectionContext(planId: string | undefined, planStatus: string | undefined) {
  return useQuery({
    queryKey: ['p2a-rejection-context', planId],
    queryFn: async (): Promise<P2ARejectionContext | null> => {
      if (!planId) return null;
      const client = supabase as any;

      // Primary: plan-level rejection fields (set by trigger + cascade)
      const { data: plan } = await client
        .from('p2a_handover_plans')
        .select('last_rejection_comment, last_rejected_by_name, last_rejected_by_role, last_rejected_at')
        .eq('id', planId)
        .single();

      if (plan?.last_rejection_comment) {
        const isReverted = plan.last_rejected_by_role === 'Reverted';
        return {
          role_name: isReverted ? (plan.last_rejected_by_name || 'User') : (plan.last_rejected_by_role || 'Approver'),
          comments: plan.last_rejection_comment,
          approved_at: plan.last_rejected_at || null,
          rejector_name: plan.last_rejected_by_name || null,
          type: isReverted ? 'reverted' : 'rejected',
        };
      }

      // Fallback: latest REJECTED entry from history
      const { data: historyRow } = await client
        .from('p2a_approver_history')
        .select('role_name, comments, approved_at')
        .eq('handover_id', planId)
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

      // Final fallback: live approvers (backward compat)
      const { data: approverRow } = await client
        .from('p2a_handover_approvers')
        .select('role_name, comments, approved_at')
        .eq('handover_id', planId)
        .eq('status', 'REJECTED')
        .order('approved_at', { ascending: false })
        .limit(1);

      if (approverRow?.[0]) {
        return {
          role_name: approverRow[0].role_name,
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
