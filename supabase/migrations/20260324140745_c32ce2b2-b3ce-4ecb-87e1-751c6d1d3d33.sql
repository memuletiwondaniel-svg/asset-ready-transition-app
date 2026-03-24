-- Phase 1: Document Data Model Foundation
-- Vendor documents follow pattern {PROJECT}-ZV-{PO_SEQUENCE}-{SEQ}.
-- The PO_SEQUENCE (5-6 digits after ZV-) maps to document_po_structure.vendor_po_sequence
-- and identifies all documents belonging to the same vendor package.

-- 1. Add 6 new columns to dms_document_types
ALTER TABLE dms_document_types
  ADD COLUMN IF NOT EXISTS package_tag VARCHAR(100),
  ADD COLUMN IF NOT EXISTS document_scope VARCHAR(20) DEFAULT 'discipline',
  ADD COLUMN IF NOT EXISTS po_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vendor_po_sequence VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_mdr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_vendor_document BOOLEAN DEFAULT FALSE;

ALTER TABLE dms_document_types
  ADD CONSTRAINT chk_document_scope CHECK (document_scope IN ('project', 'discipline', 'package'));

-- 2. Create document_po_structure table
CREATE TABLE IF NOT EXISTS document_po_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  po_number VARCHAR(50),
  po_description VARCHAR(500),
  vendor_po_sequence VARCHAR(20),
  package_tag VARCHAR(100),
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE document_po_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation read" ON document_po_structure
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid));

CREATE POLICY "Tenant isolation insert" ON document_po_structure
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid));

CREATE POLICY "Tenant isolation update" ON document_po_structure
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid))
  WITH CHECK (tenant_id = (SELECT (auth.jwt()->>'tenant_id')::uuid));