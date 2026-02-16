
-- VCR Execution Plan: Training entries
CREATE TABLE public.p2a_vcr_training (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_audience TEXT[] DEFAULT '{}',
  training_provider TEXT,
  duration_hours NUMERIC,
  tentative_date DATE,
  estimated_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'planned',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.p2a_vcr_training ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage VCR training" ON public.p2a_vcr_training FOR ALL USING (true) WITH CHECK (true);

-- VCR Execution Plan: Procedures
CREATE TABLE public.p2a_vcr_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  procedure_type TEXT NOT NULL DEFAULT 'operating',
  description TEXT,
  responsible_person TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'to_develop',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.p2a_vcr_procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage VCR procedures" ON public.p2a_vcr_procedures FOR ALL USING (true) WITH CHECK (true);

-- VCR Execution Plan: Tier 1 & 2 Deliverables
CREATE TABLE public.p2a_vcr_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'tier_1',
  description TEXT,
  responsible_person TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.p2a_vcr_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage VCR deliverables" ON public.p2a_vcr_deliverables FOR ALL USING (true) WITH CHECK (true);

-- VCR Execution Plan: Operational Log Sheets & Registers
CREATE TABLE public.p2a_vcr_operational_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  register_type TEXT NOT NULL DEFAULT 'logsheet',
  description TEXT,
  responsible_person TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'to_develop',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.p2a_vcr_operational_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage VCR operational registers" ON public.p2a_vcr_operational_registers FOR ALL USING (true) WITH CHECK (true);

-- VCR Execution Plan: Documentation
CREATE TABLE public.p2a_vcr_documentation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  responsible_person TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.p2a_vcr_documentation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage VCR documentation" ON public.p2a_vcr_documentation FOR ALL USING (true) WITH CHECK (true);
