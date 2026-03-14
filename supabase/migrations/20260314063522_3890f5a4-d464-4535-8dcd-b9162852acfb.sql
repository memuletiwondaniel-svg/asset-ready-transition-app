
CREATE OR REPLACE FUNCTION public.handle_task_reviewer_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_source_task RECORD;
  v_source_ora_activity_id text;
  v_source_plan_id text;
  v_reviewer_name text;
  v_action_label text;
BEGIN
  IF NEW.status NOT IN ('APPROVED', 'REJECTED') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- 1) Sync the reviewer's user_task to completed
  UPDATE public.user_tasks
  SET status = 'completed',
      updated_at = now(),
      metadata = metadata || jsonb_build_object(
        'outcome', LOWER(NEW.status),
        'decision_at', now()::text
      )
  WHERE user_id = NEW.user_id
    AND type = 'review'
    AND metadata->>'source' = 'task_review'
    AND (
      metadata->>'task_reviewer_id' = NEW.id::text
      OR (metadata->>'source_task_id' = NEW.task_id::text AND status != 'completed')
    );

  -- 2) Log activity in ora_activity_comments on the source task
  SELECT metadata INTO v_source_task
  FROM public.user_tasks WHERE id = NEW.task_id;

  IF v_source_task IS NOT NULL AND v_source_task.metadata IS NOT NULL THEN
    v_source_ora_activity_id := v_source_task.metadata->>'ora_plan_activity_id';
    v_source_plan_id := v_source_task.metadata->>'plan_id';

    IF v_source_ora_activity_id LIKE 'ora-%' THEN
      v_source_ora_activity_id := substring(v_source_ora_activity_id from 5);
    ELSIF v_source_ora_activity_id LIKE 'ws-%' THEN
      v_source_ora_activity_id := substring(v_source_ora_activity_id from 4);
    END IF;

    IF v_source_ora_activity_id IS NOT NULL AND v_source_plan_id IS NOT NULL THEN
      SELECT full_name INTO v_reviewer_name
      FROM public.profiles WHERE user_id = NEW.user_id;

      IF NEW.status = 'APPROVED' THEN
        v_action_label := '✅ Approved by ' || COALESCE(v_reviewer_name, 'Unknown');
      ELSE
        v_action_label := '❌ Rejected by ' || COALESCE(v_reviewer_name, 'Unknown');
      END IF;

      -- Idempotency guard
      IF NOT EXISTS (
        SELECT 1 FROM public.ora_activity_comments
        WHERE ora_plan_activity_id = v_source_ora_activity_id
          AND orp_plan_id = v_source_plan_id::uuid
          AND user_id = NEW.user_id
          AND comment = v_action_label
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

  RETURN NEW;
END;
$$;

-- Backfill historical mismatches
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
