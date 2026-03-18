
-- Create DMS Disciplines table
CREATE TABLE public.dms_disciplines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dms_disciplines ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Authenticated users can view disciplines"
  ON public.dms_disciplines FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert/update/delete (admin restriction can be added later)
CREATE POLICY "Authenticated users can insert disciplines"
  ON public.dms_disciplines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update disciplines"
  ON public.dms_disciplines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete disciplines"
  ON public.dms_disciplines FOR DELETE
  TO authenticated
  USING (true);

-- Seed data from Excel
INSERT INTO public.dms_disciplines (code, name, display_order) VALUES
  ('AA', 'Management & Project Eng', 1),
  ('BA', 'Construction', 2),
  ('BC', 'Commissioning', 3),
  ('CB', 'Architectural', 4),
  ('CG', 'Geotechnical/Foundation', 5),
  ('CI', 'Infrastructure', 6),
  ('CS', 'Structures', 7),
  ('CX', 'Civil & Structural Other', 8),
  ('EA', 'Electrical', 9),
  ('FA', 'Cost and Planning', 10),
  ('HE', 'Environmental', 11),
  ('HH', 'Health', 12),
  ('HP', 'Security', 13),
  ('HS', 'Safety', 14),
  ('HX', 'HSE&S General', 15),
  ('IN', 'Instrumentation', 16),
  ('JA', 'Information Management', 17),
  ('KA', 'Information Technology', 18),
  ('LA', 'Pipelines', 19),
  ('MH', 'HVAC', 20),
  ('MP', 'Piping', 21),
  ('MR', 'Rotating Equipment', 22),
  ('MS', 'Mechanical - Static', 23),
  ('MX', 'Mechanical Other', 24),
  ('NA', 'Engineering Maintenance', 25),
  ('OA', 'Operations', 26),
  ('PX', 'Process Other', 27),
  ('QA', 'Quality Assurance', 28),
  ('RA', 'Materials and Corrosion', 29),
  ('SA', 'Logistics', 30),
  ('TA', 'Telecommunication', 31),
  ('UA', 'Subsea', 32),
  ('VA', 'Contracting and Procurement', 33),
  ('WA', 'Metocean and Ice', 34),
  ('WB', 'Marine', 35),
  ('ZF', 'Finance', 36),
  ('ZE', 'Geology', 37),
  ('ZG', 'Geomatics', 38),
  ('ZH', 'Human Resources', 39),
  ('ZP', 'Petrophysics', 40),
  ('ZR', 'Reservoir Engineering', 41),
  ('ZS', 'Geophysics', 42),
  ('ZT', 'Production Technology', 43),
  ('ZV', 'Vendor Documentation', 44),
  ('ZW', 'Well Engineering', 45);
