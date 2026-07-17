
-- Enums
DO $$ BEGIN
  CREATE TYPE public.p2a_maint_deliverable_key AS ENUM (
    'ASSET_REGISTER_BUILD','PM_ROUTINES','BOM','SPARES_2Y','RISKPOYNT','IMS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.p2a_maint_batch_status AS ENUM (
    'NOT_STARTED','DRAFT','QAQC_IN_PROGRESS','UPLOAD_IN_PROGRESS','COMPLETE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend deliverables
ALTER TABLE public.p2a_vcr_maintenance_deliverables
  ADD COLUMN IF NOT EXISTS deliverable_key public.p2a_maint_deliverable_key,
  ADD COLUMN IF NOT EXISTS display_name    text,
  ADD COLUMN IF NOT EXISTS cmms_lead_id    uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS central_mtce_lead_id uuid REFERENCES public.profiles(id);

-- Batches
CREATE TABLE IF NOT EXISTS public.p2a_vcr_maint_batches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES public.p2a_vcr_maintenance_deliverables(id) ON DELETE CASCADE,
  seq            int  NOT NULL,
  name           text NOT NULL,
  item_count     int  NOT NULL DEFAULT 0,
  status         public.p2a_maint_batch_status NOT NULL DEFAULT 'NOT_STARTED',
  approved_by    uuid REFERENCES public.profiles(id),
  approved_at    timestamptz,
  load_file_path text,
  upload_confirmation_path text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_maint_batches_deliverable ON public.p2a_vcr_maint_batches(deliverable_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_maint_batches TO authenticated;
GRANT ALL ON public.p2a_vcr_maint_batches TO service_role;

ALTER TABLE public.p2a_vcr_maint_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maint batches readable" ON public.p2a_vcr_maint_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maint batches writable" ON public.p2a_vcr_maint_batches
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Maint batches updatable" ON public.p2a_vcr_maint_batches
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Maint batches deletable by service" ON public.p2a_vcr_maint_batches
  FOR DELETE TO service_role USING (true);

-- Spares materials
CREATE TABLE IF NOT EXISTS public.p2a_vcr_maint_spares (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  uuid NOT NULL REFERENCES public.p2a_vcr_maintenance_deliverables(id) ON DELETE CASCADE,
  material_no     text NOT NULL,
  material_name   text NOT NULL,
  qty_ordered     numeric NOT NULL DEFAULT 0,
  pr_no           text,
  po_no           text,
  delivered       boolean NOT NULL DEFAULT false,
  display_order   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deliverable_id, material_no)
);

CREATE INDEX IF NOT EXISTS idx_maint_spares_deliverable ON public.p2a_vcr_maint_spares(deliverable_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_maint_spares TO authenticated;
GRANT ALL ON public.p2a_vcr_maint_spares TO service_role;

ALTER TABLE public.p2a_vcr_maint_spares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maint spares readable" ON public.p2a_vcr_maint_spares
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maint spares writable" ON public.p2a_vcr_maint_spares
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Maint spares updatable" ON public.p2a_vcr_maint_spares
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Maint spares deletable by service" ON public.p2a_vcr_maint_spares
  FOR DELETE TO service_role USING (true);

-- Attachments
CREATE TABLE IF NOT EXISTS public.p2a_vcr_maint_attachments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid REFERENCES public.p2a_vcr_maintenance_deliverables(id) ON DELETE CASCADE,
  batch_id       uuid REFERENCES public.p2a_vcr_maint_batches(id) ON DELETE CASCADE,
  file_name      text NOT NULL,
  file_path      text NOT NULL,
  file_size      bigint,
  content_type   text,
  uploaded_by    uuid REFERENCES public.profiles(id),
  attachment_kind text NOT NULL DEFAULT 'batch',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.p2a_vcr_maint_attachments TO authenticated;
GRANT ALL ON public.p2a_vcr_maint_attachments TO service_role;

ALTER TABLE public.p2a_vcr_maint_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maint attach readable" ON public.p2a_vcr_maint_attachments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maint attach writable" ON public.p2a_vcr_maint_attachments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Maint attach updatable by uploader" ON public.p2a_vcr_maint_attachments
  FOR UPDATE TO authenticated USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Maint attach deletable by uploader" ON public.p2a_vcr_maint_attachments
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- Activity log
CREATE TABLE IF NOT EXISTS public.p2a_vcr_maint_activity_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid REFERENCES public.p2a_vcr_maintenance_deliverables(id) ON DELETE CASCADE,
  batch_id       uuid REFERENCES public.p2a_vcr_maint_batches(id) ON DELETE CASCADE,
  actor_id       uuid REFERENCES public.profiles(id),
  action         text NOT NULL,
  comment        text,
  metadata       jsonb DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maint_log_deliverable ON public.p2a_vcr_maint_activity_log(deliverable_id);

GRANT SELECT, INSERT ON public.p2a_vcr_maint_activity_log TO authenticated;
GRANT ALL ON public.p2a_vcr_maint_activity_log TO service_role;

ALTER TABLE public.p2a_vcr_maint_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Maint log readable" ON public.p2a_vcr_maint_activity_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Maint log insertable" ON public.p2a_vcr_maint_activity_log
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- Add Central Mtce Lead + Asset Lead roles (idempotent)
INSERT INTO public.roles (name, description, code, is_b2b, scope, is_active)
  SELECT 'Central Mtce Lead', 'Central Maintenance Lead (accepting party for maintenance deliverables)', 'CENTRAL_MTCE_LEAD', true, 'org', true
  WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'CENTRAL_MTCE_LEAD');

INSERT INTO public.roles (name, description, code, is_b2b, scope, is_active)
  SELECT 'Asset Lead', 'Asset Lead (approver on maintenance batches)', 'ASSET_LEAD', false, 'project', true
  WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'ASSET_LEAD');

-- Timestamp triggers
DROP TRIGGER IF EXISTS trg_maint_batches_updated_at ON public.p2a_vcr_maint_batches;
CREATE TRIGGER trg_maint_batches_updated_at
  BEFORE UPDATE ON public.p2a_vcr_maint_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_maint_spares_updated_at ON public.p2a_vcr_maint_spares;
CREATE TRIGGER trg_maint_spares_updated_at
  BEFORE UPDATE ON public.p2a_vcr_maint_spares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_maint_attach_updated_at ON public.p2a_vcr_maint_attachments;
CREATE TRIGGER trg_maint_attach_updated_at
  BEFORE UPDATE ON public.p2a_vcr_maint_attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
