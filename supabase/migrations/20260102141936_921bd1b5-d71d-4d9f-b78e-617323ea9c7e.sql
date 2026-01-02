-- =====================================================
-- PSSR Reason Categories Hierarchical Configuration System
-- =====================================================

-- 1. Create pssr_reason_categories table
CREATE TABLE public.pssr_reason_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_delivery_party BOOLEAN NOT NULL DEFAULT false,
  allows_free_text BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pssr_reason_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for pssr_reason_categories
CREATE POLICY "Allow read access to pssr_reason_categories"
ON public.pssr_reason_categories FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to manage pssr_reason_categories"
ON public.pssr_reason_categories FOR ALL
USING (auth.role() = 'authenticated');

-- 2. Create pssr_delivery_parties table
CREATE TABLE public.pssr_delivery_parties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pssr_delivery_parties ENABLE ROW LEVEL SECURITY;

-- Create policies for pssr_delivery_parties
CREATE POLICY "Allow read access to pssr_delivery_parties"
ON public.pssr_delivery_parties FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to manage pssr_delivery_parties"
ON public.pssr_delivery_parties FOR ALL
USING (auth.role() = 'authenticated');

-- 3. Add new columns to pssr_reasons table
ALTER TABLE public.pssr_reasons 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.pssr_reason_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_ati_scopes BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_party_id UUID REFERENCES public.pssr_delivery_parties(id) ON DELETE SET NULL;

-- 4. Create pssr_reason_ati_scopes junction table
CREATE TABLE public.pssr_reason_ati_scopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reason_id UUID NOT NULL REFERENCES public.pssr_reasons(id) ON DELETE CASCADE,
  ati_scope_id UUID NOT NULL REFERENCES public.pssr_tie_in_scopes(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reason_id, ati_scope_id)
);

-- Enable RLS
ALTER TABLE public.pssr_reason_ati_scopes ENABLE ROW LEVEL SECURITY;

-- Create policies for pssr_reason_ati_scopes
CREATE POLICY "Allow read access to pssr_reason_ati_scopes"
ON public.pssr_reason_ati_scopes FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated users to manage pssr_reason_ati_scopes"
ON public.pssr_reason_ati_scopes FOR ALL
USING (auth.role() = 'authenticated');

-- 5. Insert seed data for categories
INSERT INTO public.pssr_reason_categories (code, name, description, display_order, requires_delivery_party, allows_free_text, icon)
VALUES
  ('PROJECT_STARTUP', 'Project Startup', 'Start-up related to project delivery by P&E or BFM', 1, true, false, 'Building2'),
  ('INCIDENCE', 'Start-Up after Incidence', 'Start-up following a safety incident or near miss', 2, false, false, 'AlertTriangle'),
  ('OPS_MTCE', 'Start-up after Operational Changes or Major Maintenance', 'Start-up after turnaround, major maintenance, or operational changes', 3, false, false, 'Wrench'),
  ('OTHERS', 'Others', 'Other reasons not covered by the above categories', 4, false, true, 'FileText');

-- 6. Insert seed data for delivery parties
INSERT INTO public.pssr_delivery_parties (code, name, description, display_order)
VALUES
  ('P&E', 'P&E - Projects & Engineering', 'Project delivery by Projects & Engineering team', 1),
  ('BFM', 'BFM - Brownfield Modification', 'Project delivery by Brownfield Modification team with Asset TA assurance', 2);

