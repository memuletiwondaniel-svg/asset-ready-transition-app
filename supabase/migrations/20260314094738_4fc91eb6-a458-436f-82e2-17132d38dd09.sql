-- Harden reviewer decision automation to recover from inconsistent states
-- and ensure source task + activity feed stay synchronized.

CREATE OR REPLACE FUNCTION public.handle_task_reviewer_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_source_task_metadata jsonb;
  v_source_ora_activity_id text;
  v_source_plan_id text;
  v_reviewer_name text;
  v_action_label text;
  v_review_task_updates integer := 0;
  v_status_changed boolean := OLD.status IS DISTINCT FROM NEW.status;
  v_should_log_decision boolean := false;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name
  INTO v_reviewer_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Handle decision void (APPROVED/REJECTED -> PENDING)
  IF NEW.status = 'PENDING' AND OLD.status IN ('APPROVED', 'REJECTED') THEN
    UPDATE public.user_tasks
    SET status = 'in_progress',
        updated_at = now(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'outcome', 'voided',
          'voided_at', now()::text
        )
    WHERE user_id = NEW.user_id
      AND type = 'review'
      AND metadata->>'source' = 'task_review'
      AND (
        metadata->>'task_reviewer_id' = NEW.id::text
        OR metadata->>'source_task_id' = NEW.task_id::text
      );

    -- Always move source task owner card back to in_progress when a reviewer voids
    UPDATE public.user_tasks
    SET status = 'in_progress',
        updated_at = now()
    WHERE id = NEW.task_id
      AND status = 'completed';

    v_action_label := '⚠️ ' || COALESCE(v_reviewer_name, 'Unknown') || ' voided their ' || LOWER(OLD.status) || ' decision';

    IF NOT EXISTS (
      SELECT 1 FROM public.task_comments
      WHERE task_id = NEW.task_id
        AND user_id = NEW.user_id
        AND comment_type = 'reviewer_void'
        AND comment = v_action_label
        AND created_at > now() - interval '10 seconds'
    ) THEN
      INSERT INTO public.task_comments (task_id, user_id, comment, comment_type)
      VALUES (NEW.task_id, NEW.user_id, v_action_label, 'reviewer_void');
    END IF;

    RAISE LOG 'handle_task_reviewer_decision void sync: reviewer_id=%, task_id=%', NEW.id, NEW.task_id;
    RETURN NEW;
  END IF;

  -- Only decision states beyond this point
  IF NEW.status NOT IN ('APPROVED', 'REJECTED') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'APPROVED' THEN
    v_action_label := '✅ Approved by ' || COALESCE(v_reviewer_name, 'Unknown');
  ELSE
    v_action_label := '❌ Rejected by ' || COALESCE(v_reviewer_name, 'Unknown');
  END IF;

  IF NEW.comments IS NOT NULL AND NEW.comments <> '' THEN
    v_action_label := v_action_label || E'\n' || NEW.comments;
  END IF;

  -- Sync reviewer task to completed even when status didn't change,
  -- if task state became inconsistent (e.g., manually moved back).
  UPDATE public.user_tasks
  SET status = 'completed',
      updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'outcome', LOWER(NEW.status),
        'decision_at', COALESCE(NEW.decided_at, now())::text
      )
  WHERE user_id = NEW.user_id
    AND type = 'review'
    AND metadata->>'source' = 'task_review'
    AND (
      metadata->>'task_reviewer_id' = NEW.id::text
      OR metadata->>'source_task_id' = NEW.task_id::text
    )
    AND (
      status IS DISTINCT FROM 'completed'
      OR COALESCE(metadata->>'outcome', '') IS DISTINCT FROM LOWER(NEW.status)
    );

  GET DIAGNOSTICS v_review_task_updates = ROW_COUNT;
  v_should_log_decision := v_status_changed OR v_review_task_updates > 0;

  -- For rejection, put source task back in progress so owner can rework.
  IF NEW.status = 'REJECTED' THEN
    UPDATE public.user_tasks
    SET status = 'in_progress',
        updated_at = now()
    WHERE id = NEW.task_id
      AND status = 'completed';
  END IF;

  IF v_should_log_decision THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.task_comments
      WHERE task_id = NEW.task_id
        AND user_id = NEW.user_id
        AND comment_type = 'reviewer_decision'
        AND comment = v_action_label
        AND created_at > now() - interval '10 seconds'
    ) THEN
      INSERT INTO public.task_comments (task_id, user_id, comment, comment_type)
      VALUES (NEW.task_id, NEW.user_id, v_action_label, 'reviewer_decision');
    END IF;

    SELECT metadata
    INTO v_source_task_metadata
    FROM public.user_tasks
    WHERE id = NEW.task_id;

    IF v_source_task_metadata IS NOT NULL THEN
      v_source_ora_activity_id := v_source_task_metadata->>'ora_plan_activity_id';
      v_source_plan_id := v_source_task_metadata->>'plan_id';

      IF v_source_ora_activity_id LIKE 'ora-%' THEN
        v_source_ora_activity_id := substring(v_source_ora_activity_id from 5);
      ELSIF v_source_ora_activity_id LIKE 'ws-%' THEN
        v_source_ora_activity_id := substring(v_source_ora_activity_id from 4);
      END IF;

      IF v_source_ora_activity_id IS NOT NULL
         AND v_source_plan_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.ora_activity_comments
          WHERE ora_plan_activity_id = v_source_ora_activity_id
            AND orp_plan_id = v_source_plan_id::uuid
            AND user_id = NEW.user_id
            AND comment = v_action_label
            AND created_at > now() - interval '10 seconds'
        ) THEN
          INSERT INTO public.ora_activity_comments (
            ora_plan_activity_id, orp_plan_id, user_id, comment
          ) VALUES (
            v_source_ora_activity_id,
            v_source_plan_id::uuid,
            NEW.user_id,
            v_action_label
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RAISE LOG 'handle_task_reviewer_decision decision sync: reviewer_id=%, task_id=%, status=%, status_changed=%, review_task_updates=%',
    NEW.id, NEW.task_id, NEW.status, v_status_changed, v_review_task_updates;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_task_reviewer_decision error for reviewer_id %, task_id %: [%] %', NEW.id, NEW.task_id, SQLSTATE, SQLERRM;
    RAISE;
END;
$$;

-- Trigger must also fire when only decided_at/comments change, so self-heal can run.
DROP TRIGGER IF EXISTS trg_task_reviewer_decision ON public.task_reviewers;

CREATE TRIGGER trg_task_reviewer_decision
  AFTER UPDATE ON public.task_reviewers
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    OR OLD.decided_at IS DISTINCT FROM NEW.decided_at
    OR OLD.comments IS DISTINCT FROM NEW.comments
  )
  EXECUTE FUNCTION public.handle_task_reviewer_decision();

-- Backfill inconsistent reviewer tasks globally.
UPDATE public.user_tasks ut
SET status = 'completed',
    updated_at = now(),
    metadata = COALESCE(ut.metadata, '{}'::jsonb) || jsonb_build_object(
      'outcome', LOWER(tr.status),
      'decision_at', COALESCE(tr.decided_at, now())::text
    )
FROM public.task_reviewers tr
WHERE ut.type = 'review'
  AND ut.metadata->>'source' = 'task_review'
  AND ut.user_id = tr.user_id
  AND (
    ut.metadata->>'task_reviewer_id' = tr.id::text
    OR ut.metadata->>'source_task_id' = tr.task_id::text
  )
  AND tr.status IN ('APPROVED', 'REJECTED')
  AND (
    ut.status IS DISTINCT FROM 'completed'
    OR COALESCE(ut.metadata->>'outcome', '') IS DISTINCT FROM LOWER(tr.status)
  );