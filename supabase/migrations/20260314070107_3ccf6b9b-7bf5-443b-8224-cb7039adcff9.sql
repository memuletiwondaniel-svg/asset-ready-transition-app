
-- Attach the trigger that was missing from the previous migration
DROP TRIGGER IF EXISTS trg_task_reviewer_decision ON public.task_reviewers;

CREATE TRIGGER trg_task_reviewer_decision
  AFTER UPDATE ON public.task_reviewers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_task_reviewer_decision();

-- Backfill: fix any remaining mismatches where reviewer user_task is completed but task_reviewers is still PENDING
UPDATE public.task_reviewers tr
SET status = 'APPROVED',
    decided_at = ut.updated_at
FROM public.user_tasks ut
WHERE ut.type = 'review'
  AND ut.metadata->>'source' = 'task_review'
  AND (
    ut.metadata->>'task_reviewer_id' = tr.id::text
    OR ut.metadata->>'source_task_id' = tr.task_id::text
  )
  AND ut.user_id = tr.user_id
  AND ut.status = 'completed'
  AND tr.status = 'PENDING';
