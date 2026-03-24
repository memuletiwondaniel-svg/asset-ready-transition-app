
-- FIX 1: Insert Zain and Alex into ai_agent_registry (using 'inactive' for planned agents)
INSERT INTO ai_agent_registry (agent_code, display_name, model_id, status, domain_tags, tools_count, description)
VALUES 
  ('training_agent', 'Zain', 'claude-haiku-4-5-20251001', 'inactive', 
   ARRAY['training','competency','learning','ora_training','training_plan','training_readiness','cost_tracking'], 
   0, 
   'Zain is ORSH''s Training Intelligence Agent. He handles training plan analysis, competency gap identification, cost tracking, materials approval and training readiness scoring. Zain runs on Claude Haiku for fast structured training queries.'),
  ('cmms_agent', 'Alex', 'claude-haiku-4-5-20251001', 'inactive', 
   ARRAY['cmms','maintenance','equipment','spare_parts','asset_register','preventive_maintenance','maintenance_readiness'], 
   0, 
   'Alex is ORSH''s CMMS and Maintenance Intelligence Agent. He handles equipment care plans, maintenance readiness, spare parts procurement, preventive maintenance scheduling and asset register intelligence. Alex runs on Claude Haiku for fast lookup-heavy maintenance queries.');

-- FIX 2a: Create vcr_document_requirements table
CREATE TABLE IF NOT EXISTS vcr_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vcr_id UUID REFERENCES p2a_handover_points(id) ON DELETE CASCADE,
  document_type_id UUID REFERENCES dms_document_types(id),
  document_scope VARCHAR(20) DEFAULT 'discipline' CHECK (document_scope IN ('project','discipline','package')),
  package_tag VARCHAR(100),
  discipline_code VARCHAR(10),
  is_mdr BOOLEAN DEFAULT FALSE,
  po_number VARCHAR(50),
  vendor_po_sequence VARCHAR(20),
  status VARCHAR(20) DEFAULT 'required' CHECK (status IN ('required','received','superseded','waived')),
  identified_by UUID,
  identified_at TIMESTAMP DEFAULT now(),
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE vcr_document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vcr_doc_req_select" ON vcr_document_requirements
  FOR SELECT TO authenticated
  USING (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));

CREATE POLICY "vcr_doc_req_insert" ON vcr_document_requirements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));

CREATE POLICY "vcr_doc_req_update" ON vcr_document_requirements
  FOR UPDATE TO authenticated
  USING (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid))
  WITH CHECK (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));

-- FIX 2b: Create document_packages table
CREATE TABLE IF NOT EXISTS document_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  package_name VARCHAR(200) NOT NULL,
  package_tag VARCHAR(100) NOT NULL,
  po_number VARCHAR(50),
  vendor_name VARCHAR(200),
  description TEXT,
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE document_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_packages_select" ON document_packages
  FOR SELECT TO authenticated
  USING (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));

CREATE POLICY "doc_packages_insert" ON document_packages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));

CREATE POLICY "doc_packages_update" ON document_packages
  FOR UPDATE TO authenticated
  USING (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid))
  WITH CHECK (tenant_id = (select (auth.jwt()->>'tenant_id')::uuid));
