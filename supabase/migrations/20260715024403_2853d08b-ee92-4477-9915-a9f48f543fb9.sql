
-- ============================================================
-- 1) q_number + handover_point_id on p2a_vcr_qualifications
-- ============================================================
ALTER TABLE public.p2a_vcr_qualifications
  ADD COLUMN IF NOT EXISTS q_number int,
  ADD COLUMN IF NOT EXISTS handover_point_id uuid REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE;

-- Backfill handover_point_id from the prereq
UPDATE public.p2a_vcr_qualifications q
SET handover_point_id = pr.handover_point_id
FROM public.p2a_vcr_prerequisites pr
WHERE pr.id = q.vcr_prerequisite_id
  AND q.handover_point_id IS NULL;

-- Backfill q_number by created_at order per handover point
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY handover_point_id ORDER BY created_at, id) AS rn
  FROM public.p2a_vcr_qualifications
  WHERE q_number IS NULL AND handover_point_id IS NOT NULL
)
UPDATE public.p2a_vcr_qualifications q
SET q_number = r.rn
FROM ranked r
WHERE r.id = q.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_p2a_vcr_qualifications_hp_qnum
  ON public.p2a_vcr_qualifications(handover_point_id, q_number)
  WHERE q_number IS NOT NULL;

-- Trigger: auto-assign handover_point_id + q_number on INSERT
CREATE OR REPLACE FUNCTION public.trg_p2a_vcr_qualifications_assign_qnum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hp uuid;
  v_next int;
BEGIN
  IF NEW.handover_point_id IS NULL THEN
    SELECT pr.handover_point_id INTO v_hp
    FROM public.p2a_vcr_prerequisites pr
    WHERE pr.id = NEW.vcr_prerequisite_id;
    NEW.handover_point_id := v_hp;
  END IF;

  IF NEW.q_number IS NULL AND NEW.handover_point_id IS NOT NULL THEN
    SELECT COALESCE(MAX(q_number), 0) + 1 INTO v_next
    FROM public.p2a_vcr_qualifications
    WHERE handover_point_id = NEW.handover_point_id;
    NEW.q_number := v_next;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_p2a_vcr_qualifications_assign_qnum ON public.p2a_vcr_qualifications;
CREATE TRIGGER trg_p2a_vcr_qualifications_assign_qnum
BEFORE INSERT ON public.p2a_vcr_qualifications
FOR EACH ROW EXECUTE FUNCTION public.trg_p2a_vcr_qualifications_assign_qnum();