-- 7. Insert sub-reasons for each category
-- Get category IDs
DO $$
DECLARE
  project_startup_id UUID;
  incidence_id UUID;
  ops_mtce_id UUID;
  pe_id UUID;
  bfm_id UUID;
  ati_reason_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO project_startup_id FROM public.pssr_reason_categories WHERE code = 'PROJECT_STARTUP';
  SELECT id INTO incidence_id FROM public.pssr_reason_categories WHERE code = 'INCIDENCE';
  SELECT id INTO ops_mtce_id FROM public.pssr_reason_categories WHERE code = 'OPS_MTCE';
  
  -- Get delivery party IDs
  SELECT id INTO pe_id FROM public.pssr_delivery_parties WHERE code = 'P&E';
  SELECT id INTO bfm_id FROM public.pssr_delivery_parties WHERE code = 'BFM';

  -- Insert Project Startup sub-reasons (P&E)
  INSERT INTO public.pssr_reasons (name, display_order, category_id, delivery_party_id, requires_ati_scopes, status, is_active)
  VALUES
    ('Start-up of a new Plant, Equipment or Pipeline', 1, project_startup_id, pe_id, false, 'approved', true),
    ('Start-up after installation of Advanced Tie-in (ATI)', 2, project_startup_id, pe_id, true, 'approved', true);
  
  -- Insert Project Startup sub-reasons (BFM)
  INSERT INTO public.pssr_reasons (name, display_order, category_id, delivery_party_id, requires_ati_scopes, status, is_active)
  VALUES
    ('Start-up of a new Plant, Equipment or Pipeline', 3, project_startup_id, bfm_id, false, 'approved', true),
    ('Start-up after installation of Advanced Tie-in (ATI)', 4, project_startup_id, bfm_id, true, 'approved', true);

  -- Get ATI reason ID for P&E to link ATI scopes
  SELECT id INTO ati_reason_id FROM public.pssr_reasons 
  WHERE name = 'Start-up after installation of Advanced Tie-in (ATI)' 
  AND delivery_party_id = pe_id 
  LIMIT 1;
  
  -- Link all ATI scopes to P&E ATI reason
  INSERT INTO public.pssr_reason_ati_scopes (reason_id, ati_scope_id)
  SELECT ati_reason_id, id FROM public.pssr_tie_in_scopes WHERE is_active = true;

  -- Get ATI reason ID for BFM to link ATI scopes
  SELECT id INTO ati_reason_id FROM public.pssr_reasons 
  WHERE name = 'Start-up after installation of Advanced Tie-in (ATI)' 
  AND delivery_party_id = bfm_id 
  LIMIT 1;
  
  -- Link all ATI scopes to BFM ATI reason
  INSERT INTO public.pssr_reason_ati_scopes (reason_id, ati_scope_id)
  SELECT ati_reason_id, id FROM public.pssr_tie_in_scopes WHERE is_active = true;

  -- Insert Incidence sub-reasons
  INSERT INTO public.pssr_reasons (name, display_order, category_id, requires_ati_scopes, status, is_active)
  VALUES
    ('Start-up following a Process Safety Incidence or significant Near miss (Tier 1/2)', 1, incidence_id, false, 'approved', true),
    ('Start-up following activation of an ESD or FGS', 2, incidence_id, false, 'approved', true);

  -- Insert Ops & Mtce sub-reasons
  INSERT INTO public.pssr_reasons (name, display_order, category_id, requires_ati_scopes, status, is_active)
  VALUES
    ('Start-up after a Turnaround or Pitstop (e.g. NRNGL TAR)', 1, ops_mtce_id, false, 'approved', true),
    ('Start-up after major maintenance or overhaul of an equipment (e.g. Gas Compressor)', 2, ops_mtce_id, false, 'approved', true),
    ('Start-up following changes to operating modes or conditions', 3, ops_mtce_id, false, 'approved', true),
    ('Start-up of an idle or retired equipment', 4, ops_mtce_id, false, 'approved', true);
END $$;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pssr_reasons_category_id ON public.pssr_reasons(category_id);
CREATE INDEX IF NOT EXISTS idx_pssr_reasons_delivery_party_id ON public.pssr_reasons(delivery_party_id);
CREATE INDEX IF NOT EXISTS idx_pssr_reason_ati_scopes_reason_id ON public.pssr_reason_ati_scopes(reason_id);

-- 9. Create updated_at trigger for new tables
CREATE TRIGGER update_pssr_reason_categories_updated_at
  BEFORE UPDATE ON public.pssr_reason_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pssr_delivery_parties_updated_at
  BEFORE UPDATE ON public.pssr_delivery_parties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();