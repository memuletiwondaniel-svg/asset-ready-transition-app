-- Recreate reopen_task to also clean up reviewer tasks and reset task_reviewers
CREATE OR REPLACE FUNCTION public.reopen_task(
  p_task_id UUID,
  p_reason TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1) Revert task status to in_progress
  UPDATE user_tasks
  SET status = 'in_progress', updated_at = NOW()
  WHERE id = p_task_id;

  -- 2) Delete reviewer tasks from approvers' trays
  DELETE FROM user_tasks
  WHERE type = 'review'
    AND metadata->>'source' = 'task_review'
    AND metadata->>'source_task_id' = p_task_id::text;

  -- 3) Reset task_reviewers to PENDING
  UPDATE task_reviewers
  SET status = 'PENDING', decided_at = NULL, comments = NULL
  WHERE task_id = p_task_id;

  -- 4) Log reopen event
  INSERT INTO task_comments (task_id, user_id, comment, comment_type, created_at)
  VALUES (p_task_id, v_user_id, p_reason, 'reopened', NOW());
END;
$$;