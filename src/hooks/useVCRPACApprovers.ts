import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VCRPACApprover {
  id: string;
  handover_point_id: string;
  user_id: string | null;
  approver_name: string;
  approver_role: string;
  approver_level: number;
  status: 'SIGNED' | 'PENDING' | 'LOCKED';
  signed_at: string | null;
  signature_data: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

const client = () => supabase as any;

/**
 * VCR PAC approver ledger. Mirrors useVCRSoFApprovers.
 *
 * The DB trigger `trg_vcr_pac_approvers_cascade` owns level cascade and
 * stamping `p2a_handover_points.pac_signed_at` — no client-side cascade.
 */
export const useVCRPACApprovers = (handoverPointId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vcr-pac-approvers', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async (): Promise<VCRPACApprover[]> => {
      if (!handoverPointId) return [];
      const { data, error } = await client()
        .from('vcr_pac_approvers')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('approver_level', { ascending: true });
      if (error) throw error;
      return (data || []) as VCRPACApprover[];
    },
  });

  const sign = useMutation({
    mutationFn: async (args: { approverId: string; signature_data: string; comments?: string }) => {
      const { data, error } = await client()
        .from('vcr_pac_approvers')
        .update({
          status: 'SIGNED',
          signature_data: args.signature_data,
          signed_at: new Date().toISOString(),
          comments: args.comments ?? null,
        })
        .eq('id', args.approverId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcr-pac-approvers', handoverPointId] });
      queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
    },
  });

  return { ...query, sign };
};
