
-- Workflow status enum
DO $$ BEGIN
  CREATE TYPE public.p2a_register_workflow_status AS ENUM (
    'NOT_STARTED','DRAFT','UNDER_REVIEW','APPROVED','REWORK_REQUESTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Register kind + activity kind enums
DO $$ BEGIN
  CREATE TYPE public.p2a_register_kind AS ENUM ('Register','Logsheet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.p2a_register_activity_kind AS ENUM ('New','Update existing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.p2a_register_reviewer_decision AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend the operational registers table
ALTER TABLE public.p2a_vcr_operational_registers
  ADD COLUMN IF NOT EXISTS workflow_status public.p2a_register_workflow_status NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS register_kind   public.p2a_register_kind NOT NULL DEFAULT 'Register',
  ADD COLUMN IF NOT EXISTS activity_kind   public.p2a_register_activity_kind NOT NULL DEFAULT 'Update existing',
  ADD COLUMN IF NOT EXISTS draft_owner_id  uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at             timestamptz,
  ADD COLUMN IF NOT EXISTS latest_rejection_reason  text,
  ADD COLUMN IF NOT EXISTS latest_rejection_reviewer uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS scope text;

-- Backfill workflow_status from legacy status where possible
UPDATE public.p2a_vcr_operational_registers
   SET workflow_status = 'APPROVED'
 WHERE workflow_status = 'NOT_STARTED' AND status = 'approved';

UPDATE public.p2a_vcr_operational_registers
   SET workflow_status = 'UNDER_REVIEW'
 WHERE workflow_status = 'NOT_STARTED' AND status = 'in_progress';

-- Accepting parties (reviewers)
CREATE TABLE IF NOT EXISTS public.p2a_vcr_register_reviewers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id    uuid NOT NULL REFERENCES public.p2a_vcr_operational_registers(id) ON DELETE CASCADE,
  reviewer_id    uuid NOT NULL REFERENCES public.profiles(id),
  role_label     text,
  decision       public.p2a_register_reviewer_decision NOT NULL DEFAULT 'pending',
  decision_at    timestamptz,
  decision_comment text,
  reviewer_order int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (register_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reg_reviewers_register ON public.p2a_vcr_register_reviewers(register_id);
CREATE INDEX IF NOT EXISTS idx_reg_reviewers_user     ON public.p2a_vcr_register_reviewers(reviewer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_register_reviewers TO authenticated;
GRANT ALL ON public.p2a_vcr_register_reviewers TO service_role;

ALTER TABLE public.p2a_vcr_register_reviewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Register reviewers readable" ON public.p2a_vcr_register_reviewers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Register reviewers writable" ON public.p2a_vcr_register_reviewers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Register reviewers updatable by self or service"
  ON public.p2a_vcr_register_reviewers FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid()) WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Register reviewers deletable by service role"
  ON public.p2a_vcr_register_reviewers FOR DELETE TO service_role USING (true);

-- Attachments
CREATE TABLE IF NOT EXISTS public.p2a_vcr_register_attachments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id    uuid NOT NULL REFERENCES public.p2a_vcr_operational_registers(id) ON DELETE CASCADE,
  file_name      text NOT NULL,
  file_path      text NOT NULL,
  file_size      bigint,
  content_type   text,
  uploaded_by    uuid REFERENCES public.profiles(id),
  attachment_kind text NOT NULL DEFAULT 'delivering',   -- 'delivering' | 'markup'
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_attach_register ON public.p2a_vcr_register_attachments(register_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_register_attachments TO authenticated;
GRANT ALL ON public.p2a_vcr_register_attachments TO service_role;

ALTER TABLE public.p2a_vcr_register_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Register attachments readable" ON public.p2a_vcr_register_attachments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Register attachments writable" ON public.p2a_vcr_register_attachments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Register attachments updatable by uploader"
  ON public.p2a_vcr_register_attachments FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Register attachments deletable by uploader or service"
  ON public.p2a_vcr_register_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Activity log
CREATE TABLE IF NOT EXISTS public.p2a_vcr_register_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id  uuid NOT NULL REFERENCES public.p2a_vcr_operational_registers(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES public.profiles(id),
  action       text NOT NULL,
  comment      text,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reg_log_register ON public.p2a_vcr_register_activity_log(register_id);

GRANT SELECT, INSERT ON public.p2a_vcr_register_activity_log TO authenticated;
GRANT ALL ON public.p2a_vcr_register_activity_log TO service_role;

ALTER TABLE public.p2a_vcr_register_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Register activity readable" ON public.p2a_vcr_register_activity_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Register activity insertable" ON public.p2a_vcr_register_activity_log
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- Timestamp triggers
DROP TRIGGER IF EXISTS trg_reg_reviewers_updated_at ON public.p2a_vcr_register_reviewers;
CREATE TRIGGER trg_reg_reviewers_updated_at
  BEFORE UPDATE ON public.p2a_vcr_register_reviewers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reg_attach_updated_at ON public.p2a_vcr_register_attachments;
CREATE TRIGGER trg_reg_attach_updated_at
  BEFORE UPDATE ON public.p2a_vcr_register_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
