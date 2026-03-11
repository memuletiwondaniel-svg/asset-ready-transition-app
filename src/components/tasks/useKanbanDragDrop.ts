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
 * Check if a task is protected by external approvals (ORA Plan, P2A Plan)
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

    const newTaskStatus = COLUMN_TO_TASK_STATUS[targetColumn];
    const meta = userTask.metadata as Record<string, any> | undefined;
    const oraActivityId = meta?.ora_plan_activity_id;

    // ── Optimistic update: patch the cached user-tasks data immediately ──
    const userTasksKey = ['user-tasks', user?.id];

    // Cancel any in-flight refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: userTasksKey });

    const previousData = queryClient.getQueryData(userTasksKey);

    // Determine if this is a P2A revert (moving P2A task away from done)
    const isP2aTask = meta?.action === 'create_p2a_plan';
    const isP2aRevert = isP2aTask && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo' || targetColumn === 'waiting');

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
      // Update user_tasks status
      const isRealTaskId = userTask.id && !userTask.id.startsWith('ws-') && !userTask.id.startsWith('ora-');
      if (isRealTaskId) {
        const { error: taskErr } = await supabase
          .from('user_tasks')
          .update({ status: newTaskStatus, updated_at: new Date().toISOString() })
          .eq('id', userTask.id);
        if (taskErr) console.error('[KanbanDrag] user_tasks update failed:', taskErr);
      }

      // Sync ORA plan activity status if applicable
      if (oraActivityId) {
        const realId = oraActivityId.startsWith('ora-') ? oraActivityId.slice(4)
          : oraActivityId.startsWith('ws-') ? oraActivityId.slice(3)
          : oraActivityId;

        const newOraStatus = COLUMN_TO_ORA_STATUS[targetColumn];

        // For P2A tasks: when reverting from Done, set 86% (6/7 wizard steps).
        // For P2A tasks in any other non-done move, preserve current progress (don't reset to 0).
        // For non-P2A tasks, reset to 0.
        const newCompletion = isP2aRevert ? 86 : (isP2aTask ? undefined : 0);

        const updatePayload: Record<string, any> = { status: newOraStatus };
        if (newCompletion !== undefined) updatePayload.completion_percentage = newCompletion;

        const { error: oraErr } = await (supabase as any)
          .from('ora_plan_activities')
          .update(updatePayload)
          .eq('id', realId);
        if (oraErr) console.error('[KanbanDrag] ora_plan_activities update failed:', oraErr);
      }

      // ── P2A Plan status revert: when a P2A task is moved back to in_progress or todo,
      // revert the P2A plan to DRAFT and reset approvers so the user can continue editing ──
      const p2aProjectId = meta?.project_id as string | undefined;
      if (isP2aTask && p2aProjectId && (targetColumn === 'in_progress' || targetColumn === 'todo' || targetColumn === 'waiting')) {
        const client = supabase as any;
        // Find the P2A plan for this project
        const { data: p2aPlans } = await client
          .from('p2a_handover_plans')
          .select('id, status')
          .eq('project_id', p2aProjectId)
          .limit(1);
        const p2aPlan = p2aPlans?.[0];
        if (p2aPlan && ['ACTIVE', 'COMPLETED', 'APPROVED'].includes(p2aPlan.status)) {
          // Revert plan to DRAFT
          await client
            .from('p2a_handover_plans')
            .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
            .eq('id', p2aPlan.id);
          // Reset all approvers to PENDING (correct column: handover_id)
          await client
            .from('p2a_handover_approvers')
            .update({ status: 'PENDING', approved_at: null })
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

          // Invalidate P2A-related queries so sheets/detail views pick up the DRAFT status
          queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-sheet'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-task'] });
          queryClient.invalidateQueries({ queryKey: ['p2a-plan-by-project'] });
          queryClient.invalidateQueries({ queryKey: ['ora-activity-detail'] });

          // Force refresh user-tasks query so p2aActivityProgress picks up the
          // updated completion_percentage (86%) from ora_plan_activities.
          queryClient.invalidateQueries({ queryKey: ['user-tasks'] });

          toast.info('P2A Plan reverted to Draft — approvals have been reset');
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
      toast.success(`Task moved to ${labels[targetColumn]}`);
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
