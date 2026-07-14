import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VCRSoFApprover {
  id: string;
  handover_point_id: string;
  user_id: string;
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

export const useVCRSoFApprovers = (handoverPointId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vcr-sof-approvers', handoverPointId],
    enabled: !!handoverPointId,
    queryFn: async (): Promise<VCRSoFApprover[]> => {
      if (!handoverPointId) return [];
      const { data, error } = await client()
        .from('vcr_sof_approvers')
        .select('*')
        .eq('handover_point_id', handoverPointId)
        .order('approver_level', { ascending: true });
      if (error) throw error;
      return (data || []) as VCRSoFApprover[];
    },
  });

  const sign = useMutation({
    mutationFn: async (args: { approverId: string; signature_data: string; comments?: string }) => {
      // Signing this row triggers trg_vcr_sof_approvers_cascade, which
      // (a) unlocks the next approver level and
      // (b) stamps the handover point as SIGNED once every row is SIGNED.
      // No client-side cascade needed anymore.
      const { data, error } = await client()
        .from('vcr_sof_approvers')
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
      queryClient.invalidateQueries({ queryKey: ['vcr-sof-approvers', handoverPointId] });
      queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
      queryClient.invalidateQueries({ queryKey: ['sof-awaiting-director-review'] });
    },
  });

  return { ...query, sign };
};
