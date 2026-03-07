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

export function useKanbanDragDrop() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /**
   * Move a task to a new column, syncing user_tasks + ora_plan_activities.
   * Returns true if the move was applied, false if it should be handled externally (e.g. "done" column).
   */
  const moveTaskToColumn = useCallback(async (
    task: UnifiedTask,
    targetColumn: KanbanColumn,
  ): Promise<boolean> => {
    if (task.kanbanColumn === targetColumn) return false;

    // For "done", we DON'T auto-complete — caller should open the detail sheet
    if (targetColumn === 'done') return false;

    const userTask = task.userTask;
    if (!userTask) return false;

    const newTaskStatus = COLUMN_TO_TASK_STATUS[targetColumn];
    const meta = userTask.metadata as Record<string, any> | undefined;
    const oraActivityId = meta?.ora_plan_activity_id;

    // ── Optimistic update: patch the cached user-tasks data immediately ──
    const userTasksKey = ['user-tasks', user?.id];

    // Cancel any in-flight refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: userTasksKey });

    const previousData = queryClient.getQueryData(userTasksKey);

    queryClient.setQueryData(userTasksKey, (old: any) => {
      if (!old?.tasks) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: any) =>
          t.id === userTask.id ? { ...t, status: newTaskStatus } : t
        ),
      };
    });

    try {
      // Update user_tasks status
      const isRealTaskId = userTask.id && !userTask.id.startsWith('ws-') && !userTask.id.startsWith('ora-');
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
        await (supabase as any)
          .from('ora_plan_activities')
          .update({
            status: newOraStatus,
            completion_percentage: 0,
          })
          .eq('id', realId);
      }

      // Don't invalidate ['user-tasks'] here — the realtime subscription in useUserTasks
      // will handle the refetch after the DB settles. Invalidating immediately causes a
      // race condition where the GET returns stale data and overwrites our optimistic update.
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });
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
      return true;
    } catch (err) {
      console.error('Failed to move task:', err);
      // Rollback optimistic update
      queryClient.setQueryData(userTasksKey, previousData);
      toast.error('Failed to move task');
      return false;
    }
  }, [queryClient, user?.id]);

  return { moveTaskToColumn };
}
