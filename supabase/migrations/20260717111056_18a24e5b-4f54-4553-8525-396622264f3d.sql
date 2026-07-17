
-- Extend milestone enum with MC and RFC (idempotent)
ALTER TYPE public.p2a_system_completion_status ADD VALUE IF NOT EXISTS 'MC' BEFORE 'RFO';
ALTER TYPE public.p2a_system_completion_status ADD VALUE IF NOT EXISTS 'RFC' BEFORE 'RFO';

-- Per-subsystem MCC / PCC milestone flags + dates
ALTER TABLE public.p2a_subsystems
  ADD COLUMN IF NOT EXISTS mcc_achieved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mcc_date     date,
  ADD COLUMN IF NOT EXISTS pcc_achieved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pcc_date     date;

-- ITR record enums
DO $$ BEGIN
  CREATE TYPE public.p2a_itr_phase AS ENUM ('A','B');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.p2a_itr_record_status AS ENUM ('Outstanding','Completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.p2a_punch_category AS ENUM ('A','B');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.p2a_punch_status AS ENUM ('Open','Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ITR records
CREATE TABLE IF NOT EXISTS public.p2a_system_itrs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id     uuid NOT NULL REFERENCES public.p2a_systems(id) ON DELETE CASCADE,
  subsystem_id  uuid NOT NULL REFERENCES public.p2a_subsystems(id) ON DELETE CASCADE,
  ref           text NOT NULL,
  description   text NOT NULL,
  phase         public.p2a_itr_phase NOT NULL,
  discipline    text,
  tag           text,
  status        public.p2a_itr_record_status NOT NULL DEFAULT 'Outstanding',
  completed_by  uuid REFERENCES public.profiles(id),
  completed_at  timestamptz,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, ref)
);

CREATE INDEX IF NOT EXISTS idx_p2a_system_itrs_system     ON public.p2a_system_itrs(system_id);
CREATE INDEX IF NOT EXISTS idx_p2a_system_itrs_subsystem  ON public.p2a_system_itrs(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_p2a_system_itrs_status     ON public.p2a_system_itrs(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_system_itrs TO authenticated;
GRANT ALL ON public.p2a_system_itrs TO service_role;

ALTER TABLE public.p2a_system_itrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ITRs readable to authenticated"
  ON public.p2a_system_itrs FOR SELECT TO authenticated USING (true);

CREATE POLICY "ITRs writable to authenticated"
  ON public.p2a_system_itrs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ITRs updatable by authenticated"
  ON public.p2a_system_itrs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "ITRs deletable by service role only"
  ON public.p2a_system_itrs FOR DELETE TO service_role USING (true);

-- Punchlist items
CREATE TABLE IF NOT EXISTS public.p2a_system_punch_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id     uuid NOT NULL REFERENCES public.p2a_systems(id) ON DELETE CASCADE,
  subsystem_id  uuid NOT NULL REFERENCES public.p2a_subsystems(id) ON DELETE CASCADE,
  ref           text NOT NULL,
  category      public.p2a_punch_category NOT NULL,
  description   text NOT NULL,
  status        public.p2a_punch_status NOT NULL DEFAULT 'Open',
  raised_by     uuid REFERENCES public.profiles(id),
  raised_at     timestamptz NOT NULL DEFAULT now(),
  cleared_by    uuid REFERENCES public.profiles(id),
  cleared_at    timestamptz,
  closure_note  text,
  linked_itr_ref text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (system_id, ref)
);

CREATE INDEX IF NOT EXISTS idx_p2a_punch_system    ON public.p2a_system_punch_items(system_id);
CREATE INDEX IF NOT EXISTS idx_p2a_punch_subsystem ON public.p2a_system_punch_items(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_p2a_punch_status    ON public.p2a_system_punch_items(status);
CREATE INDEX IF NOT EXISTS idx_p2a_punch_itr_ref   ON public.p2a_system_punch_items(linked_itr_ref);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_system_punch_items TO authenticated;
GRANT ALL ON public.p2a_system_punch_items TO service_role;

ALTER TABLE public.p2a_system_punch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Punch readable to authenticated"
  ON public.p2a_system_punch_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Punch writable to authenticated"
  ON public.p2a_system_punch_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Punch updatable by authenticated"
  ON public.p2a_system_punch_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Punch deletable by service role only"
  ON public.p2a_system_punch_items FOR DELETE TO service_role USING (true);

-- updated_at triggers (reuse existing helper)
DROP TRIGGER IF EXISTS trg_p2a_system_itrs_updated_at ON public.p2a_system_itrs;
CREATE TRIGGER trg_p2a_system_itrs_updated_at
  BEFORE UPDATE ON public.p2a_system_itrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_p2a_system_punch_items_updated_at ON public.p2a_system_punch_items;
CREATE TRIGGER trg_p2a_system_punch_items_updated_at
  BEFORE UPDATE ON public.p2a_system_punch_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
