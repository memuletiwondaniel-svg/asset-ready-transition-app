
-- Step 1: Drop dependent objects first
DROP TABLE IF EXISTS public.ora_template_activities;

-- Drop existing RLS policies on ora_activity_catalog
DROP POLICY IF EXISTS "Authenticated users can read activities" ON public.ora_activity_catalog;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.ora_activity_catalog;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.ora_activity_catalog;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON public.ora_activity_catalog;

-- Drop old table
DROP TABLE IF EXISTS public.ora_activity_catalog;

-- Step 2: Create orp_phases reference table
CREATE TABLE public.orp_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orp_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read phases"
  ON public.orp_phases FOR SELECT TO authenticated USING (true);

-- Seed the 6 phases
INSERT INTO public.orp_phases (code, label, display_order) VALUES
  ('IDENTIFY', 'Identify', 1),
  ('ASSESS', 'Assess', 2),
  ('SELECT', 'Select', 3),
  ('DEFINE', 'Define', 4),
  ('EXECUTE', 'Execute', 5),
  ('OPERATE', 'Operate', 6);

-- Step 3: Recreate ora_activity_catalog with new schema
CREATE TABLE public.ora_activity_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_code TEXT NOT NULL UNIQUE DEFAULT '',
  activity TEXT NOT NULL,
  description TEXT,
  phase_id UUID REFERENCES public.orp_phases(id),
  parent_activity_id UUID REFERENCES public.ora_activity_catalog(id),
  duration_high INTEGER,
  duration_med INTEGER,
  duration_low INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Auto-generate activity_code trigger
CREATE OR REPLACE FUNCTION public.generate_ora_activity_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(activity_code FROM 'ORA-(\d+)') AS INTEGER)), 0) + 1
  INTO next_num FROM public.ora_activity_catalog;
  NEW.activity_code := 'ORA-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_generate_ora_activity_code
  BEFORE INSERT ON public.ora_activity_catalog
  FOR EACH ROW WHEN (NEW.activity_code IS NULL OR NEW.activity_code = '')
  EXECUTE FUNCTION public.generate_ora_activity_code();

-- Updated_at trigger
CREATE TRIGGER trg_ora_activity_updated_at
  BEFORE UPDATE ON public.ora_activity_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.ora_activity_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read activities"
  ON public.ora_activity_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert activities"
  ON public.ora_activity_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update activities"
  ON public.ora_activity_catalog FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete activities"
  ON public.ora_activity_catalog FOR DELETE TO authenticated USING (true);
