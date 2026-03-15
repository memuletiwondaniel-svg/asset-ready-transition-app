-- Safety-net trigger: auto-cleanup reviewer tasks when source task status reverts from 'completed'
-- This ensures reviewer tasks are ALWAYS cleaned up regardless of which frontend path triggers the revert.

CREATE OR REPLACE FUNCTION public.handle_task_status_revert_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes FROM 'completed' to something else
  IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    -- Check if this task has any reviewers
    IF EXISTS (SELECT 1 FROM public.task_reviewers WHERE task_id = NEW.id LIMIT 1) THEN
      -- Delete reviewer tasks from approvers' trays
      DELETE FROM public.user_tasks
      WHERE type = 'review'
        AND metadata->>'source' = 'task_review'
        AND metadata->>'source_task_id' = NEW.id::text;

      -- Reset task_reviewers to PENDING
      UPDATE public.task_reviewers
      SET status = 'PENDING', decided_at = NULL, comments = NULL
      WHERE task_id = NEW.id;

      -- Log the revert as a comment for audit trail (only if no recent reopened comment exists)
      IF NOT EXISTS (
        SELECT 1 FROM public.task_comments
        WHERE task_id = NEW.id
          AND comment_type = 'reopened'
          AND created_at > NOW() - INTERVAL '10 seconds'
      ) THEN
        INSERT INTO public.task_comments (task_id, user_id, comment, comment_type, created_at)
        VALUES (NEW.id, COALESCE(auth.uid(), NEW.user_id), 'Task reopened — reviewer tasks cancelled', 'reopened', NOW());
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_status_revert_cleanup ON public.user_tasks;
CREATE TRIGGER trg_task_status_revert_cleanup
  AFTER UPDATE OF status ON public.user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_status_revert_cleanup();