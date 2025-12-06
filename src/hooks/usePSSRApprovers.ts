import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PSSRApprover {
  id: string;
  pssr_id: string;
  approver_name: string;
  approver_role: string;
  approver_level: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_at: string | null;
  created_at: string;
  comments: string | null;
  user_id: string | null;
}

export const usePSSRApprovers = (pssrId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: approvers, isLoading, error } = useQuery({
    queryKey: ['pssr-approvers', pssrId],
    queryFn: async () => {
      if (!pssrId) return [];
      
      const { data, error } = await supabase
        .from('pssr_approvers')
        .select('*')
        .eq('pssr_id', pssrId)
        .order('approver_level', { ascending: true });
      
      if (error) throw error;
      return data as PSSRApprover[];
    },
    enabled: !!pssrId,
  });

  const approveApproval = useMutation({
    mutationFn: async ({ approverId, comments }: { approverId: string; comments?: string }) => {
      const { data, error } = await supabase
        .from('pssr_approvers')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          comments: comments || null,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', approverId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-approvers', pssrId] });
      toast({
        title: 'Approval Recorded',
        description: 'Your approval has been successfully recorded.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const rejectApproval = useMutation({
    mutationFn: async ({ approverId, comments }: { approverId: string; comments: string }) => {
      const { data, error } = await supabase
        .from('pssr_approvers')
        .update({
          status: 'REJECTED',
          approved_at: new Date().toISOString(),
          comments: comments,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', approverId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pssr-approvers', pssrId] });
      toast({
        title: 'Changes Requested',
        description: 'Your feedback has been recorded.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Action Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate completion stats
  const stats = {
    total: approvers?.length || 0,
    approved: approvers?.filter(a => a.status === 'APPROVED').length || 0,
    pending: approvers?.filter(a => a.status === 'PENDING').length || 0,
    rejected: approvers?.filter(a => a.status === 'REJECTED').length || 0,
  };

  const isComplete = stats.total > 0 && stats.approved === stats.total;

  return {
    approvers,
    isLoading,
    error,
    approveApproval,
    rejectApproval,
    stats,
    isComplete,
  };
};
