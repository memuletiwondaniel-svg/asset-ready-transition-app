
-- ============================================================
-- W&H rebuild DB-1: structural changes only
-- ============================================================

-- 1) status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wh_status') THEN
    CREATE TYPE public.wh_status AS ENUM
      ('NOT_STARTED','SCHEDULED','UNDER_REVIEW','COMPLETED','REWORK_REQUESTED');
  END IF;
END $$;

-- 2) extend p2a_itp_activities
ALTER TABLE public.p2a_itp_activities
  ADD COLUMN IF NOT EXISTS status public.wh_status NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS delivering_party_role_id uuid REFERENCES public.roles(id),
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS outcome_summary text;

-- 3) backfill from JSON-in-notes where parseable
WITH parsed AS (
  SELECT id, notes,
         CASE WHEN notes IS NOT NULL AND btrim(notes) LIKE '{%' THEN
           (regexp_replace(notes, '^\s+|\s+$', '', 'g'))::jsonb
         END AS j
  FROM public.p2a_itp_activities
)
UPDATE public.p2a_itp_activities t
SET
  status = COALESCE(
    CASE lower(p.j->>'status')
      WHEN 'completed' THEN 'COMPLETED'::public.wh_status
      WHEN 'complete'  THEN 'COMPLETED'::public.wh_status
      WHEN 'scheduled' THEN 'SCHEDULED'::public.wh_status
      WHEN 'in progress' THEN 'UNDER_REVIEW'::public.wh_status
      WHEN 'in_progress' THEN 'UNDER_REVIEW'::public.wh_status
      WHEN 'under review' THEN 'UNDER_REVIEW'::public.wh_status
      WHEN 'under_review' THEN 'UNDER_REVIEW'::public.wh_status
      WHEN 'rework' THEN 'REWORK_REQUESTED'::public.wh_status
      WHEN 'rework_requested' THEN 'REWORK_REQUESTED'::public.wh_status
      WHEN 'not started' THEN 'NOT_STARTED'::public.wh_status
      WHEN 'not_started' THEN 'NOT_STARTED'::public.wh_status
      WHEN 'pending'     THEN 'NOT_STARTED'::public.wh_status
      ELSE NULL
    END,
    t.status
  ),
  scheduled_at = COALESCE(
    NULLIF(p.j->>'planned_date','')::timestamptz,
    t.scheduled_at
  ),
  completed_at = COALESCE(
    NULLIF(p.j->>'completed_date','')::timestamptz,
    t.completed_at
  )
FROM parsed p
WHERE p.id = t.id AND p.j IS NOT NULL;

-- Clear the JSON blob from notes; keep notes NULL when it was pure JSON
UPDATE public.p2a_itp_activities t
SET notes = NULL
WHERE notes IS NOT NULL
  AND btrim(notes) LIKE '{%'
  AND (
    -- valid JSON that we already absorbed
    (SELECT (btrim(t.notes))::jsonb) IS NOT NULL
  );

-- 4) accepting parties table
CREATE TABLE IF NOT EXISTS public.p2a_itp_accepting_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itp_activity_id uuid NOT NULL REFERENCES public.p2a_itp_activities(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  comment text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (itp_activity_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_itp_accepting_activity ON public.p2a_itp_accepting_parties(itp_activity_id);
CREATE INDEX IF NOT EXISTS idx_itp_accepting_user ON public.p2a_itp_accepting_parties(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_itp_accepting_parties TO authenticated;
GRANT ALL ON public.p2a_itp_accepting_parties TO service_role;

ALTER TABLE public.p2a_itp_accepting_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itp_accepting_read_auth"
  ON public.p2a_itp_accepting_parties FOR SELECT
  TO authenticated USING (true);

-- Writes reserved for service role in DB-1; DB-2 replaces with SNR-ORA + own-row policies.
CREATE POLICY "itp_accepting_write_service"
  ON public.p2a_itp_accepting_parties FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_p2a_itp_accepting_parties_updated_at
  BEFORE UPDATE ON public.p2a_itp_accepting_parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) activity log
CREATE TABLE IF NOT EXISTS public.p2a_itp_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itp_activity_id uuid NOT NULL REFERENCES public.p2a_itp_activities(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL
    CHECK (action IN ('scheduled','submitted','approved','rejected','comment','reopened')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_itp_log_activity ON public.p2a_itp_activity_log(itp_activity_id, created_at);

GRANT SELECT, INSERT ON public.p2a_itp_activity_log TO authenticated;
GRANT ALL ON public.p2a_itp_activity_log TO service_role;

ALTER TABLE public.p2a_itp_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itp_log_read_auth"
  ON public.p2a_itp_activity_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "itp_log_insert_self"
  ON public.p2a_itp_activity_log FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "itp_log_write_service"
  ON public.p2a_itp_activity_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 6) attachments
CREATE TABLE IF NOT EXISTS public.p2a_itp_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itp_activity_id uuid NOT NULL REFERENCES public.p2a_itp_activities(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('invite','evidence','review')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_itp_attach_activity ON public.p2a_itp_attachments(itp_activity_id);

GRANT SELECT, INSERT, DELETE ON public.p2a_itp_attachments TO authenticated;
GRANT ALL ON public.p2a_itp_attachments TO service_role;

ALTER TABLE public.p2a_itp_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itp_attach_read_auth"
  ON public.p2a_itp_attachments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "itp_attach_insert_self"
  ON public.p2a_itp_attachments FOR INSERT
  TO authenticated WITH CHECK (uploaded_by = auth.uid() OR uploaded_by IS NULL);

CREATE POLICY "itp_attach_delete_owner"
  ON public.p2a_itp_attachments FOR DELETE
  TO authenticated USING (uploaded_by = auth.uid());

CREATE POLICY "itp_attach_write_service"
  ON public.p2a_itp_attachments FOR ALL
  TO service_role USING (true) WITH CHECK (true);
