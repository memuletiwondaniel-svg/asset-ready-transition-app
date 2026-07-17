import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * A user is the "current owner" of a training row when they have an open
 * (pending/in_progress) task for this training. This mirrors the DB-side
 * gate in advance_training_status and drives CTA visibility.
 *
 * Reviewers get a `training_review` task during MATERIALS_UNDER_REVIEW; the
 * owner-driven states use a single owner task authored to the resolved role
 * holder. Both cases are covered by looking at open user_tasks.
 */
export function useTrainingOwnership(trainingId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['training-ownership', trainingId, userId],
    enabled: !!trainingId && !!userId,
    queryFn: async () => {
      if (!trainingId || !userId) return null;
      const client = supabase as any;
      const { data, error } = await client
        .from('user_tasks')
        .select('id, type, status, metadata')
        .eq('source_plan_table', 'p2a_vcr_training')
        .eq('source_plan_id', trainingId)
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress']);
      if (error) throw error;
      const rows = data || [];
      const reviewTask = rows.find((t: any) => t.type === 'training_review') || null;
      const ownerTask = rows.find((t: any) => t.type !== 'training_review') || null;
      return {
        isOwner: !!ownerTask,
        isReviewer: !!reviewTask,
        ownerTaskId: ownerTask?.id ?? null,
        reviewTaskId: reviewTask?.id ?? null,
      };
    },
  });
}
