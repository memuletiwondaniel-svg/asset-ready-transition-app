import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface SOFPendingReview {
  id: string;
  pssr_id: string;
  sof_certificate_id: string;
  approver_role: string;
  approver_name: string;
  status: string;
  created_at: string;
  pssr: {
    id: string;
    pssr_id: string;
    project_name: string;
    asset: string | null;
    scope: string | null;
    created_at: string;
  } | null;
}

/**
 * Fetch SoF items awaiting director review
 * Returns SoFs where the current user is an approver and status is PENDING
 */
export const useSOFAwaitingDirectorReview = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sof-awaiting-director-review', user?.id],
    queryFn: async (): Promise<SOFPendingReview[]> => {
      if (!user?.id) return [];

      // Fetch SoF approvals where user is assigned and status is PENDING or LOCKED
      // Note: use user_id field (not approver_user_id)
      const { data: sofApprovals, error } = await supabase
        .from('sof_approvers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['PENDING', 'LOCKED']);

      if (error) throw error;
      if (!sofApprovals || sofApprovals.length === 0) return [];

      // Get unique PSSR IDs
      const pssrIds = [...new Set(sofApprovals.map(a => a.pssr_id))];

      // Fetch PSSR details separately
      const { data: pssrs, error: pssrError } = await supabase
        .from('pssrs')
        .select('id, pssr_id, project_name, asset, scope, created_at')
        .in('id', pssrIds);

      if (pssrError) throw pssrError;

      // Create a lookup map for PSSRs
      const pssrMap = new Map(pssrs?.map(p => [p.id, p]) || []);

      // Transform data to expected format
      const results: SOFPendingReview[] = sofApprovals.map((approval) => ({
        id: approval.id,
        pssr_id: approval.pssr_id,
        sof_certificate_id: approval.sof_certificate_id,
        approver_role: approval.approver_role,
        approver_name: approval.approver_name,
        status: approval.status,
        created_at: approval.created_at,
        pssr: pssrMap.get(approval.pssr_id) || null,
      }));

      return results;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute cache
    refetchOnWindowFocus: true,
  });
};
