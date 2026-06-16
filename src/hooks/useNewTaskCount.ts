import { useMemo } from 'react';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { useUnifiedTasks } from '@/components/tasks/useUnifiedTasks';

/**
 * Returns the count of "new" actionable tasks across ALL sources that feed My Tasks
 * (user_tasks, PSSR reviews, P2A approvals, ORA workflow, OWL, bundle tasks,
 *  VCR plan approvals). A task is "new" when its created/assigned timestamp is
 *  after the user's prior last_login_at (snapshot captured by useUserLastLogin).
 *
 * Excluded from "new":
 *  - tasks already in the `done` kanban column (closed/approved/completed)
 *  - VCR plan-approval rows (v_vcr_plan_approver_tasks has no per-row created_at;
 *    we never mark them "new" to avoid false positives)
 *
 * De-duplication is inherited from useUnifiedTasks (P2A approval cycles + parent/child
 * collapse + PSSR/plan_id guards), so identical tasks aren't double-counted.
 */
export const useNewTaskCount = (): number => {
  const { user } = useAuth();
  const { allTasks } = useUnifiedTasks(user?.id || '');

  return useMemo(() => {
    if (!user?.id) return 0;
    let count = 0;
    const walk = (list: typeof allTasks) => {
      for (const t of list) {
        if (t.isNew && t.kanbanColumn !== 'done') count += 1;
        if (t.children?.length) walk(t.children);
      }
    };
    walk(allTasks);
    return count;
  }, [allTasks, user?.id]);
};