-- ============================================================
-- 2) vcr_qualification_approvers
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='vcr_qualification_approver_status') THEN
    CREATE TYPE public.vcr_qualification_approver_status AS ENUM ('PENDING','APPROVED','REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vcr_qualification_approvers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.p2a_vcr_qualifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_label text,
  status public.vcr_qualification_approver_status NOT NULL DEFAULT 'PENDING',
  decision_comment text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (qualification_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_qualification_approvers TO authenticated;
GRANT ALL ON public.vcr_qualification_approvers TO service_role;

ALTER TABLE public.vcr_qualification_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project team read qualification approvers"
ON public.vcr_qualification_approvers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert qualification approvers"
ON public.vcr_qualification_approvers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Approver can update own row"
ON public.vcr_qualification_approvers FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated can delete qualification approvers"
ON public.vcr_qualification_approvers FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_vcr_qual_approvers_qual ON public.vcr_qualification_approvers(qualification_id);
CREATE INDEX IF NOT EXISTS idx_vcr_qual_approvers_user ON public.vcr_qualification_approvers(user_id);

CREATE TRIGGER update_vcr_qualification_approvers_updated_at
BEFORE UPDATE ON public.vcr_qualification_approvers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) vcr_qualification_comments (activity thread)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vcr_qualification_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qualification_id uuid NOT NULL REFERENCES public.p2a_vcr_qualifications(id) ON DELETE CASCADE,
  author_user_id uuid,
  body text NOT NULL,
  action_tag text,   -- null / 'submitted' / 'approved' / 'rejected'
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vcr_qualification_comments TO authenticated;
GRANT ALL ON public.vcr_qualification_comments TO service_role;

ALTER TABLE public.vcr_qualification_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read qualification comments"
ON public.vcr_qualification_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Author insert qualification comment"
ON public.vcr_qualification_comments FOR INSERT
TO authenticated
WITH CHECK (author_user_id = auth.uid() OR author_user_id IS NULL);

CREATE POLICY "Author update own qualification comment"
ON public.vcr_qualification_comments FOR UPDATE
TO authenticated
USING (author_user_id = auth.uid())
WITH CHECK (author_user_id = auth.uid());

CREATE POLICY "Author delete own qualification comment"
ON public.vcr_qualification_comments FOR DELETE
TO authenticated
USING (author_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_vcr_qual_comments_qual ON public.vcr_qualification_comments(qualification_id, created_at);

-- ============================================================
-- 4) Decision cascade trigger on approver rows
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_vcr_qualification_approvers_cascade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qual_id       uuid := NEW.qualification_id;
  v_pending       int;
  v_rejected      int;
  v_total         int;
  v_prereq_id     uuid;
  v_prereq_status text;
  v_qual_status   text;
  v_actor_name    text;
BEGIN
  -- Only act on decision transitions
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('APPROVED','REJECTED') THEN
    RETURN NEW;
  END IF;

  -- Snapshot approver counts on the qualification
  SELECT
    COUNT(*) FILTER (WHERE status = 'PENDING'),
    COUNT(*) FILTER (WHERE status = 'REJECTED'),
    COUNT(*)
  INTO v_pending, v_rejected, v_total
  FROM public.vcr_qualification_approvers
  WHERE qualification_id = v_qual_id;

  -- Load qualification + prereq
  SELECT q.vcr_prerequisite_id, q.status::text
  INTO v_prereq_id, v_qual_status
  FROM public.p2a_vcr_qualifications q
  WHERE q.id = v_qual_id;

  -- Any reject -> qualification REJECTED + prereq REJECTED (advance-only)
  IF v_rejected > 0 AND v_qual_status NOT IN ('APPROVED','REJECTED') THEN
    UPDATE public.p2a_vcr_qualifications
    SET status = 'REJECTED',
        reviewed_at = now(),
        reviewed_by = NEW.user_id,
        reviewer_comments = COALESCE(NEW.decision_comment, reviewer_comments)
    WHERE id = v_qual_id;

    -- Prereq -> REJECTED only if currently in a qualification-in-flight state
    SELECT status::text INTO v_prereq_status
    FROM public.p2a_vcr_prerequisites WHERE id = v_prereq_id;

    IF v_prereq_status IN ('QUALIFICATION_REQUESTED','READY_FOR_REVIEW') THEN
      UPDATE public.p2a_vcr_prerequisites
      SET status = 'REJECTED', decided_at = now()
      WHERE id = v_prereq_id;
    END IF;

    INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag)
    VALUES (v_qual_id, NEW.user_id,
            COALESCE(NEW.decision_comment, 'Qualification rejected'), 'rejected');

    -- Cancel remaining approver review tasks for this qualification
    UPDATE public.user_tasks
    SET status = 'cancelled', updated_at = now()
    WHERE task_type = 'qualification_review'
      AND status IN ('open','in_progress','pending')
      AND (metadata->>'qualification_id')::uuid = v_qual_id
      AND assigned_to <> NEW.user_id;

    RETURN NEW;
  END IF;

  -- All approved -> qualification APPROVED + prereq -> QUALIFICATION_APPROVED (advance-only)
  IF v_pending = 0 AND v_rejected = 0 AND v_qual_status NOT IN ('APPROVED','REJECTED') THEN
    UPDATE public.p2a_vcr_qualifications
    SET status = 'APPROVED',
        reviewed_at = now(),
        reviewed_by = NEW.user_id
    WHERE id = v_qual_id;

    SELECT status::text INTO v_prereq_status
    FROM public.p2a_vcr_prerequisites WHERE id = v_prereq_id;

    IF v_prereq_status IN ('READY_FOR_REVIEW','QUALIFICATION_REQUESTED') THEN
      UPDATE public.p2a_vcr_prerequisites
      SET status = 'QUALIFICATION_APPROVED', decided_at = now()
      WHERE id = v_prereq_id;
    END IF;

    INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag)
    VALUES (v_qual_id, NEW.user_id,
            COALESCE(NEW.decision_comment, 'Qualification approved'), 'approved');
  ELSE
    -- Partial approval: log per-approver approval to the thread
    IF NEW.status = 'APPROVED' THEN
      INSERT INTO public.vcr_qualification_comments (qualification_id, author_user_id, body, action_tag)
      VALUES (v_qual_id, NEW.user_id,
              COALESCE(NEW.decision_comment, 'Approver signed off'), 'approved');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vcr_qualification_approvers_cascade ON public.vcr_qualification_approvers;
CREATE TRIGGER trg_vcr_qualification_approvers_cascade
AFTER UPDATE ON public.vcr_qualification_approvers
FOR EACH ROW EXECUTE FUNCTION public.trg_vcr_qualification_approvers_cascade();
