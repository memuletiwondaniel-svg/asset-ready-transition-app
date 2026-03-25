-- Phase 4: External DMS Sync Infrastructure

CREATE TABLE IF NOT EXISTS dms_external_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_number VARCHAR(200) NOT NULL,
  document_title VARCHAR(500),
  revision VARCHAR(20),
  status_code VARCHAR(50),
  discipline_code VARCHAR(20),
  package_tag VARCHAR(100),
  vendor_po_sequence VARCHAR(20),
  dms_platform VARCHAR(50) NOT NULL,
  external_url TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_status VARCHAR(20) DEFAULT 'success',
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, document_number, dms_platform)
);

ALTER TABLE dms_external_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read own tenant sync data"
  ON dms_external_sync FOR SELECT TO authenticated
  USING (tenant_id = (SELECT (auth.jwt()->'user_metadata'->>'tenant_id')::uuid));

CREATE POLICY "Service role full access on dms_external_sync"
  ON dms_external_sync FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS dms_sync_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  dms_platform VARCHAR(50) NOT NULL,
  base_url TEXT,
  username_encrypted TEXT,
  password_encrypted TEXT,
  project_code_field VARCHAR(100),
  last_sync_at TIMESTAMPTZ,
  mdr_last_fetched_at TIMESTAMPTZ,
  mdr_document_number VARCHAR(200),
  mdr_current_revision VARCHAR(20),
  sync_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, dms_platform)
);

ALTER TABLE dms_sync_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read dms_sync_credentials"
  ON dms_sync_credentials FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN profiles p ON p.role = rp.role_id
      WHERE p.user_id = (SELECT auth.uid())
        AND rp.permission = 'access_admin'
    )
  );

CREATE POLICY "Admin write dms_sync_credentials"
  ON dms_sync_credentials FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN profiles p ON p.role = rp.role_id
      WHERE p.user_id = (SELECT auth.uid())
        AND rp.permission = 'access_admin'
    )
  );

CREATE POLICY "Admin update dms_sync_credentials"
  ON dms_sync_credentials FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN profiles p ON p.role = rp.role_id
      WHERE p.user_id = (SELECT auth.uid())
        AND rp.permission = 'access_admin'
    )
  );

CREATE POLICY "Service role full access on dms_sync_credentials"
  ON dms_sync_credentials FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS dms_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID REFERENCES dms_sync_credentials(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  dms_platform VARCHAR(50) NOT NULL,
  synced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  new_documents INTEGER DEFAULT 0,
  status_changes INTEGER DEFAULT 0,
  sync_status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  triggered_by UUID,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dms_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read own tenant sync logs"
  ON dms_sync_logs FOR SELECT TO authenticated
  USING (tenant_id = (SELECT (auth.jwt()->'user_metadata'->>'tenant_id')::uuid));

CREATE POLICY "Service role full access on dms_sync_logs"
  ON dms_sync_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_dms_external_sync_project ON dms_external_sync(project_id, dms_platform);
CREATE INDEX idx_dms_external_sync_tenant ON dms_external_sync(tenant_id);
CREATE INDEX idx_dms_sync_logs_credential ON dms_sync_logs(credential_id);

COMMENT ON TABLE dms_external_sync IS 'Stores document status synced from external DMS platforms (Assai, Wrench, Documentum, SharePoint). Selma reads this for live document status.';
COMMENT ON TABLE dms_sync_credentials IS 'DMS platform connection credentials. Admin-only access.';
COMMENT ON TABLE dms_sync_logs IS 'Audit trail for all DMS sync operations.';