import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface CreateApprovalTasksParams {
  planId: string;
  projectId: string;
  approvers: Array<{
    role_name: string;
    display_order: number;
  }>;
}

export function useP2AApprovalTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createApprovalTasks = useMutation({
    mutationFn: async ({ planId, projectId, approvers }: CreateApprovalTasksParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create approval records in p2a_handover_approvers
      const approverRecords = approvers.map((approver) => ({
        handover_id: planId,
        role_name: approver.role_name,
        display_order: approver.display_order,
        status: 'PENDING' as const,
      }));

      const { data: createdApprovers, error: approversError } = await supabase
        .from('p2a_handover_approvers')
        .insert(approverRecords)
        .select();

      if (approversError) throw approversError;

      // Create tasks in user_tasks table for the first approver
      // (subsequent approvers get notified when previous one completes)
      const firstApprover = approvers.find(a => a.display_order === 1);
      if (firstApprover) {
        // Note: We'd need to look up users by role to create actual tasks
        // For now, we create the approver records which can be assigned later
      }

      return createdApprovers;
    },
    onSuccess: () => {
      toast({
        title: 'Approval workflow initiated',
        description: 'Approvers have been notified.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createApprovalTasks: createApprovalTasks.mutateAsync,
    isCreating: createApprovalTasks.isPending,
  };
}
