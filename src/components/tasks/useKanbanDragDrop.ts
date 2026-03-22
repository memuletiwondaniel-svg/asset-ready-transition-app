import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import type { UnifiedTask } from './useUnifiedTasks';

type KanbanColumn = 'todo' | 'in_progress' | 'waiting' | 'done';

const COLUMN_TO_TASK_STATUS: Record<KanbanColumn, string> = {
  todo: 'pending',
  in_progress: 'in_progress',
  waiting: 'waiting',
  done: 'completed',
};

const COLUMN_TO_ORA_STATUS: Record<KanbanColumn, string> = {
  todo: 'NOT_STARTED',
  in_progress: 'IN_PROGRESS',
  waiting: 'NOT_STARTED',
  done: 'COMPLETED',
};

export type MoveResult = 'moved' | 'blocked' | 'needs_warning' | 'skipped';

/**
 * Check if a task is protected by external approvals (ORA Plan, P2A Plan, ad-hoc review)
 */
function isProtectedWorkflowTask(task: UnifiedTask): boolean {
  return task.isApprovalProtected === true;
}

/**
 * Check if moving a task would void its approvals (moving a protected task backward)
 */
function checkIfApprovalWouldBeVoided(task: UnifiedTask, targetColumn: KanbanColumn): boolean {
  if (!isProtectedWorkflowTask(task)) return false;
  // If moving out of "done" to any other column, approvals would be voided
  if (task.kanbanColumn === 'done' && targetColumn !== 'done') return true;
  return false;
}

