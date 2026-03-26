-- Change tracking table: records what Selma detects each sync cycle
CREATE TABLE public.dms_sync_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_log_id uuid REFERENCES public.dms_sync_logs(id) ON DELETE CASCADE,
  document_sync_id uuid REFERENCES public.dms_external_sync(id) ON DELETE CASCADE,
  document_number varchar NOT NULL,
  change_type varchar NOT NULL CHECK (change_type IN ('new_document', 'status_change', 'revision_change', 'title_change', 'metadata_change')),
  field_changed varchar,
  old_value varchar,
  new_value varchar,
  project_code varchar,
  is_vcr_critical boolean DEFAULT false,
  tenant_id uuid REFERENCES public.tenants(id),
  detected_at timestamptz DEFAULT now()
);

CREATE INDEX idx_dms_sync_changes_sync_log ON public.dms_sync_changes(sync_log_id);
CREATE INDEX idx_dms_sync_changes_project ON public.dms_sync_changes(project_code);
CREATE INDEX idx_dms_sync_changes_vcr ON public.dms_sync_changes(is_vcr_critical) WHERE is_vcr_critical = true;
CREATE INDEX idx_dms_sync_changes_detected ON public.dms_sync_changes(detected_at DESC);

CREATE TABLE public.selma_config_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type varchar NOT NULL,
  config_data jsonb NOT NULL DEFAULT '{}',
  config_hash varchar,
  last_synced_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id),
  UNIQUE(config_type, tenant_id)
);

ALTER TABLE public.dms_sync_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selma_config_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sync changes"
  ON public.dms_sync_changes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages sync changes"
  ON public.dms_sync_changes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read config snapshots"
  ON public.selma_config_snapshot FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages config snapshots"
  ON public.selma_config_snapshot FOR INSERT TO authenticated
  WITH CHECK (true);