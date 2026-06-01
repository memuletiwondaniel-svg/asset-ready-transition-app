/**
 * Shared, pure queries against `user_tasks` for the ORA workflow surface.
 *
 * Single source of truth for the SELECT shape that both the production hooks
 * (useUserTasks / My Tasks / Gantt) and the M11 harness's cross-cutting A
 * scenario must read. If these queries change, both reads change together —
 * the cross-cutting A scenario can no longer pass by reading something the
 * UI doesn't.
 *
 * NOTE on the M11 edge function: Deno edge functions can't import from
 * `src/`. The harness scenarios mirror these SELECTs literally; the
 * convention is "edit one, edit the other, the linter step in the harness
 * verifies projection parity".
 */
import { supabase } from '@/integrations/supabase/client';

export interface OraWorkflowTaskRow {
  id: string;
  user_id: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

const SELECT = 'id, user_id, title, status, type, priority, metadata, created_at';

/** All ora_workflow-sourced tasks for a project (any plan, any action). */
export async function listOraWorkflowTasksForProject(
  projectId: string,
): Promise<OraWorkflowTaskRow[]> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select(SELECT)
    .filter('metadata->>source', 'eq', 'ora_workflow')
    .filter('metadata->>project_id', 'eq', projectId);
  if (error) throw error;
  return (data ?? []) as OraWorkflowTaskRow[];
}

/** Tasks for a single action verb (e.g. 'create_ora_plan', 'complete_ora_activity'). */
export async function listOraTasksByAction(
  projectId: string,
  action: string,
): Promise<OraWorkflowTaskRow[]> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select(SELECT)
    .filter('metadata->>source', 'eq', 'ora_workflow')
    .filter('metadata->>project_id', 'eq', projectId)
    .filter('metadata->>action', 'eq', action);
  if (error) throw error;
  return (data ?? []) as OraWorkflowTaskRow[];
}
