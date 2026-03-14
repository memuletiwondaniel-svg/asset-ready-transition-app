
-- ============================================
-- Update handle_task_reviewer_decision to also handle PENDING revert
-- When a reviewer's status goes back to PENDING (voided), sync the
-- reviewer's user_task back to in_progress and log it.
-- Also handle source task owner's card: if any reviewer rejects or
-- voids, keep the source task in its current status (the owner manages it).
-- ============================================

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
  -- Skip if status didn't actually change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Get reviewer name
  SELECT full_name INTO v_reviewer_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  -- ── Handle PENDING revert (voided decision) ──
  IF NEW.status = 'PENDING' AND OLD.status IN ('APPROVED', 'REJECTED') THEN
    -- Revert the reviewer's user_task back to in_progress
    UPDATE public.user_tasks
    SET status = 'in_progress',
        updated_at = now(),
        metadata = metadata || jsonb_build_object(
          'outcome', 'voided',
          'voided_at', now()::text
        )
    WHERE user_id = NEW.user_id
      AND type = 'review'
      AND metadata->>'source' = 'task_review'
      AND (
        metadata->>'task_reviewer_id' = NEW.id::text
        OR (metadata->>'source_task_id' = NEW.task_id::text AND status = 'completed')
      );

    -- Log the void in source task's activity feed
    v_action_label := '⚠️ ' || COALESCE(v_reviewer_name, 'Unknown') || ' voided their ' || LOWER(OLD.status) || ' decision';
    IF NOT EXISTS (
      SELECT 1 FROM public.task_comments
      WHERE task_id = NEW.task_id
        AND user_id = NEW.user_id
        AND comment = v_action_label
        AND created_at > now() - interval '5 seconds'
    ) THEN
      INSERT INTO public.task_comments (task_id, user_id, comment, comment_type)
      VALUES (NEW.task_id, NEW.user_id, v_action_label, 'reviewer_void');
    END IF;

    -- Check if the source task owner's card should go back to in_progress
    -- If the source task is 'completed' (submitted for approval) and now
    -- has no approvals or a voided one, move it back to in_progress
    UPDATE public.user_tasks
    SET status = 'in_progress',
        updated_at = now()
    WHERE id = NEW.task_id
      AND status = 'completed'
      AND NOT EXISTS (
        -- Only revert if NO reviewers are fully approved anymore
        SELECT 1 FROM public.task_reviewers
        WHERE task_id = NEW.task_id
          AND status = 'APPROVED'
      );

    RETURN NEW;
  END IF;

  -- ── Handle APPROVED / REJECTED ──
  IF NEW.status NOT IN ('APPROVED', 'REJECTED') THEN RETURN NEW; END IF;

  IF NEW.status = 'APPROVED' THEN
    v_action_label := '✅ Approved by ' || COALESCE(v_reviewer_name, 'Unknown');
  ELSE
    v_action_label := '❌ Rejected by ' || COALESCE(v_reviewer_name, 'Unknown');
  END IF;

  -- Append reviewer comment if provided
  IF NEW.comments IS NOT NULL AND NEW.comments != '' THEN
    v_action_label := v_action_label || E'\n' || NEW.comments;
  END IF;

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

  -- 2) Log to task_comments (dedup within 5 second window)
  IF NOT EXISTS (
    SELECT 1 FROM public.task_comments
    WHERE task_id = NEW.task_id
      AND user_id = NEW.user_id
      AND comment_type = 'reviewer_decision'
      AND created_at > now() - interval '5 seconds'
  ) THEN
    INSERT INTO public.task_comments (task_id, user_id, comment, comment_type)
    VALUES (NEW.task_id, NEW.user_id, v_action_label, 'reviewer_decision');
  END IF;

  -- 3) Also log to ora_activity_comments if source task has ORA metadata
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
