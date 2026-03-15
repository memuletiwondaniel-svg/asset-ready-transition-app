
-- 1) Atomic submission RPC: marks task completed, logs single submission event, ensures reviewer tasks
CREATE OR REPLACE FUNCTION public.submit_task_for_approval(
  p_task_id UUID,
  p_comment TEXT,
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

  -- 1) Mark task as completed
  UPDATE user_tasks
  SET status = 'completed', updated_at = NOW()
  WHERE id = p_task_id;

  -- 2) Insert single submission event into task_comments
  INSERT INTO task_comments (task_id, user_id, comment, comment_type, created_at)
  VALUES (p_task_id, v_user_id, p_comment, 'submission', NOW());

  -- 3) Ensure reviewer tasks exist (calls existing function)
  PERFORM ensure_reviewer_tasks_for_task(p_task_id);
END;
$$;

-- 2) Reopen task RPC: reverts task status and logs reopen event
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

  -- 2) Log reopen event
  INSERT INTO task_comments (task_id, user_id, comment, comment_type, created_at)
  VALUES (p_task_id, v_user_id, p_reason, 'reopened', NOW());
END;
$$;
