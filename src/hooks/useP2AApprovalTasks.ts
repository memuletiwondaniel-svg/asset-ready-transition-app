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
 * Full cascade: status → COMPLETED, EXE-10 → 100%, VCR activities generated,
 * notifications sent, ORI snapshot created.
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
    console.log('[P2A Cascade] All approvers approved. Starting full approval cascade for plan:', planId);

    // 1. Transition plan to COMPLETED
    await client
      .from('p2a_handover_plans')
      .update({ status: 'COMPLETED' })
      .eq('id', planId);

    // Fetch plan details for downstream operations
    const { data: plan } = await client
      .from('p2a_handover_plans')
      .select('project_id, project_code, created_by, name')
      .eq('id', planId)
      .single();

    if (plan?.project_id) {
      // 2. Set the P2A activity (EXE-10) to 100% COMPLETED
      try {
        const { data: orpPlans } = await client
          .from('orp_plans')
          .select('id')
          .eq('project_id', plan.project_id)
          .limit(1);

        if (orpPlans?.[0]) {
          const { data: activities } = await client
            .from('ora_plan_activities')
            .select('id, task_id, activity_code, name')
            .eq('orp_plan_id', orpPlans[0].id);

          const p2aActivity = activities?.find((a: any) => a.activity_code === 'EXE-10' || a.activity_code === 'P2A-01')
            || activities?.find((a: any) => a.name?.toLowerCase().includes('p2a plan'))
            || activities?.find((a: any) => a.name?.toLowerCase().includes('p2a'));

          if (p2aActivity) {
            await client
              .from('ora_plan_activities')
              .update({
                completion_percentage: 100,
                status: 'COMPLETED',
                end_date: new Date().toISOString().split('T')[0],
              })
              .eq('id', p2aActivity.id);

            // Update linked user_task metadata
            if (p2aActivity.task_id) {
              const { data: taskRow } = await client
                .from('user_tasks')
                .select('metadata')
                .eq('id', p2aActivity.task_id)
                .single();

              await client
                .from('user_tasks')
                .update({
                  metadata: {
                    ...((taskRow?.metadata as Record<string, any>) || {}),
                    completion_percentage: 100,
                    plan_status: 'COMPLETED',
                  },
                })
                .eq('id', p2aActivity.task_id);
            }
          }

          // Also update standalone P2A tasks
          const { data: allTasks } = await client
            .from('user_tasks')
            .select('id, metadata')
            .limit(100);

          const p2aTask = allTasks?.find((t: any) => {
            const meta = t.metadata as Record<string, any>;
            return meta?.action === 'create_p2a_plan' && meta?.project_id === plan.project_id;
          });

          if (p2aTask) {
            await client
              .from('user_tasks')
              .update({
                metadata: {
                  ...((p2aTask.metadata as Record<string, any>) || {}),
                  completion_percentage: 100,
                  plan_status: 'COMPLETED',
                },
              })
              .eq('id', p2aTask.id);
          }
        }
      } catch (e) {
        console.error('[P2A Cascade] Failed to update P2A activity to 100%:', e);
      }

      // 3. Generate VCR activities in the ORA Plan (Gantt chart)
      try {
        const { generateVCRActivitiesFromP2A } = await import('./useORAActivityPlanSync');
        await generateVCRActivitiesFromP2A(planId, plan.project_id, plan.project_code || '');
        console.log('[P2A Cascade] VCR activities generated in Gantt chart');
      } catch (e) {
        console.error('[P2A Cascade] Failed to generate VCR activities:', e);
      }

      // 4. Send notifications to the plan author and project stakeholders
      try {
        await sendP2AApprovalNotifications(client, planId, plan);
        console.log('[P2A Cascade] Notifications sent');
      } catch (e) {
        console.error('[P2A Cascade] Failed to send notifications:', e);
      }

      // 5. Create ORI score snapshot for the project
      try {
        await createORISnapshot(client, plan.project_id);
        console.log('[P2A Cascade] ORI snapshot created');
      } catch (e) {
        console.error('[P2A Cascade] Failed to create ORI snapshot:', e);
      }
    }

    return true;
  }
  return false;
}

