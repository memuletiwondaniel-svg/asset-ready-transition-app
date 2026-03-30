
-- MDR Register: stores expected documents parsed from 6611 MDR documents
CREATE TABLE public.mdr_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  document_number VARCHAR NOT NULL,
  title VARCHAR,
  discipline_code VARCHAR,
  document_type_code VARCHAR,
  unit_code VARCHAR,
  originator_code VARCHAR,
  final_rev_requirement VARCHAR,
  current_status VARCHAR,
  current_revision VARCHAR,
  is_found_in_dms BOOLEAN DEFAULT false,
  is_tier1 BOOLEAN DEFAULT false,
  is_tier2 BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  mdr_source_doc VARCHAR,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one row per document per project per MDR source
CREATE UNIQUE INDEX idx_mdr_register_unique ON public.mdr_register (project_id, document_number, mdr_source_doc);

-- Index for common queries
CREATE INDEX idx_mdr_register_project ON public.mdr_register (project_id);
CREATE INDEX idx_mdr_register_tenant ON public.mdr_register (tenant_id);

ALTER TABLE public.mdr_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mdr_register"
  ON public.mdr_register FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mdr_register"
  ON public.mdr_register FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update mdr_register"
  ON public.mdr_register FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- MDR Completeness Snapshots: point-in-time gap analysis
CREATE TABLE public.mdr_completeness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_expected INT DEFAULT 0,
  total_found INT DEFAULT 0,
  total_at_final_status INT DEFAULT 0,
  tier1_expected INT DEFAULT 0,
  tier1_complete INT DEFAULT 0,
  tier2_expected INT DEFAULT 0,
  tier2_complete INT DEFAULT 0,
  gap_summary JSONB DEFAULT '{}'::jsonb,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mdr_snapshots_project ON public.mdr_completeness_snapshots (project_id);
CREATE INDEX idx_mdr_snapshots_tenant ON public.mdr_completeness_snapshots (tenant_id);

ALTER TABLE public.mdr_completeness_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mdr_completeness_snapshots"
  ON public.mdr_completeness_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mdr_completeness_snapshots"
  ON public.mdr_completeness_snapshots FOR INSERT TO authenticated
  WITH CHECK (true);
