-- Root-cause fix: create/recreate approver review tasks when source task is submitted

-- 1) Canonical helper: ensure review tasks exist for all pending approvers of a source task
CREATE OR REPLACE FUNCTION public.ensure_reviewer_tasks_for_task(p_task_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_task public.user_tasks%ROWTYPE;
  v_created_count integer := 0;
  v_existing_task_id uuid;
  v_project_code text;
  v_project_id text;
  v_plan_id text;
  v_ora_activity_id text;
  r record;
BEGIN
  IF p_task_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO v_source_task
  FROM public.user_tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Guard: never generate reviewer tasks for reviewer tasks themselves
  IF COALESCE(v_source_task.type, '') = 'review' OR COALESCE(v_source_task.metadata->>'source', '') = 'task_review' THEN
    RETURN 0;
  END IF;

  v_project_code := v_source_task.metadata->>'project_code';
  v_project_id := v_source_task.metadata->>'project_id';
  v_plan_id := v_source_task.metadata->>'plan_id';
  v_ora_activity_id := v_source_task.metadata->>'ora_plan_activity_id';

  FOR r IN
    SELECT id, user_id, role_label
    FROM public.task_reviewers
    WHERE task_id = p_task_id
      AND user_id IS NOT NULL
      AND status = 'PENDING'
    ORDER BY display_order, created_at
  LOOP
    SELECT ut.id
    INTO v_existing_task_id
    FROM public.user_tasks ut
    WHERE ut.user_id = r.user_id
      AND ut.type = 'review'
      AND ut.metadata->>'source' = 'task_review'
      AND (
        ut.metadata->>'task_reviewer_id' = r.id::text
        OR ut.metadata->>'source_task_id' = p_task_id::text
      )
      AND ut.status IN ('pending', 'in_progress', 'waiting')
    ORDER BY ut.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_existing_task_id IS NULL THEN
      PERFORM public.create_user_task(
        r.user_id,
        'Review: ' || COALESCE(v_source_task.title, 'Task'),
        'You have been assigned as an approver for this task submission.',
        'review',
        'pending',
        'Medium',
        jsonb_strip_nulls(
          jsonb_build_object(
            'source', 'task_review',
            'source_task_id', p_task_id,
            'task_reviewer_id', r.id,
            'role_label', r.role_label,
            'project_code', v_project_code,
            'project_id', v_project_id,
            'plan_id', v_plan_id,
            'ora_plan_activity_id', v_ora_activity_id
          )
        ),
        v_source_task.due_date
      );

      v_created_count := v_created_count + 1;
    ELSE
      UPDATE public.user_tasks
      SET
        status = 'pending',
        title = 'Review: ' || COALESCE(v_source_task.title, 'Task'),
        description = 'You have been assigned as an approver for this task submission.',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_strip_nulls(
          jsonb_build_object(
            'source', 'task_review',
            'source_task_id', p_task_id,
            'task_reviewer_id', r.id,
            'role_label', r.role_label,
            'project_code', v_project_code,
            'project_id', v_project_id,
            'plan_id', v_plan_id,
            'ora_plan_activity_id', v_ora_activity_id
          )
        ),
        updated_at = now()
      WHERE id = v_existing_task_id;
    END IF;
  END LOOP;

  RETURN v_created_count;
END;
$$;

-- 2) Reviewer assignment trigger should only create tasks immediately if source task is already submitted
CREATE OR REPLACE FUNCTION public.handle_task_reviewer_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_source_task_status text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status
  INTO v_source_task_status
  FROM public.user_tasks
  WHERE id = NEW.task_id;

  -- Only create reviewer tasks immediately when the source task is already submitted/completed.
  -- If still in progress, reviewer tasks will be created on submission trigger.
  IF v_source_task_status = 'completed' THEN
    PERFORM public.ensure_reviewer_tasks_for_task(NEW.task_id);
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Create reviewer tasks whenever a source task is submitted/completed
CREATE OR REPLACE FUNCTION public.handle_user_task_submission_reviewer_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.ensure_reviewer_tasks_for_task(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_task_submission_reviewer_sync ON public.user_tasks;
CREATE TRIGGER trg_user_task_submission_reviewer_sync
AFTER INSERT OR UPDATE OF status ON public.user_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_task_submission_reviewer_sync();

-- 4) Backfill: retroactively create missing review tasks for already-submitted tasks
CREATE OR REPLACE FUNCTION public.backfill_missing_reviewer_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ut.id
    FROM public.user_tasks ut
    JOIN public.task_reviewers tr
      ON tr.task_id = ut.id
     AND tr.user_id IS NOT NULL
     AND tr.status = 'PENDING'
    WHERE ut.status = 'completed'
  LOOP
    v_total := v_total + public.ensure_reviewer_tasks_for_task(r.id);
  END LOOP;

  RETURN v_total;
END;
$$;

SELECT public.backfill_missing_reviewer_tasks();