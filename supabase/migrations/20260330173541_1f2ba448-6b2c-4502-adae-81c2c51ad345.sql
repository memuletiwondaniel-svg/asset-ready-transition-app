
-- Vendor packages discovered by Selma's autonomous scanning
CREATE TABLE public.dms_vendor_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  project_code VARCHAR,
  vendor_code VARCHAR NOT NULL,
  vendor_name VARCHAR,
  po_number VARCHAR,
  package_tag VARCHAR,
  package_scope VARCHAR,
  document_type_codes TEXT[] DEFAULT '{}',
  total_documents_found INT DEFAULT 0,
  latest_status VARCHAR,
  discovery_source VARCHAR,
  discovered_from_doc VARCHAR,
  discovery_method VARCHAR DEFAULT 'scan',
  first_discovered_at TIMESTAMPTZ DEFAULT now(),
  last_scanned_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, vendor_code, po_number)
);

-- Enable RLS
ALTER TABLE public.dms_vendor_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dms_vendor_packages"
  ON public.dms_vendor_packages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert dms_vendor_packages"
  ON public.dms_vendor_packages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update dms_vendor_packages"
  ON public.dms_vendor_packages FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access dms_vendor_packages"
  ON public.dms_vendor_packages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_vendor_packages_project ON public.dms_vendor_packages(project_id);
CREATE INDEX idx_vendor_packages_vendor ON public.dms_vendor_packages(vendor_code);
CREATE INDEX idx_vendor_packages_po ON public.dms_vendor_packages(po_number);