export function useKanbanDragDrop() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /**
   * Move a task to a new column, syncing user_tasks + ora_plan_activities.
   * Returns:
   * - 'moved': task was moved successfully
   * - 'blocked': task cannot be moved to "done" (caller should open detail sheet)
   * - 'needs_warning': task is protected and would void approvals (caller should show warning)
   * - 'skipped': no action taken (same column or no userTask)
   */
  const moveTaskToColumn = useCallback(async (
    task: UnifiedTask,
    targetColumn: KanbanColumn,
    forceMove?: boolean, // bypass approval protection check
    voidReason?: string, // mandatory reason when voiding approvals
  ): Promise<MoveResult> => {
    if (task.kanbanColumn === targetColumn) return 'skipped';

    // For "done", we DON'T auto-complete — caller should open the detail sheet
    if (targetColumn === 'done') return 'blocked';

    const userTask = task.userTask;
    if (!userTask) return 'skipped';

    // Check if this move would void approvals (unless forced)
    if (!forceMove && checkIfApprovalWouldBeVoided(task, targetColumn)) {
      return 'needs_warning';
    }

    const meta = userTask.metadata as Record<string, any> | undefined;
    const oraActivityId = meta?.ora_plan_activity_id;

    // Determine if this is a P2A revert (moving P2A task away from done)
    const isP2aTask = meta?.action === 'create_p2a_plan';
    const isP2aRevert = isP2aTask && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo');

    const isOraTask = meta?.action === 'create_ora_plan' || task.userTask?.type === 'ora_plan_creation';
    const isOraRevert = isOraTask && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo');

    // Determine if this is an ad-hoc review revert
    const isAdHocReview = meta?.source === 'task_review';
    const isAdHocRevert = isAdHocReview && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo');

    // Generic revert: any non-workflow task moving from Done back
    const isGenericRevert = !isP2aRevert && !isOraRevert && !isAdHocRevert && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo');

    // Reviewer decision void always maps back to In Progress (DB trigger enforces this)
    const newTaskStatus = isAdHocRevert ? 'in_progress' : isOraRevert ? 'in_progress' : isGenericRevert ? 'in_progress' : COLUMN_TO_TASK_STATUS[targetColumn];

    // ── Optimistic update: patch the cached user-tasks data immediately ──
    const userTasksKey = ['user-tasks', user?.id];

    // Cancel any in-flight refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: userTasksKey });

    const previousData = queryClient.getQueryData(userTasksKey);

    queryClient.setQueryData(userTasksKey, (old: any) => {
      if (!old?.tasks) return old;
      const updated: any = {
        ...old,
        tasks: old.tasks.map((t: any) => {
          if (t.id !== userTask.id) return t;
          const updatedTask = { ...t, status: newTaskStatus };
          // For P2A reverts, also patch metadata so progress resolves to 86%
          if (isP2aRevert && t.metadata) {
            updatedTask.metadata = {
              ...t.metadata,
              plan_status: 'DRAFT',
              completion_percentage: 86,
            };
          }
          // For ORA reverts, patch metadata so progress resolves to 83%
          if (isOraRevert && t.metadata) {
            updatedTask.metadata = {
              ...t.metadata,
              plan_status: 'DRAFT',
              completion_percentage: 83,
            };
          }
          return updatedTask;
        }),
      };
      // Also patch the p2aActivityProgress map if present
      if (isP2aRevert && old.p2aActivityProgress) {
        updated.p2aActivityProgress = {
          ...old.p2aActivityProgress,
          [userTask.id]: 86,
        };
      }
      return updated;
    });

    try {
      // Update user_tasks + ORA plan activity status for standard moves.
      // For ad-hoc review reverts, task_reviewers is the source of truth and trigger handles sync.
      const isRealTaskId = userTask.id && !userTask.id.startsWith('ws-') && !userTask.id.startsWith('ora-');
      if (!isAdHocRevert) {
        if (isRealTaskId) {
          await supabase
            .from('user_tasks')
            .update({ status: newTaskStatus, updated_at: new Date().toISOString() })
            .eq('id', userTask.id);
        }

        // Sync ORA plan activity status if applicable
        if (oraActivityId) {
          const realId = oraActivityId.startsWith('ora-') ? oraActivityId.slice(4)
            : oraActivityId.startsWith('ws-') ? oraActivityId.slice(3)
            : oraActivityId;

          const newOraStatus = COLUMN_TO_ORA_STATUS[targetColumn];
          const isP2aRevert = isP2aTask && task.kanbanColumn === 'done' && targetColumn === 'in_progress';

          // For P2A tasks: when reverting from Done → In Progress, set 86% (6/7 wizard steps).
          // For P2A tasks in any other non-done move, preserve current progress (don't reset to 0).
          // For non-P2A tasks, reset to 0.
          const newCompletion = isP2aRevert ? 86 : undefined;

          const updatePayload: Record<string, any> = { status: newOraStatus };
          if (newCompletion !== undefined) updatePayload.completion_percentage = newCompletion;

          await (supabase as any)
            .from('ora_plan_activities')
            .update(updatePayload)
            .eq('id', realId);
        }
      }

      // ── P2A Plan status revert: when a P2A task is moved back to in_progress or todo,
      // revert the P2A plan to DRAFT and reset approvers so the user can continue editing ──
      const p2aProjectId = meta?.project_id as string | undefined;
      if (isP2aTask && p2aProjectId && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
        const client = supabase as any;
        // Find the P2A plan for this project
        const { data: p2aPlans } = await client
          .from('p2a_handover_plans')
          .select('id, status')
          .eq('project_id', p2aProjectId)
          .limit(1);
        const p2aPlan = p2aPlans?.[0];
        if (p2aPlan && ['ACTIVE', 'COMPLETED', 'APPROVED'].includes(p2aPlan.status)) {
          // Fetch current user profile for revert context
          const { data: { user: currentAuthUser } } = await client.auth.getUser();
          let reverterName = 'Unknown';
          if (currentAuthUser) {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', currentAuthUser.id)
              .single();
            reverterName = profileRow?.full_name || currentAuthUser.email || 'Unknown';
          }

          // Revert plan to DRAFT and persist revert context on plan-level fields
          await client
            .from('p2a_handover_plans')
            .update({
              status: 'DRAFT',
              updated_at: new Date().toISOString(),
              last_rejection_comment: voidReason || 'Reverted to Draft',
              last_rejected_by_name: reverterName,
              last_rejected_by_role: 'Reverted',
              last_rejected_at: new Date().toISOString(),
            })
            .eq('id', p2aPlan.id);
          // Archive decided approver records before resetting (for audit trail)
          const { data: decidedApprovers } = await client
            .from('p2a_handover_approvers')
            .select('id, user_id, role_name, display_order, status, approved_at, comments')
            .eq('handover_id', p2aPlan.id)
            .not('approved_at', 'is', null);
          if (decidedApprovers && decidedApprovers.length > 0) {
            const { data: maxCycleRow } = await client
              .from('p2a_approver_history')
              .select('cycle')
              .eq('handover_id', p2aPlan.id)
              .order('cycle', { ascending: false })
              .limit(1);
            const nextCycle = (maxCycleRow?.[0]?.cycle || 0) + 1;
            const historyRecords = decidedApprovers.map((a: any) => ({
              handover_id: p2aPlan.id,
              original_approver_id: a.id,
              user_id: a.user_id,
              role_name: a.role_name,
              display_order: a.display_order,
              status: a.status,
              approved_at: a.approved_at,
              comments: a.comments,
              cycle: nextCycle,
            }));
            await client.from('p2a_approver_history').insert(historyRecords);
          }

          // Insert a "Reverted to Draft" audit entry
          const { data: { user: currentUser } } = await client.auth.getUser();
          if (currentUser) {
            const { data: maxCycleRow2 } = await client
              .from('p2a_approver_history')
              .select('cycle')
              .eq('handover_id', p2aPlan.id)
              .order('cycle', { ascending: false })
              .limit(1);
            const revertCycle = maxCycleRow2?.[0]?.cycle || 1;
            await client.from('p2a_approver_history').insert({
              handover_id: p2aPlan.id,
              user_id: currentUser.id,
              role_name: 'Submitter',
              status: 'REVERTED',
              comments: voidReason || null,
              cycle: revertCycle,
              approved_at: new Date().toISOString(),
            });
          }

          // Reset all approvers to PENDING (correct column: handover_id)
          await client
            .from('p2a_handover_approvers')
            .update({ status: 'PENDING', approved_at: null, comments: null })
            .eq('handover_id', p2aPlan.id);

          // Reset the user_task metadata to clear submitted plan_status
          if (isRealTaskId) {
            const { data: taskRow } = await supabase
              .from('user_tasks')
              .select('metadata')
              .eq('id', userTask.id)
              .single();
            if (taskRow) {
              const currentMeta = (taskRow.metadata as Record<string, any>) || {};
              await supabase
                .from('user_tasks')
                .update({
                  metadata: {
                    ...currentMeta,
                    plan_status: 'DRAFT',
                    completion_percentage: 86,
                  } as any,
                })
                .eq('id', userTask.id);
            }
          }

          // Also reset the ora_plan_activities P2A-01 row
          if (oraActivityId) {
            const realId = oraActivityId.startsWith('ora-') ? oraActivityId.slice(4)
              : oraActivityId.startsWith('ws-') ? oraActivityId.slice(3)
              : oraActivityId;
            await client
              .from('ora_plan_activities')
              .update({ status: 'IN_PROGRESS', completion_percentage: 86 })
              .eq('id', realId);
          }

          // ── Cascade rollback: undo approval cascade artifacts ──

          // Step 1: Delete approver review tasks from reviewers' Kanban boards
          try {
            await client
              .from('user_tasks')
              .delete()
              .eq('type', 'p2a_approval')
              .filter('metadata->>plan_id', 'eq', p2aPlan.id);
            console.log('[P2A Revert] Deleted approver review tasks');
          } catch (e) {
            console.error('[P2A Revert] Failed to delete approver tasks:', e);
          }

          // Step 2: Delete VCR Gantt activities and linked VCR delivery plan tasks
          try {
            // Find ORP plan for this project
            const { data: orpPlans } = await client
              .from('orp_plans')
              .select('id')
              .eq('project_id', p2aProjectId)
              .limit(1);

            if (orpPlans?.[0]) {
              // Delete linked VCR delivery plan user tasks
              await client
                .from('user_tasks')
                .delete()
                .eq('type', 'vcr_delivery_plan')
                .filter('metadata->>plan_id', 'eq', p2aPlan.id);

              // Delete child activities first (vcr_delivery_plan), then parents (p2a_vcr)
              await client
                .from('ora_plan_activities')
                .delete()
                .eq('orp_plan_id', orpPlans[0].id)
                .eq('source_type', 'vcr_delivery_plan');

              await client
                .from('ora_plan_activities')
                .delete()
                .eq('orp_plan_id', orpPlans[0].id)
                .eq('source_type', 'p2a_vcr');

              console.log('[P2A Revert] Deleted VCR Gantt activities and delivery plan tasks');
            }
          } catch (e) {
            console.error('[P2A Revert] Failed to delete VCR activities:', e);
          }

          // Step 3: Delete the ORI p2a_approval snapshot
          try {
            await client
              .from('ori_scores')
              .delete()
              .eq('project_id', p2aProjectId)
              .eq('snapshot_type', 'p2a_approval');
            console.log('[P2A Revert] Deleted ORI p2a_approval snapshot');
          } catch (e) {
            console.error('[P2A Revert] Failed to delete ORI snapshot:', e);
          }

          // Step 4: Delete p2a_plan_approved notifications
          try {
            await client
              .from('p2a_notifications')
              .delete()
              .eq('handover_id', p2aPlan.id)
              .eq('notification_type', 'p2a_plan_approved');
            console.log('[P2A Revert] Deleted approval notifications');
          } catch (e) {
            console.error('[P2A Revert] Failed to delete notifications:', e);
          }

          // Invalidate P2A-related queries so sheets/detail views pick up the DRAFT status + revert context
          queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-sheet'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-task'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-plan-by-project'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-rejection-context'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-draft-context-sheet'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-draft-context-task'] });
          queryClient.invalidateQueries({ queryKey: ['ora-activity-detail'] });
          queryClient.invalidateQueries({ queryKey: ['ori-scores'] });
          queryClient.invalidateQueries({ queryKey: ['ori-score-latest'] });
          queryClient.invalidateQueries({ queryKey: ['ori-scores-all-projects'] });
          queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
          queryClient.invalidateQueries({ queryKey: ['vcr-delivery-plans'] });

          // Force refresh user-tasks query so p2aActivityProgress picks up the
          // updated completion_percentage (86%) from ora_plan_activities.
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });

          toast.info('P2A Plan reverted to Draft — approvals and cascade artifacts have been reset');
        }
      }

      // ── ORA Plan revert: when an ORA task is moved back to in_progress or todo,
      // revert the ORA plan to DRAFT, archive approvers, and reset progress ──
      const oraProjectId = meta?.project_id as string | undefined;
      if (isOraTask && oraProjectId && (targetColumn === 'in_progress' || targetColumn === 'todo')) {
        const client = supabase as any;
        // Find the ORA plan for this project
        const { data: orpPlans } = await client
          .from('orp_plans')
          .select('id, status')
          .eq('project_id', oraProjectId)
          .limit(1);
        const orpPlan = orpPlans?.[0];
        if (orpPlan && ['PENDING_APPROVAL', 'APPROVED', 'COMPLETED'].includes(orpPlan.status)) {
          // Revert plan to DRAFT
          await client
            .from('orp_plans')
            .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
            .eq('id', orpPlan.id);

          // Archive decided approver records (for audit trail)
          const { data: decidedApprovers } = await client
            .from('orp_approvals')
            .select('id, approver_user_id, approver_role, status, approved_at, comments')
            .eq('orp_plan_id', orpPlan.id)
            .not('approved_at', 'is', null);

          if (decidedApprovers && decidedApprovers.length > 0) {
            const { data: maxCycleRow } = await client
              .from('orp_approval_history')
              .select('cycle')
              .eq('orp_plan_id', orpPlan.id)
              .order('cycle', { ascending: false })
              .limit(1);
            const nextCycle = (maxCycleRow?.[0]?.cycle || 0) + 1;
            const historyRecords = decidedApprovers.map((a: any) => ({
              orp_plan_id: orpPlan.id,
              original_approval_id: a.id,
              user_id: a.approver_user_id,
              role_name: a.approver_role,
              status: a.status,
              approved_at: a.approved_at,
              comments: a.comments,
              cycle: nextCycle,
            }));
            await client.from('orp_approval_history').insert(historyRecords);
          }

          // Insert a "Reverted to Draft" audit entry
          const { data: { user: currentUser } } = await client.auth.getUser();
          if (currentUser) {
            const { data: maxCycleRow2 } = await client
              .from('orp_approval_history')
              .select('cycle')
              .eq('orp_plan_id', orpPlan.id)
              .order('cycle', { ascending: false })
              .limit(1);
            const revertCycle = maxCycleRow2?.[0]?.cycle || 1;
            await client.from('orp_approval_history').insert({
              orp_plan_id: orpPlan.id,
              user_id: currentUser.id,
              role_name: 'Submitter',
              status: 'REVERTED',
              comments: voidReason || null,
              cycle: revertCycle,
              approved_at: new Date().toISOString(),
            });
          }

          // Reset all approvers to PENDING
          await client
            .from('orp_approvals')
            .update({ status: 'PENDING', approved_at: null, comments: null })
            .eq('orp_plan_id', orpPlan.id);

          // Reset the user_task metadata
          if (isRealTaskId) {
            const { data: taskRow } = await supabase
              .from('user_tasks')
              .select('metadata')
              .eq('id', userTask.id)
              .single();
            if (taskRow) {
              const currentMeta = (taskRow.metadata as Record<string, any>) || {};
              await supabase
                .from('user_tasks')
                .update({
                  metadata: {
                    ...currentMeta,
                    plan_status: 'DRAFT',
                    completion_percentage: 83,
                  } as any,
                })
                .eq('id', userTask.id);
            }
          }

          // Invalidate ORA-related queries
          queryClient.invalidateQueries({ queryKey: ['ora-plan-exists'] });
          queryClient.invalidateQueries({ queryKey: ['ora-rejection-info-task'] });
          queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
          queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });

          toast.info('ORA Plan reverted to Draft — approvals have been reset');
        }
      }

      // ── Ad-hoc review revert: void the reviewer's decision ──
      if (isAdHocRevert) {
        const taskReviewerId = meta?.task_reviewer_id as string | undefined;
        const sourceTaskId = meta?.source_task_id as string | undefined;
        if (!taskReviewerId) {
          throw new Error('Missing reviewer assignment on task metadata');
        }

        if (!user?.id) {
          throw new Error('Not authenticated');
        }

        const client = supabase as any;
        const { data: updatedReviewer, error: reviewerError } = await client
          .from('task_reviewers')
          .update({
            status: 'PENDING',
            decided_at: null,
            comments: null,
          })
          .eq('id', taskReviewerId)
          .eq('user_id', user.id)
          .select('id, status')
          .maybeSingle();

        if (reviewerError) throw reviewerError;
        if (!updatedReviewer) {
          throw new Error('Could not void reviewer decision');
        }

        // Log the void reason as a comment for audit trail
        if (voidReason && sourceTaskId) {
          await client.from('task_comments').insert({
            task_id: sourceTaskId,
            user_id: user.id,
            comment: `⚠️ Decision voided — ${voidReason}`,
            comment_type: 'reviewer_void',
          });
        }

        // Invalidate all relevant caches — trigger handles the DB writes
        queryClient.invalidateQueries({ queryKey: ['task-reviewers', sourceTaskId] });
        queryClient.invalidateQueries({ queryKey: ['task-reviewers-summary'] });
        queryClient.invalidateQueries({ queryKey: ['task-comments', sourceTaskId] });
        if (userTask.id) {
          queryClient.invalidateQueries({ queryKey: ['task-comments', userTask.id] });
        }
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });

        toast.info('Review decision voided — you can review again');
      }

      // ── Generic revert: use reopen_task RPC for audit trail ──
      if (isGenericRevert && voidReason) {
        const isRealTaskId = userTask.id && !userTask.id.startsWith('ws-') && !userTask.id.startsWith('ora-');
        if (isRealTaskId) {
          const client = supabase as any;
          await client.rpc('reopen_task', {
            p_task_id: userTask.id,
            p_reason: voidReason,
          });
          // Invalidate all reviewer-related caches so approver trays update
          queryClient.invalidateQueries({ queryKey: ['task-comments', userTask.id] });
          queryClient.invalidateQueries({ queryKey: ['task-reviewers', userTask.id] });
          queryClient.invalidateQueries({ queryKey: ['task-reviewers-summary'] });
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        }
      }

      // Don't invalidate ['user-tasks'] or ['user-orp-activities'] here — the realtime
      // subscription will handle the refetch after the DB settles. Invalidating immediately
      // causes a race condition where the GET returns stale data and overwrites our optimistic update.
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });

      const labels: Record<string, string> = {
        todo: 'To Do',
        in_progress: 'In Progress',
        waiting: 'Waiting',
      };
      const toastColumn = isAdHocRevert ? 'in_progress' : targetColumn;
      toast.success(`Task moved to ${labels[toastColumn]}`);
      return 'moved';
    } catch (err) {
      console.error('Failed to move task:', err);
      // Rollback optimistic update
      queryClient.setQueryData(userTasksKey, previousData);
      toast.error('Failed to move task');
      return 'skipped';
    }
  }, [queryClient, user?.id]);

  return { moveTaskToColumn, isProtectedWorkflowTask, checkIfApprovalWouldBeVoided };
}
