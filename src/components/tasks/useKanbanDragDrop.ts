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

export type MoveResult = 'moved' | 'blocked' | 'needs_warning' | 'skipped' | 'stale';

/**
 * Check if a task is protected by external approvals (ORA Plan, P2A Plan, ad-hoc review)
 */
function isProtectedWorkflowTask(task: UnifiedTask): boolean {
  return task.isApprovalProtected === true;
}

/**
 * Check if moving a task would void its approvals (moving a protected task backward).
 * Kept for backwards compatibility with callers that want a pre-check; the RPC
 * also enforces this server-side and returns 'needs_warning' when appropriate.
 */
function checkIfApprovalWouldBeVoided(task: UnifiedTask, targetColumn: KanbanColumn): boolean {
  if (!isProtectedWorkflowTask(task)) return false;
  if (task.kanbanColumn === 'done' && targetColumn !== 'done') return true;
  return false;
}

export function useKanbanDragDrop() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /**
   * Move a task to a new column via the server-side RPC `move_task_to_column`.
   * The RPC owns the entire cascade (user_tasks, ora_plan_activities, p2a_*,
   * orp_*, ori_scores, p2a_notifications, task_reviewers, reopen_task) in one
   * transaction.
   *
   * Returns:
   * - 'moved': task moved successfully
   * - 'blocked': cannot move to "done" via DnD (caller opens detail sheet)
   * - 'needs_warning': protected task — caller shows void-warning dialog
   * - 'stale': server rejected because client state was out of date
   * - 'skipped': no-op (same column / no userTask / virtual id)
   */
  const moveTaskToColumn = useCallback(async (
    task: UnifiedTask,
    targetColumn: KanbanColumn,
    forceMove?: boolean,
    voidReason?: string,
  ): Promise<MoveResult> => {
    // Pure client UX guards (no DB)
    if (task.kanbanColumn === targetColumn) return 'skipped';
    if (targetColumn === 'done') return 'blocked';

    const userTask = task.userTask;
    if (!userTask) return 'skipped';

    // Virtual ids never hit the DB
    const isRealTaskId = userTask.id && !userTask.id.startsWith('ws-') && !userTask.id.startsWith('ora-');
    if (!isRealTaskId) return 'skipped';

    const meta = userTask.metadata as Record<string, any> | undefined;
    const isP2aTask = meta?.action === 'create_p2a_plan';
    const isOraTask = meta?.action === 'create_ora_plan' || userTask?.type === 'ora_plan_creation';
    const isP2aRevert = isP2aTask && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo');
    const isOraRevert = isOraTask && task.kanbanColumn === 'done' && (targetColumn === 'in_progress' || targetColumn === 'todo');

    // Expected current status for stale-guard
    const expectedStatus = (task.kanbanColumn && COLUMN_TO_TASK_STATUS[task.kanbanColumn as KanbanColumn])
      || userTask.status
      || null;

    // ── Optimistic update ──
    const userTasksKey = ['user-tasks', user?.id];
    await queryClient.cancelQueries({ queryKey: userTasksKey });
    const previousData = queryClient.getQueryData(userTasksKey);

    const optimisticStatus = COLUMN_TO_TASK_STATUS[targetColumn];
    queryClient.setQueryData(userTasksKey, (old: any) => {
      if (!old?.tasks) return old;
      const updated: any = {
        ...old,
        tasks: old.tasks.map((t: any) => {
          if (t.id !== userTask.id) return t;
          const updatedTask = { ...t, status: optimisticStatus };
          if (isP2aRevert && t.metadata) {
            updatedTask.metadata = { ...t.metadata, plan_status: 'DRAFT', completion_percentage: 86 };
          }
          if (isOraRevert && t.metadata) {
            updatedTask.metadata = { ...t.metadata, plan_status: 'DRAFT', completion_percentage: 83 };
          }
          return updatedTask;
        }),
      };
      if (isP2aRevert && old.p2aActivityProgress) {
        updated.p2aActivityProgress = { ...old.p2aActivityProgress, [userTask.id]: 86 };
      }
      return updated;
    });

    const rollback = () => queryClient.setQueryData(userTasksKey, previousData);

    try {
      const { data, error } = await (supabase as any).rpc('move_task_to_column', {
        p_task_id: userTask.id,
        p_target_column: targetColumn,
        p_force: forceMove ?? false,
        p_void_reason: voidReason ?? null,
        p_expected_status: expectedStatus,
        p_is_protected: isProtectedWorkflowTask(task),
      });

      if (error) throw error;

      const result = (data?.result ?? 'skipped') as MoveResult;

      // Shared invalidations for any cascade branch
      const invalidateCascade = () => {
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
        queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
        queryClient.invalidateQueries({ queryKey: ['orp-plan-details'] });
        queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
        queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
        queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-sheet'] });
        queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-task'] });
        queryClient.invalidateQueries({ queryKey: ['p2a-plan-by-project'] });
        queryClient.invalidateQueries({ queryKey: ['p2a-rejection-context'] });
        queryClient.invalidateQueries({ queryKey: ['p2a-draft-context-sheet'] });
        queryClient.invalidateQueries({ queryKey: ['p2a-draft-context-task'] });
        queryClient.invalidateQueries({ queryKey: ['ora-plan-exists'] });
        queryClient.invalidateQueries({ queryKey: ['ora-rejection-info-task'] });
        queryClient.invalidateQueries({ queryKey: ['ora-activity-detail'] });
        queryClient.invalidateQueries({ queryKey: ['ori-scores'] });
        queryClient.invalidateQueries({ queryKey: ['ori-score-latest'] });
        queryClient.invalidateQueries({ queryKey: ['ori-scores-all-projects'] });
        queryClient.invalidateQueries({ queryKey: ['vcr-delivery-plans'] });
        queryClient.invalidateQueries({ queryKey: ['task-reviewers-summary'] });
        if (userTask.id) {
          queryClient.invalidateQueries({ queryKey: ['task-reviewers', userTask.id] });
          queryClient.invalidateQueries({ queryKey: ['task-comments', userTask.id] });
        }
        const sourceTaskId = meta?.source_task_id as string | undefined;
        if (sourceTaskId) {
          queryClient.invalidateQueries({ queryKey: ['task-reviewers', sourceTaskId] });
          queryClient.invalidateQueries({ queryKey: ['task-comments', sourceTaskId] });
        }
      };

      switch (result) {
        case 'moved': {
          invalidateCascade();
          const labels: Record<string, string> = {
            todo: 'To Do',
            in_progress: 'In Progress',
            waiting: 'Waiting',
          };
          if (isP2aRevert) {
            toast.info('P2A Plan reverted to Draft — approvals and cascade artifacts have been reset');
          } else if (isOraRevert) {
            toast.info('ORA Plan reverted to Draft — approvals have been reset');
          } else {
            toast.success(`Task moved to ${labels[targetColumn] ?? targetColumn}`);
          }
          return 'moved';
        }
        case 'blocked':
          rollback();
          return 'blocked';
        case 'needs_warning':
          rollback();
          return 'needs_warning';
        case 'stale':
          rollback();
          toast.message('Task changed, please retry');
          return 'stale';
        case 'skipped':
        default:
          rollback();
          return 'skipped';
      }
    } catch (err) {
      console.error('Failed to move task:', err);
      rollback();
      toast.error('Failed to move task');
      return 'skipped';
    }
  }, [queryClient, user?.id]);

  return { moveTaskToColumn, isProtectedWorkflowTask, checkIfApprovalWouldBeVoided };
}
