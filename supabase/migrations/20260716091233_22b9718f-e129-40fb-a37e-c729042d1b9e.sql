
-- ============================================================
-- DB-1: Procedures rebuild — structural + backfill
-- ============================================================

-- 1) Enum
DO $$ BEGIN
  CREATE TYPE public.procedure_status AS ENUM (
    'NOT_STARTED', 'DRAFT', 'UNDER_REVIEW', 'REWORK_REQUESTED', 'APPROVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend p2a_vcr_procedures
ALTER TABLE public.p2a_vcr_procedures
  ADD COLUMN IF NOT EXISTS author_user_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS discipline_id  uuid REFERENCES public.discipline(id),
  ADD COLUMN IF NOT EXISTS submitted_at   timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by   uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at    timestamptz,
  ADD COLUMN IF NOT EXISTS change_type    text NOT NULL DEFAULT 'UPDATE';

ALTER TABLE public.p2a_vcr_procedures
  DROP CONSTRAINT IF EXISTS p2a_vcr_procedures_change_type_chk;
ALTER TABLE public.p2a_vcr_procedures
  ADD CONSTRAINT p2a_vcr_procedures_change_type_chk
  CHECK (change_type IN ('NEW','UPDATE'));

-- 3) Normalise procedure_type casing
UPDATE public.p2a_vcr_procedures
SET procedure_type = UPPER(procedure_type)
WHERE procedure_type IS NOT NULL AND procedure_type <> UPPER(procedure_type);

-- 4) Backfill status → enum values (still text)
ALTER TABLE public.p2a_vcr_procedures ALTER COLUMN status DROP DEFAULT;

UPDATE public.p2a_vcr_procedures SET status =
  CASE lower(status)
    WHEN 'to_develop'  THEN 'NOT_STARTED'
    WHEN 'in_review'   THEN 'UNDER_REVIEW'
    WHEN 'approved'    THEN 'APPROVED'
    WHEN 'complete'    THEN 'APPROVED'
    WHEN 'issued'      THEN 'APPROVED'
    WHEN 'draft'       THEN 'DRAFT'
    ELSE 'NOT_STARTED'
  END;

-- 5) Convert column to enum
ALTER TABLE public.p2a_vcr_procedures
  ALTER COLUMN status TYPE public.procedure_status
  USING status::public.procedure_status;

ALTER TABLE public.p2a_vcr_procedures
  ALTER COLUMN status SET DEFAULT 'NOT_STARTED'::public.procedure_status;

-- 5b) Backfill approved_at for existing APPROVED rows (use updated_at as best proxy)
UPDATE public.p2a_vcr_procedures
SET approved_at = COALESCE(approved_at, updated_at)
WHERE status = 'APPROVED' AND approved_at IS NULL;

-- 6) Best-effort author resolution from responsible_person free-text
UPDATE public.p2a_vcr_procedures p
SET author_user_id = pr.id
FROM public.profiles pr
WHERE p.author_user_id IS NULL
  AND p.responsible_person IS NOT NULL
  AND trim(lower(pr.full_name)) = trim(lower(p.responsible_person));

-- ============================================================
-- 7) p2a_vcr_procedure_approvers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.p2a_vcr_procedure_approvers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id          uuid NOT NULL REFERENCES public.p2a_vcr_procedures(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id),
  role_label            text,
  decision              text CHECK (decision IN ('APPROVED','REJECTED') OR decision IS NULL),
  comment               text,
  decided_at            timestamptz,
  markup_attachment_id  uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (procedure_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_procedure_approvers TO authenticated;
GRANT ALL ON public.p2a_vcr_procedure_approvers TO service_role;
ALTER TABLE public.p2a_vcr_procedure_approvers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procedure_approvers_placeholder_read"  ON public.p2a_vcr_procedure_approvers FOR SELECT TO authenticated USING (true);
CREATE POLICY "procedure_approvers_placeholder_write" ON public.p2a_vcr_procedure_approvers FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_procedure_approvers_procedure ON public.p2a_vcr_procedure_approvers(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_approvers_user      ON public.p2a_vcr_procedure_approvers(user_id);

-- ============================================================
-- 8) p2a_vcr_procedure_attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.p2a_vcr_procedure_attachments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id        uuid NOT NULL REFERENCES public.p2a_vcr_procedures(id) ON DELETE CASCADE,
  kind                text NOT NULL CHECK (kind IN ('draft','markup','evidence')),
  file_name           text NOT NULL,
  file_url            text,
  file_size           bigint,
  mime_type           text,
  uploaded_by         uuid REFERENCES public.profiles(id),
  linked_approver_id  uuid REFERENCES public.p2a_vcr_procedure_approvers(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_procedure_attachments TO authenticated;
GRANT ALL ON public.p2a_vcr_procedure_attachments TO service_role;
ALTER TABLE public.p2a_vcr_procedure_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procedure_attachments_placeholder_read"  ON public.p2a_vcr_procedure_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "procedure_attachments_placeholder_write" ON public.p2a_vcr_procedure_attachments FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_procedure_attachments_procedure ON public.p2a_vcr_procedure_attachments(procedure_id);

-- ============================================================
-- 9) p2a_vcr_procedure_activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.p2a_vcr_procedure_activity_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id  uuid NOT NULL REFERENCES public.p2a_vcr_procedures(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.profiles(id),
  action        text NOT NULL,
  comment       text,
  from_status   public.procedure_status,
  to_status     public.procedure_status,
  created_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_procedure_activity_log TO authenticated;
GRANT ALL ON public.p2a_vcr_procedure_activity_log TO service_role;
ALTER TABLE public.p2a_vcr_procedure_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procedure_activity_placeholder_read"  ON public.p2a_vcr_procedure_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "procedure_activity_placeholder_write" ON public.p2a_vcr_procedure_activity_log FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_procedure_activity_procedure ON public.p2a_vcr_procedure_activity_log(procedure_id, created_at);

-- ============================================================
-- 10) updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS trg_procedure_approvers_updated  ON public.p2a_vcr_procedure_approvers;
CREATE TRIGGER trg_procedure_approvers_updated
  BEFORE UPDATE ON public.p2a_vcr_procedure_approvers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_procedure_attachments_updated ON public.p2a_vcr_procedure_attachments;
CREATE TRIGGER trg_procedure_attachments_updated
  BEFORE UPDATE ON public.p2a_vcr_procedure_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
