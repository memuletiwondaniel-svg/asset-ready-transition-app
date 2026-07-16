
-- ============================================================
-- Training workflow DB-1: structural changes only
-- ============================================================

-- 1. Enum ----------------------------------------------------
CREATE TYPE public.training_status AS ENUM (
  'NOT_STARTED',
  'AWAITING_PO',
  'AWAITING_MATERIALS',
  'MATERIALS_UNDER_REVIEW',
  'AWAITING_ATTENDANCE_LIST',
  'READY_TO_SCHEDULE',
  'SCHEDULED',
  'COMPLETED'
);

-- 2. Backfill legacy free-text status values -----------------
-- planned                 -> NOT_STARTED
-- delivered / complete /
-- COMPLETED /
-- competency_verified     -> COMPLETED
UPDATE public.p2a_vcr_training
SET status = CASE
  WHEN status = 'planned' THEN 'NOT_STARTED'
  WHEN status IN ('delivered', 'complete', 'COMPLETED', 'competency_verified') THEN 'COMPLETED'
  ELSE 'NOT_STARTED'
END;

-- 3. Add new columns (still TEXT status, converted below) ----
ALTER TABLE public.p2a_vcr_training
  ADD COLUMN IF NOT EXISTS discipline_id uuid REFERENCES public.discipline(id),
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS po_number text,
  ADD COLUMN IF NOT EXISTS po_provided_at timestamptz,
  ADD COLUMN IF NOT EXISTS po_provided_by uuid,
  ADD COLUMN IF NOT EXISTS attendance_provided_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_provided_by uuid,
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_start_time text,
  ADD COLUMN IF NOT EXISTS scheduled_end_time text,
  ADD COLUMN IF NOT EXISTS scheduled_location text,
  ADD COLUMN IF NOT EXISTS scheduled_notes text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_by uuid,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS outcome_summary text;

-- 4. Convert status column to enum ---------------------------
ALTER TABLE public.p2a_vcr_training
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.p2a_vcr_training
  ALTER COLUMN status TYPE public.training_status
  USING status::public.training_status;

ALTER TABLE public.p2a_vcr_training
  ALTER COLUMN status SET DEFAULT 'NOT_STARTED'::public.training_status;

-- 5. Reviewers table -----------------------------------------
CREATE TABLE public.p2a_vcr_training_reviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.p2a_vcr_training(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_label text,
  decision text CHECK (decision IN ('APPROVED', 'REJECTED') OR decision IS NULL),
  decision_comment text,
  decided_at timestamptz,
  markup_attachment_id uuid,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_training_reviewers TO authenticated;
GRANT ALL ON public.p2a_vcr_training_reviewers TO service_role;
ALTER TABLE public.p2a_vcr_training_reviewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training reviewers readable by authenticated"
  ON public.p2a_vcr_training_reviewers FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "training reviewers writable by authenticated"
  ON public.p2a_vcr_training_reviewers FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- 6. Attachments table ---------------------------------------
CREATE TABLE public.p2a_vcr_training_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.p2a_vcr_training(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('po', 'materials', 'markup', 'attendance', 'evidence')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  file_type text,
  description text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  linked_reviewer_id uuid REFERENCES public.p2a_vcr_training_reviewers(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_training_attachments TO authenticated;
GRANT ALL ON public.p2a_vcr_training_attachments TO service_role;
ALTER TABLE public.p2a_vcr_training_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training attachments readable by authenticated"
  ON public.p2a_vcr_training_attachments FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "training attachments writable by authenticated"
  ON public.p2a_vcr_training_attachments FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- 7. Activity log table --------------------------------------
CREATE TABLE public.p2a_vcr_training_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.p2a_vcr_training(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  comment text,
  from_status public.training_status,
  to_status public.training_status,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.p2a_vcr_training_activity_log TO authenticated;
GRANT ALL ON public.p2a_vcr_training_activity_log TO service_role;
ALTER TABLE public.p2a_vcr_training_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training activity log readable by authenticated"
  ON public.p2a_vcr_training_activity_log FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "training activity log writable by authenticated"
  ON public.p2a_vcr_training_activity_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- 8. Discipline -> responsible TA role mapping ---------------
CREATE TABLE public.discipline_responsible_ta_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline_id uuid NOT NULL UNIQUE REFERENCES public.discipline(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discipline_responsible_ta_role TO authenticated, anon;
GRANT ALL ON public.discipline_responsible_ta_role TO service_role;
ALTER TABLE public.discipline_responsible_ta_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discipline TA mapping readable by everyone"
  ON public.discipline_responsible_ta_role FOR SELECT
  TO authenticated, anon USING (true);

-- Seed mapping for the 8 supported disciplines (Project TA2 only, per canon).
-- Uses byte-identical roles.name values verified against the catalog.
INSERT INTO public.discipline_responsible_ta_role (discipline_id, role_name)
SELECT d.id, m.role_name
FROM (VALUES
  ('Process',       'Process TA2 – Project'),
  ('PACO',          'PACO TA2 – Project'),
  ('Electrical',    'Elect TA2 – Project'),
  ('Static',        'Static TA2 – Project'),
  ('Rotating',      'Rotating TA2 – Project'),
  ('MCI',           'MCI TA2 – Project'),
  ('Civil',         'Civil TA2'),
  ('Tech Safety',   'Tech Safety TA2')
) AS m(discipline_name, role_name)
JOIN public.discipline d
  ON d.name ILIKE m.discipline_name
  OR d.name ILIKE (m.discipline_name || ' %')
  OR d.name ILIKE ('% ' || m.discipline_name)
ON CONFLICT (discipline_id) DO NOTHING;

-- 9. Trigger to keep updated_at fresh ------------------------
CREATE TRIGGER update_p2a_vcr_training_reviewers_updated_at
BEFORE UPDATE ON public.p2a_vcr_training_reviewers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Helpful indexes ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_training_reviewers_training ON public.p2a_vcr_training_reviewers(training_id);
CREATE INDEX IF NOT EXISTS idx_training_reviewers_user ON public.p2a_vcr_training_reviewers(user_id);
CREATE INDEX IF NOT EXISTS idx_training_attachments_training ON public.p2a_vcr_training_attachments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_attachments_kind ON public.p2a_vcr_training_attachments(kind);
CREATE INDEX IF NOT EXISTS idx_training_activity_log_training ON public.p2a_vcr_training_activity_log(training_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2a_vcr_training_status ON public.p2a_vcr_training(status);
CREATE INDEX IF NOT EXISTS idx_p2a_vcr_training_target_date ON public.p2a_vcr_training(target_date);
