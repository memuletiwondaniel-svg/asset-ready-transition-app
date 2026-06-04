-- ─── gohub_itr_items ────────────────────────────────────────
CREATE TABLE public.gohub_itr_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code    text NOT NULL,
  subsystem_number text NOT NULL,
  tag_guid        text NOT NULL,
  tag_code        text,
  tag_description text,
  discipline      text,
  itr_code        text NOT NULL,
  ab_phase        text CHECK (ab_phase IN ('A','B','?')),
  status          text NOT NULL CHECK (status IN ('open','complete')),
  raw             jsonb,
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gohub_itr_items_key UNIQUE (project_code, subsystem_number, tag_guid, itr_code)
);
CREATE INDEX idx_gohub_itr_items_subsystem ON public.gohub_itr_items(project_code, subsystem_number);
CREATE INDEX idx_gohub_itr_items_status    ON public.gohub_itr_items(project_code, subsystem_number, status);

GRANT SELECT ON public.gohub_itr_items TO authenticated;
GRANT ALL    ON public.gohub_itr_items TO service_role;
ALTER TABLE public.gohub_itr_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read gohub itr items"
  ON public.gohub_itr_items FOR SELECT TO authenticated USING (true);

-- ─── gohub_punch_items ──────────────────────────────────────
CREATE TABLE public.gohub_punch_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code    text NOT NULL,
  subsystem_number text NOT NULL,
  punchlist       text NOT NULL,
  item_no         integer NOT NULL,
  description     text,
  discipline      text,
  category        text,
  tag             text,
  itr             text,
  location        text,
  cleared_date    date,
  accepted_date   date,
  accepted_by     text,
  raw             jsonb,
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gohub_punch_items_key UNIQUE (project_code, punchlist, item_no)
);
CREATE INDEX idx_gohub_punch_items_subsystem ON public.gohub_punch_items(project_code, subsystem_number);
CREATE INDEX idx_gohub_punch_items_category  ON public.gohub_punch_items(project_code, subsystem_number, category);

GRANT SELECT ON public.gohub_punch_items TO authenticated;
GRANT ALL    ON public.gohub_punch_items TO service_role;
ALTER TABLE public.gohub_punch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read gohub punch items"
  ON public.gohub_punch_items FOR SELECT TO authenticated USING (true);

-- ─── gohub_certificates ─────────────────────────────────────
CREATE TABLE public.gohub_certificates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code    text NOT NULL,
  system_number   text,
  subsystem_number text,
  cert_type       text NOT NULL,
  object_id       text NOT NULL,
  discipline      text NOT NULL DEFAULT '',
  status          text,
  planned_date    date,
  actual_date     date,
  signed_by       text,
  raw             jsonb,
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gohub_certificates_key UNIQUE (project_code, cert_type, object_id, discipline)
);
CREATE INDEX idx_gohub_certificates_subsystem ON public.gohub_certificates(project_code, subsystem_number);
CREATE INDEX idx_gohub_certificates_system    ON public.gohub_certificates(project_code, system_number);
CREATE INDEX idx_gohub_certificates_type      ON public.gohub_certificates(project_code, cert_type);

GRANT SELECT ON public.gohub_certificates TO authenticated;
GRANT ALL    ON public.gohub_certificates TO service_role;
ALTER TABLE public.gohub_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read gohub certificates"
  ON public.gohub_certificates FOR SELECT TO authenticated USING (true);

-- ─── updated_at triggers ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gohub_detail_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_gohub_itr_items_updated_at
  BEFORE UPDATE ON public.gohub_itr_items
  FOR EACH ROW EXECUTE FUNCTION public.gohub_detail_set_updated_at();

CREATE TRIGGER trg_gohub_punch_items_updated_at
  BEFORE UPDATE ON public.gohub_punch_items
  FOR EACH ROW EXECUTE FUNCTION public.gohub_detail_set_updated_at();

CREATE TRIGGER trg_gohub_certificates_updated_at
  BEFORE UPDATE ON public.gohub_certificates
  FOR EACH ROW EXECUTE FUNCTION public.gohub_detail_set_updated_at();

-- ─── snapshot of GetSystems authoritative rollup on p2a_systems ───
-- Per decision: gohub-sync-counts should STOP owning total/complete counts.
-- The new columns below carry the authoritative GoC rollup separately,
-- leaving the existing itr_*/punchlist_* columns free for user/local logic.
ALTER TABLE public.p2a_systems
  ADD COLUMN IF NOT EXISTS gohub_rollup_total_itrs    integer,
  ADD COLUMN IF NOT EXISTS gohub_rollup_complete_itrs integer,
  ADD COLUMN IF NOT EXISTS gohub_rollup_synced_at     timestamptz;