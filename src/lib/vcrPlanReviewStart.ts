import { supabase } from '@/integrations/supabase/client';

/**
 * Marks a VCR plan approver row as "review started" (only if not already set).
 * Backed by RLS policy `vcr_plan_approvers_update_own` (user_id = auth.uid()).
 * Safe to call repeatedly — the IS NULL filter prevents overwrites.
 */
export async function markVcrReviewStarted(approverRowId: string): Promise<void> {
  try {
    await (supabase as any)
      .from('vcr_plan_approvers')
      .update({ review_started_at: new Date().toISOString() })
      .eq('id', approverRowId)
      .is('review_started_at', null);
  } catch (err) {
    console.warn('[markVcrReviewStarted] failed', err);
  }
}

/**
 * Clears the "review started" marker (used when the user drags the card
 * from In Progress back to To Do to "un-start" their review).
 */
export async function clearVcrReviewStarted(approverRowId: string): Promise<void> {
  try {
    await (supabase as any)
      .from('vcr_plan_approvers')
      .update({ review_started_at: null })
      .eq('id', approverRowId);
  } catch (err) {
    console.warn('[clearVcrReviewStarted] failed', err);
  }
}
