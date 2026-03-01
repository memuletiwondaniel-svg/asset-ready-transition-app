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
 * Includes duplicate prevention to avoid creating multiple tasks.
 */
/**
 * Phase 2 tasks are now auto-created by DB trigger (trg_auto_create_p2a_approval_task)
 * and auto-activated by trigger (trg_auto_activate_p2a_phase2) when all Phase 1 approvers approve.
 * This function is kept as a no-op for backward compatibility with callers.
 */
export async function createPhase2Tasks(_planId: string, _projectId: string, _projectCode: string) {
  // No-op: handled by database triggers
  console.log('[P2A] Phase 2 task creation handled by DB trigger trg_auto_activate_p2a_phase2');
}

/**
 * Transitions the plan status to COMPLETED when all approvers have approved.
 */
export async function checkAndCompletePlan(planId: string) {
  const client = supabase as any;

  const { data: allApprovers } = await client
    .from('p2a_handover_approvers')
    .select('role_name, status')
    .eq('handover_id', planId);

  if (!allApprovers?.length) return false;

  const allApproved = allApprovers.every((a: any) => a.status === 'APPROVED');
  if (allApproved) {
    // Transition plan to COMPLETED
    await client
      .from('p2a_handover_plans')
      .update({ status: 'COMPLETED' })
      .eq('id', planId);

    // Fetch plan details for ORA activity generation
    const { data: plan } = await client
      .from('p2a_handover_plans')
      .select('project_id, project_code')
      .eq('id', planId)
      .single();

    if (plan?.project_id) {
      // Generate VCR activities in the ORA Plan
      try {
        const { generateVCRActivitiesFromP2A } = await import('./useORAActivityPlanSync');
        await generateVCRActivitiesFromP2A(planId, plan.project_id, plan.project_code || '');
      } catch (e) {
        console.error('[P2A] Failed to generate VCR activities:', e);
      }
    }

    return true;
  }
  return false;
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
    checkAndCompletePlan,
    isCreating: createApprovalTasks.isPending,
  };
}
