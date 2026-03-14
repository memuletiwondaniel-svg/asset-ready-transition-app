
-- ============================================
-- task_comments: Generic activity log for ANY task type
-- Solves the root cause: ora_activity_comments is ORA-specific
-- and silently skips simple tasks, breaking the activity feed
-- for ad-hoc reviewer decisions on non-ORA tasks.
-- ============================================

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'comment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_created_at ON public.task_comments(created_at DESC);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on tasks they own or are reviewers of
CREATE POLICY "Users can view task comments"
  ON public.task_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks ut
      WHERE ut.id = task_comments.task_id
      AND ut.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.task_reviewers tr
      WHERE tr.task_id = task_comments.task_id
      AND tr.user_id = auth.uid()
    )
  );

-- Users can insert comments (authenticated)
CREATE POLICY "Users can insert task comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;

-- ============================================
-- Update handle_task_reviewer_decision to ALWAYS write to task_comments
-- (regardless of whether the source task has ORA metadata)
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
  IF NEW.status NOT IN ('APPROVED', 'REJECTED') THEN RETURN NEW; END IF;
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  -- Get reviewer name
  SELECT full_name INTO v_reviewer_name
  FROM public.profiles WHERE user_id = NEW.user_id;

  IF NEW.status = 'APPROVED' THEN
    v_action_label := '✅ Approved by ' || COALESCE(v_reviewer_name, 'Unknown');
  ELSE
    v_action_label := '❌ Rejected by ' || COALESCE(v_reviewer_name, 'Unknown');
  END IF;

  -- Append reviewer comment if provided
  IF NEW.comments IS NOT NULL AND NEW.comments != '' THEN
    v_action_label := v_action_label || ': ' || NEW.comments;
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

  -- 2) ALWAYS log to task_comments (works for ALL task types)
  IF NOT EXISTS (
    SELECT 1 FROM public.task_comments
    WHERE task_id = NEW.task_id
      AND user_id = NEW.user_id
      AND comment = v_action_label
  ) THEN
    INSERT INTO public.task_comments (task_id, user_id, comment, comment_type)
    VALUES (NEW.task_id, NEW.user_id, v_action_label, 'reviewer_decision');
  END IF;

  -- 3) ALSO log to ora_activity_comments if source task has ORA metadata
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

-- ============================================
-- Backfill: Insert missing reviewer decision entries into task_comments
-- for historically completed review tasks
-- ============================================
INSERT INTO public.task_comments (task_id, user_id, comment, comment_type, created_at)
SELECT
  tr.task_id,
  tr.user_id,
  CASE
    WHEN tr.status = 'APPROVED' THEN '✅ Approved by ' || COALESCE(p.full_name, 'Unknown')
    WHEN tr.status = 'REJECTED' THEN '❌ Rejected by ' || COALESCE(p.full_name, 'Unknown')
  END,
  'reviewer_decision',
  COALESCE(tr.decided_at, tr.created_at)
FROM public.task_reviewers tr
LEFT JOIN public.profiles p ON p.user_id = tr.user_id
WHERE tr.status IN ('APPROVED', 'REJECTED')
  AND NOT EXISTS (
    SELECT 1 FROM public.task_comments tc
    WHERE tc.task_id = tr.task_id
      AND tc.user_id = tr.user_id
      AND tc.comment_type = 'reviewer_decision'
  );
