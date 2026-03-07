import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export interface UserP2AApproval {
  id: string;
  handover_id: string;
  stage: string;
  status: string;
  approver_name: string;
  comments?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  handover_name?: string;
  project_name?: string;
  project_number?: string;
}

export const useUserP2AApprovals = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-p2a-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('p2a_approval_workflow')
        .select(`
          *,
          p2a_handovers!inner (
            id,
            project_name,
            project_number,
            pac_target_date,
            fac_target_date
          )
        `)
        .eq('approver_user_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        handover_id: item.handover_id,
        stage: item.stage,
        status: item.status,
        approver_name: item.approver_name,
        comments: item.comments,
        created_at: item.created_at,
        updated_at: item.updated_at,
        handover_name: item.p2a_handovers?.project_name || 'Unknown Handover',
        project_name: item.p2a_handovers?.project_name,
        project_number: item.p2a_handovers?.project_number,
      })) as UserP2AApproval[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate stats
  const stats = {
    total: query.data?.length || 0,
    pac: query.data?.filter(a => a.stage === 'PAC')?.length || 0,
    fac: query.data?.filter(a => a.stage === 'FAC')?.length || 0,
  };

  return {
    ...query,
    approvals: query.data || [],
    stats,
  };
};
