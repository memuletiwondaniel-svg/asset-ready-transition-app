
-- =============================================
-- VCR Documentation: Catalog & Selection Tables
-- =============================================

-- 1. Critical Documents Catalog (standard Tier 1/2 list)
CREATE TABLE IF NOT EXISTS public.p2a_vcr_doc_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  discipline TEXT,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('tier_1', 'tier_2')),
  rlmu_required BOOLEAN NOT NULL DEFAULT false,
  rlmu_scope TEXT, -- e.g. 'SoF', 'Handover', 'Both'
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.p2a_vcr_doc_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read doc catalog" ON public.p2a_vcr_doc_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage doc catalog" ON public.p2a_vcr_doc_catalog FOR ALL TO authenticated USING (user_is_admin(auth.uid()));

-- 2. Operational Registers Catalog
CREATE TABLE IF NOT EXISTS public.p2a_vcr_register_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  register_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discipline TEXT,
  register_type TEXT NOT NULL DEFAULT 'register' CHECK (register_type IN ('register', 'logsheet', 'checklist', 'form')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.p2a_vcr_register_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read register catalog" ON public.p2a_vcr_register_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage register catalog" ON public.p2a_vcr_register_catalog FOR ALL TO authenticated USING (user_is_admin(auth.uid()));

-- 3. Per-VCR Critical Document Selections
CREATE TABLE IF NOT EXISTS public.p2a_vcr_critical_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL,
  catalog_id UUID REFERENCES public.p2a_vcr_doc_catalog(id) ON DELETE CASCADE,
  -- Override fields (allow custom entries if catalog_id is null)
  doc_code TEXT,
  title TEXT,
  tier TEXT CHECK (tier IN ('tier_1', 'tier_2')),
  discipline TEXT,
  -- Tracking
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete')),
  responsible_person TEXT,
  target_date DATE,
  rlmu_required BOOLEAN NOT NULL DEFAULT false,
  rlmu_status TEXT DEFAULT 'not_required' CHECK (rlmu_status IN ('not_required', 'pending', 'submitted', 'approved')),
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.p2a_vcr_critical_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage critical docs" ON public.p2a_vcr_critical_docs FOR ALL TO authenticated USING (true);

CREATE TRIGGER update_p2a_vcr_critical_docs_updated_at
  BEFORE UPDATE ON public.p2a_vcr_critical_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Per-VCR Operational Register Selections
CREATE TABLE IF NOT EXISTS public.p2a_vcr_register_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL,
  catalog_id UUID REFERENCES public.p2a_vcr_register_catalog(id) ON DELETE CASCADE,
  -- Override / custom fields
  name TEXT,
  description TEXT,
  register_type TEXT DEFAULT 'register',
  -- New vs Update flag
  action_type TEXT NOT NULL DEFAULT 'new' CHECK (action_type IN ('new', 'update')),
  -- Tracking
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete')),
  responsible_person TEXT,
  target_date DATE,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.p2a_vcr_register_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage register selections" ON public.p2a_vcr_register_selections FOR ALL TO authenticated USING (true);

CREATE TRIGGER update_p2a_vcr_register_selections_updated_at
  BEFORE UPDATE ON public.p2a_vcr_register_selections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Per-VCR Logsheet Entries (free-text)
CREATE TABLE IF NOT EXISTS public.p2a_vcr_logsheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_point_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL DEFAULT 'new' CHECK (action_type IN ('new', 'update')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete')),
  responsible_person TEXT,
  target_date DATE,
  notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.p2a_vcr_logsheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage logsheets" ON public.p2a_vcr_logsheets FOR ALL TO authenticated USING (true);

CREATE TRIGGER update_p2a_vcr_logsheets_updated_at
  BEFORE UPDATE ON public.p2a_vcr_logsheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
