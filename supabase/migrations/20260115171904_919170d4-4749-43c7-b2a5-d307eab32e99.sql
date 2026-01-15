-- First, add missing roles for the P&E and Asset organizations
-- TA2 roles for P&E organization
INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Process - P&E', 'TA2 Process Engineer (Projects & Engineering)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Process - P&E');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Elect - P&E', 'TA2 Electrical Engineer (Projects & Engineering)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Elect - P&E');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Rotating - P&E', 'TA2 Rotating Equipment Engineer (Projects & Engineering)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Rotating - P&E');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Static - P&E', 'TA2 Static Equipment Engineer (Projects & Engineering)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Static - P&E');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Civil - P&E', 'TA2 Civil Engineer (Projects & Engineering)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Civil - P&E');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 TSE - P&E', 'TA2 Technical Safety Engineer (Projects & Engineering)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 TSE - P&E');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 PACO - P&E', 'TA2 Process Automation and Control (Projects & Engineering)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 PACO - P&E');

-- TA2 roles for Asset organization
INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Process - Asset', 'TA2 Process Engineer (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Process - Asset');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Elect - Asset', 'TA2 Electrical Engineer (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Elect - Asset');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Rotating - Asset', 'TA2 Rotating Equipment Engineer (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Rotating - Asset');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Static - Asset', 'TA2 Static Equipment Engineer (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Static - Asset');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 Civil - Asset', 'TA2 Civil Engineer (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 Civil - Asset');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 TSE - Asset', 'TA2 Technical Safety Engineer (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 TSE - Asset');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 PACO - Asset', 'TA2 Process Automation and Control (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 PACO - Asset');

INSERT INTO public.roles (name, description, is_active)
SELECT 'TA2 MCI - Asset', 'TA2 Materials & Corrosion Inspection (Asset)', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'TA2 MCI - Asset');

-- Other missing roles
INSERT INTO public.roles (name, description, is_active)
SELECT 'MMS Lead', 'Maintenance Management System Lead', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'MMS Lead');

INSERT INTO public.roles (name, description, is_active)
SELECT 'MTCE Lead', 'Maintenance Lead', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'MTCE Lead');

INSERT INTO public.roles (name, description, is_active)
SELECT 'Inventory Manager', 'Inventory Manager', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'Inventory Manager');

-- Create junction table for multiple delivering parties
CREATE TABLE IF NOT EXISTS public.pac_prerequisite_delivering_parties (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prerequisite_id UUID NOT NULL REFERENCES public.pac_prerequisites(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(prerequisite_id, role_id)
);

-- Create junction table for multiple receiving parties
CREATE TABLE IF NOT EXISTS public.pac_prerequisite_receiving_parties (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prerequisite_id UUID NOT NULL REFERENCES public.pac_prerequisites(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(prerequisite_id, role_id)
);

-- Enable RLS
ALTER TABLE public.pac_prerequisite_delivering_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pac_prerequisite_receiving_parties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivering parties
CREATE POLICY "Anyone can view PAC prerequisite delivering parties"
ON public.pac_prerequisite_delivering_parties FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage PAC prerequisite delivering parties"
ON public.pac_prerequisite_delivering_parties FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS Policies for receiving parties
CREATE POLICY "Anyone can view PAC prerequisite receiving parties"
ON public.pac_prerequisite_receiving_parties FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage PAC prerequisite receiving parties"
ON public.pac_prerequisite_receiving_parties FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_pac_prereq_delivering_prereq ON public.pac_prerequisite_delivering_parties(prerequisite_id);
CREATE INDEX idx_pac_prereq_receiving_prereq ON public.pac_prerequisite_receiving_parties(prerequisite_id);