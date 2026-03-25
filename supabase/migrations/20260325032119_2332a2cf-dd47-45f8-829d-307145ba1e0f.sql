-- Phase 3: Document Ingest Queue for BOD/BDEP ingestion (Phase 9 preparation)
CREATE TABLE IF NOT EXISTS document_ingest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id UUID REFERENCES dms_document_types(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  vcr_id UUID,
  priority INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT now(),
  processed_at TIMESTAMP
);

ALTER TABLE document_ingest_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation read" ON document_ingest_queue
  FOR SELECT TO authenticated
  USING (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));

CREATE POLICY "Tenant isolation insert" ON document_ingest_queue
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));

COMMENT ON TABLE document_ingest_queue IS 'Queue for document ingestion into knowledge base. BOD priority=1, BDEP priority=2. Consumed by Phase 9 pgvector pipeline.';