/**
 * Sends notifications when a P2A plan is fully approved.
 * Notifies: plan author, approvers, and VCR delivery plan assignees.
 */
async function sendP2AApprovalNotifications(
  client: any,
  planId: string,
  plan: { project_id: string; project_code: string | null; created_by: string | null; name: string | null }
) {
  const { data: { user } } = await supabase.auth.getUser();
  const senderId = user?.id || null;
  const planName = plan.name || 'P2A Handover Plan';
  const projectCode = plan.project_code || '';
  const title = `P2A Plan Approved – ${projectCode}`;
  const message = `The P2A Handover Plan "${planName}" for project ${projectCode} has been fully approved by all reviewers. VCR Delivery Plan tasks have been generated and assigned.`;

  const recipientIds = new Set<string>();

  // Notify the plan author
  if (plan.created_by) {
    recipientIds.add(plan.created_by);
  }

  // Notify VCR delivery plan assignees (Snr ORA Engineers)
  const { data: vcrTasks } = await client
    .from('user_tasks')
    .select('user_id')
    .eq('type', 'vcr_delivery_plan')
    .filter('metadata->>plan_id', 'eq', planId);

  if (vcrTasks) {
    for (const t of vcrTasks) {
      if (t.user_id) recipientIds.add(t.user_id);
    }
  }

  // Build notification records
  const notifications = Array.from(recipientIds).map(recipientUserId => ({
    handover_id: planId,
    recipient_user_id: recipientUserId,
    sender_user_id: senderId,
    notification_type: 'p2a_plan_approved',
    title,
    message,
    read: false,
  }));

  if (notifications.length > 0) {
    await client.from('p2a_notifications').insert(notifications);
  }
}

/**
 * Creates an ORI score snapshot after P2A approval.
 * Records the P2A module as fully complete in the project's readiness index.
 */
async function createORISnapshot(client: any, projectId: string) {
  const { data: { user } } = await supabase.auth.getUser();

  // Calculate basic module scores based on current ORA activity progress
  const { data: orpPlans } = await client
    .from('orp_plans')
    .select('id')
    .eq('project_id', projectId)
    .limit(1);

  if (!orpPlans?.[0]) return;

  const { data: activities } = await client
    .from('ora_plan_activities')
    .select('completion_percentage, status, source_type')
    .eq('orp_plan_id', orpPlans[0].id);

  if (!activities?.length) return;

  // Calculate overall progress across all activities
  const totalActivities = activities.length;
  const totalProgress = activities.reduce((sum: number, a: any) => sum + (a.completion_percentage || 0), 0);
  const overallScore = Math.round(totalProgress / totalActivities);

  // Break down by source type for module scores
  const moduleGroups: Record<string, number[]> = {};
  for (const a of activities) {
    const key = a.source_type || 'general';
    if (!moduleGroups[key]) moduleGroups[key] = [];
    moduleGroups[key].push(a.completion_percentage || 0);
  }

  const moduleScores: Record<string, number> = {};
  for (const [key, values] of Object.entries(moduleGroups)) {
    moduleScores[key] = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  }

  // Ensure P2A module is at 100%
  moduleScores['p2a_handover'] = 100;

  const completedCount = activities.filter((a: any) => a.status === 'COMPLETED').length;
  const atRiskCount = activities.filter((a: any) => a.status === 'AT_RISK').length;
  const blockedCount = activities.filter((a: any) => a.status === 'BLOCKED').length;

  await client.from('ori_scores').insert({
    project_id: projectId,
    overall_score: overallScore,
    module_scores: moduleScores,
    snapshot_type: 'p2a_approval',
    calculated_by: user?.id || null,
    node_count: totalActivities,
    completed_count: completedCount,
    at_risk_count: atRiskCount,
    blocked_count: blockedCount,
    notes: 'Auto-generated snapshot after P2A Plan approval',
  });
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
