
-- SDR Register: stores expected vendor deliverables parsed from A01 documents
CREATE TABLE public.sdr_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_number VARCHAR NOT NULL,
  title VARCHAR,
  supplier_document_number VARCHAR,
  sdrl_code VARCHAR,
  discipline_code VARCHAR DEFAULT 'ZV',
  document_type_code VARCHAR,
  unit_code VARCHAR,
  originator_code VARCHAR,
  vendor_code VARCHAR,
  po_number VARCHAR,
  planned_submission_date DATE,
  current_status VARCHAR,
  current_revision VARCHAR,
  is_found_in_dms BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  sdr_source_doc VARCHAR,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, document_number, sdr_source_doc)
);

-- SDR Completeness Snapshots: per-vendor/PO gap tracking over time
CREATE TABLE public.sdr_completeness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vendor_code VARCHAR,
  po_number VARCHAR,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_expected INT DEFAULT 0,
  total_found INT DEFAULT 0,
  total_at_required_status INT DEFAULT 0,
  overdue_count INT DEFAULT 0,
  gap_summary JSONB,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sdr_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_completeness_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for sdr_register
CREATE POLICY "Authenticated users can read sdr_register"
  ON public.sdr_register FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sdr_register"
  ON public.sdr_register FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sdr_register"
  ON public.sdr_register FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Service role full access for edge functions
CREATE POLICY "Service role full access sdr_register"
  ON public.sdr_register FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS policies for sdr_completeness_snapshots
CREATE POLICY "Authenticated users can read sdr_completeness_snapshots"
  ON public.sdr_completeness_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sdr_completeness_snapshots"
  ON public.sdr_completeness_snapshots FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role full access sdr_completeness_snapshots"
  ON public.sdr_completeness_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_sdr_register_project_id ON public.sdr_register(project_id);
CREATE INDEX idx_sdr_register_vendor_code ON public.sdr_register(vendor_code);
CREATE INDEX idx_sdr_register_po_number ON public.sdr_register(po_number);
CREATE INDEX idx_sdr_register_sdr_source ON public.sdr_register(sdr_source_doc);
CREATE INDEX idx_sdr_snapshots_project_id ON public.sdr_completeness_snapshots(project_id);
CREATE INDEX idx_sdr_snapshots_vendor ON public.sdr_completeness_snapshots(vendor_code);
