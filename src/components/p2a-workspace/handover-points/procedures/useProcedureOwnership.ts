import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * A user is the current owner of a procedure row when they have an open
 * (pending/in_progress) user_tasks row for it — mirrors the DB-side gate
 * in advance_procedure_status. Reviewers get a `procedure_review` task
 * during UNDER_REVIEW; the owner-driven states (NOT_STARTED / DRAFT /
 * REWORK_REQUESTED) get a single `procedure_action` task on the resolved
 * author.
 */
export function useProcedureOwnership(procedureId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['procedure-ownership', procedureId, userId],
    enabled: !!procedureId && !!userId,
    queryFn: async () => {
      if (!procedureId || !userId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from('user_tasks')
        .select('id, type, status, metadata')
        .eq('source_plan_table', 'p2a_vcr_procedures')
        .eq('source_plan_id', procedureId)
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress']);
      if (error) throw error;
      const rows = data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reviewTask = rows.find((t: any) => t.type === 'procedure_review') || null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ownerTask = rows.find((t: any) => t.type === 'procedure_action') || null;
      return {
        isOwner: !!ownerTask,
        isReviewer: !!reviewTask,
        ownerTaskId: ownerTask?.id ?? null,
        reviewTaskId: reviewTask?.id ?? null,
      };
    },
  });
}
