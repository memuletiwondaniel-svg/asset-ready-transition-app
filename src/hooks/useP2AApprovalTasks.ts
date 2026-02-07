import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface CreateApprovalTasksParams {
  planId: string;
  projectId: string;
  projectCode: string;
  approvers: Array<{
    role_name: string;
    display_order: number;
    user_id?: string;
  }>;
}

/**
 * Creates Phase 2 approval tasks after Phase 1 approvers have all completed.
 * Called when the last Phase 1 approver marks their task as completed.
 */
async function createPhase2Tasks(planId: string, projectId: string, projectCode: string) {
  const client = supabase as any;

  // Fetch Phase 2 approvers (display_order >= 4) from the plan
  const { data: approvers, error: approverError } = await client
    .from('p2a_handover_approvers')
    .select('role_name, display_order')
    .eq('handover_id', planId)
    .gte('display_order', 4);

  if (approverError || !approvers?.length) return;

  // Look up team members for these roles
  const { data: teamMembers } = await client
    .from('project_team_members')
    .select('user_id, role')
    .eq('project_id', projectId);

  if (!teamMembers) return;

  const roleMap: Record<string, string> = {};
  for (const member of teamMembers) {
    const role = member.role?.toLowerCase() || '';
    if (role.includes('hub lead') || role.includes('project hub lead')) {
      roleMap['Project Hub Lead'] = member.user_id;
    }
    if (role.includes('deputy plant director')) {
      roleMap['Deputy Plant Director'] = member.user_id;
    }
  }

  const taskRecords = approvers
    .map((approver: any) => {
      const userId = roleMap[approver.role_name];
      if (!userId) return null;
      return {
        user_id: userId,
        title: `Final Approval – P2A Handover Plan ${projectCode}`,
        description: `Technical review is complete. As ${approver.role_name}, please provide your final approval for the P2A Handover Plan for project ${projectCode}.`,
        type: 'approval',
        priority: 'high',
        status: 'pending',
        metadata: {
          plan_id: planId,
          project_id: projectId,
          project_code: projectCode,
          approver_role: approver.role_name,
          approval_phase: 2,
          source: 'p2a_handover',
        },
      };
    })
    .filter(Boolean);

  if (taskRecords.length > 0) {
    await client.from('user_tasks').insert(taskRecords);
  }
}

export function useP2AApprovalTasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createApprovalTasks = useMutation({
    mutationFn: async ({ planId, projectId, projectCode, approvers }: CreateApprovalTasksParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const client = supabase as any;

      // Create approval records in p2a_handover_approvers
      const approverRecords = approvers.map((approver) => ({
        handover_id: planId,
        role_name: approver.role_name,
        display_order: approver.display_order,
        status: 'PENDING' as const,
      }));

      const { data: createdApprovers, error: approversError } = await client
        .from('p2a_handover_approvers')
        .insert(approverRecords)
        .select();

      if (approversError) throw approversError;

      return createdApprovers;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
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
    createPhase2Tasks,
    isCreating: createApprovalTasks.isPending,
  };
}
