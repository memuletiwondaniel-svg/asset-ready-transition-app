import { supabase } from '@/integrations/supabase/client';
import type { QueryClient } from '@tanstack/react-query';
import type { UserTask } from '@/hooks/useUserTasks';

/**
 * Auto-promote a To Do user_task to in_progress when the user
 * takes their first recordable action (clicks a primary work CTA
 * or performs a state-changing action). Fire-and-forget.
 *
 * Guards:
 *  - task exists and has an id (backing user_task row)
 *  - current status is pending/todo (never touch in_progress/done/etc.)
 *  - caller must only invoke for action/work tasks, NOT review/approval
 *  - Idempotent: no-op if already in_progress
 */
export function promoteToInProgressIfNeeded(
  task: UserTask | null | undefined,
  queryClient?: QueryClient,
): void {
  if (!task || !task.id) return;
  const status = (task.status || '').toLowerCase();
  if (status !== 'pending' && status !== 'todo') return;

  void (async () => {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .update({ status: 'in_progress' })
        .eq('id', task.id)
        .eq('status', task.status); // idempotency guard at DB level
      if (error) {
        console.warn('[promoteToInProgress] update failed:', error);
        return;
      }
      queryClient?.invalidateQueries({ queryKey: ['user-tasks'] });
    } catch (e) {
      console.warn('[promoteToInProgress] threw:', e);
    }
  })();
}
