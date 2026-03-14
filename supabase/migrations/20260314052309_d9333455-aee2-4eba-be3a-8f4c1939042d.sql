
-- Trigger: when a reviewer is added to task_reviewers, auto-create a user_task for the reviewer
-- so it appears in their To Do tray. When removed, delete the corresponding user_task.

CREATE OR REPLACE FUNCTION public.handle_task_reviewer_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_source_task RECORD;
  v_new_task_id uuid;
  v_project_code text;
  v_project_id text;
BEGIN
  -- Skip if no user assigned
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Get info from the source task
  SELECT title, metadata, tenant_id INTO v_source_task
  FROM public.user_tasks WHERE id = NEW.task_id;

  IF v_source_task IS NULL THEN RETURN NEW; END IF;

  v_project_code := v_source_task.metadata->>'project_code';
  v_project_id := v_source_task.metadata->>'project_id';

  -- Check for existing review task to prevent duplicates
  IF EXISTS (
    SELECT 1 FROM public.user_tasks
    WHERE user_id = NEW.user_id
      AND type = 'review'
      AND metadata->>'source' = 'task_review'
      AND metadata->>'source_task_id' = NEW.task_id::text
      AND status != 'completed'
  ) THEN
    RETURN NEW;
  END IF;

  -- Create the review task for the reviewer
  INSERT INTO public.user_tasks (user_id, title, description, type, status, priority, metadata, tenant_id)
  VALUES (
    NEW.user_id,
    'Review: ' || v_source_task.title,
    'You have been assigned as a reviewer/approver for this task.',
    'review',
    'pending',
    'Medium',
    jsonb_build_object(
      'source', 'task_review',
      'source_task_id', NEW.task_id,
      'task_reviewer_id', NEW.id,
      'role_label', NEW.role_label,
      'project_code', v_project_code,
      'project_id', v_project_id
    ),
    v_source_task.tenant_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_task_reviewer_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete the review task created for this reviewer
  DELETE FROM public.user_tasks
  WHERE user_id = OLD.user_id
    AND type = 'review'
    AND metadata->>'source' = 'task_review'
    AND metadata->>'source_task_id' = OLD.task_id::text
    AND status != 'completed';

  RETURN OLD;
END;
$$;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS trg_task_reviewer_insert ON public.task_reviewers;
DROP TRIGGER IF EXISTS trg_task_reviewer_delete ON public.task_reviewers;

-- Create triggers
CREATE TRIGGER trg_task_reviewer_insert
  AFTER INSERT ON public.task_reviewers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_reviewer_insert();

CREATE TRIGGER trg_task_reviewer_delete
  AFTER DELETE ON public.task_reviewers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_reviewer_delete();
