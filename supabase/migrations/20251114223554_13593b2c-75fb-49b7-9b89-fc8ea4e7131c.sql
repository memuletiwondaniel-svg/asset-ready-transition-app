-- Create positions table for standardized job titles
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  department TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- All users can view active positions
CREATE POLICY "All users can view active positions"
ON public.positions
FOR SELECT
USING (is_active = true);

-- Admin users can manage positions
CREATE POLICY "Admin users can manage positions"
ON public.positions
FOR ALL
USING (user_is_admin(auth.uid()));

-- Insert default positions
INSERT INTO public.positions (name, description, department, display_order) VALUES
  ('ORA Engineer', 'Operations Readiness Assurance Engineer', 'Operations', 1),
  ('Project Manager', 'Project Management Lead', 'Projects', 2),
  ('Operations Manager', 'Operations Department Manager', 'Operations', 3),
  ('Safety Engineer', 'Health, Safety & Environment Engineer', 'HSE', 4),
  ('Maintenance Engineer', 'Maintenance & Reliability Engineer', 'Maintenance', 5),
  ('Plant Engineer', 'Plant Operations Engineer', 'Operations', 6),
  ('QA/QC Engineer', 'Quality Assurance/Quality Control Engineer', 'Quality', 7),
  ('Technical Lead', 'Technical Leadership Role', 'Engineering', 8),
  ('Department Head', 'Department Leadership', 'Management', 9),
  ('Administrator', 'System Administrator', 'IT', 10)
ON CONFLICT (name) DO NOTHING;