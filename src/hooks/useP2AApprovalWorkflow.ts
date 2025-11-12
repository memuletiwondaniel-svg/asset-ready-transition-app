import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface P2AApprovalWorkflow {
  id: string;
  handover_id: string;
  stage: string;
  status: string;
  approver_user_id?: string;
  approver_name: string;
  approved_at?: string;
  comments?: string;
  created_at: string;
  updated_at: string;
}

export const useP2AApprovalWorkflow = (handoverId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['p2a-approval-workflow', handoverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('p2a_approval_workflow')
        .select('*')
        .eq('handover_id', handoverId)
        .order('created_at');

      if (error) throw error;
      return data as P2AApprovalWorkflow[];
    },
    enabled: !!handoverId
  });

  const updateApproval = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: string; comments?: string }) => {
      const updates: any = { status };
      if (comments) updates.comments = comments;
      if (status === 'APPROVED') updates.approved_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('p2a_approval_workflow')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['p2a-approval-workflow', handoverId] });
      toast({
        title: 'Success',
        description: 'Approval status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update approval: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  return {
    approvals,
    isLoading,
    updateApproval: updateApproval.mutate,
    isUpdating: updateApproval.isPending,
  };
};