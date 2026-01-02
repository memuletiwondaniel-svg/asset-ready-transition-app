
-- Create project_region table
CREATE TABLE public.project_region (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create project_region_plant junction table
CREATE TABLE public.project_region_plant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.project_region(id) ON DELETE CASCADE,
  plant_id UUID NOT NULL REFERENCES public.plant(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plant_id) -- Each plant can only be in one region
);

-- Create project_region_station override table
CREATE TABLE public.project_region_station (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.project_region(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.station(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(station_id) -- Each station can only have one override
);

-- Enable RLS
ALTER TABLE public.project_region ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_region_plant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_region_station ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_region (read by all authenticated, write by admins)
CREATE POLICY "Allow read access to project regions" ON public.project_region
  FOR SELECT USING (true);

CREATE POLICY "Allow admin insert on project regions" ON public.project_region
  FOR INSERT WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Allow admin update on project regions" ON public.project_region
  FOR UPDATE USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Allow admin delete on project regions" ON public.project_region
  FOR DELETE USING (public.user_is_admin(auth.uid()));

-- RLS policies for project_region_plant
CREATE POLICY "Allow read access to region plants" ON public.project_region_plant
  FOR SELECT USING (true);

CREATE POLICY "Allow admin insert on region plants" ON public.project_region_plant
  FOR INSERT WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Allow admin update on region plants" ON public.project_region_plant
  FOR UPDATE USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Allow admin delete on region plants" ON public.project_region_plant
  FOR DELETE USING (public.user_is_admin(auth.uid()));

-- RLS policies for project_region_station
CREATE POLICY "Allow read access to region stations" ON public.project_region_station
  FOR SELECT USING (true);

CREATE POLICY "Allow admin insert on region stations" ON public.project_region_station
  FOR INSERT WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Allow admin update on region stations" ON public.project_region_station
  FOR UPDATE USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Allow admin delete on region stations" ON public.project_region_station
  FOR DELETE USING (public.user_is_admin(auth.uid()));

-- Insert initial regions
INSERT INTO public.project_region (name, description, display_order) VALUES 
  ('North', 'Northern region including BNGL, NRNGL, CS, and Pipelines', 1),
  ('Central', 'Central region including KAZ and Zubair Mishrif', 2),
  ('South', 'Southern region including UQ', 3);

-- Insert plant assignments
-- North: BNGL, NRNGL, CS, Pipelines
INSERT INTO public.project_region_plant (region_id, plant_id)
SELECT r.id, p.id
FROM public.project_region r, public.plant p
WHERE r.name = 'North' AND p.name IN ('BNGL', 'NRNGL', 'CS', 'Pipelines');

-- Central: KAZ
INSERT INTO public.project_region_plant (region_id, plant_id)
SELECT r.id, p.id
FROM public.project_region r, public.plant p
WHERE r.name = 'Central' AND p.name = 'KAZ';

-- South: UQ
INSERT INTO public.project_region_plant (region_id, plant_id)
SELECT r.id, p.id
FROM public.project_region r, public.plant p
WHERE r.name = 'South' AND p.name = 'UQ';

-- Station override: Zubair Mishrif (ZM) to Central
INSERT INTO public.project_region_station (region_id, station_id)
SELECT r.id, s.id
FROM public.project_region r, public.station s
WHERE r.name = 'Central' AND s.name = 'Zubair Mishrif (ZM)';

-- Create updated_at trigger
CREATE TRIGGER update_project_region_updated_at
  BEFORE UPDATE ON public.project_region
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
