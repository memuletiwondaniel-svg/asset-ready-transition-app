-- Create project_hub_region table to link hubs to regions
CREATE TABLE public.project_hub_region (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.project_region(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hub_id) -- Each hub can only be in one region
);

-- Enable RLS
ALTER TABLE public.project_hub_region ENABLE ROW LEVEL SECURITY;

-- Create policies for project_hub_region
CREATE POLICY "Allow authenticated users to view hub regions"
ON public.project_hub_region
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to manage hub regions"
ON public.project_hub_region
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_project_hub_region_region_id ON public.project_hub_region(region_id);
CREATE INDEX idx_project_hub_region_hub_id ON public.project_hub_region(hub_id);

-- Seed the initial hub-region assignments
-- First, let's get the region IDs and hub IDs

-- Insert hub-region mappings for North region
-- North hubs: West Qurna, Pipelines, NRNGL (will represent BNGL, NRNGL, NR/SR)
INSERT INTO public.project_hub_region (hub_id, region_id, display_order)
SELECT h.id, pr.id, 1
FROM public.hubs h, public.project_region pr
WHERE h.name = 'West Qurna' AND pr.name = 'North'
ON CONFLICT (hub_id) DO NOTHING;

INSERT INTO public.project_hub_region (hub_id, region_id, display_order)
SELECT h.id, pr.id, 2
FROM public.hubs h, public.project_region pr
WHERE h.name = 'Pipelines' AND pr.name = 'North'
ON CONFLICT (hub_id) DO NOTHING;

INSERT INTO public.project_hub_region (hub_id, region_id, display_order)
SELECT h.id, pr.id, 3
FROM public.hubs h, public.project_region pr
WHERE h.name = 'NRNGL' AND pr.name = 'North'
ON CONFLICT (hub_id) DO NOTHING;

-- Insert hub-region mappings for Central region
-- Central hubs: KAZ, Zubair
INSERT INTO public.project_hub_region (hub_id, region_id, display_order)
SELECT h.id, pr.id, 1
FROM public.hubs h, public.project_region pr
WHERE h.name = 'KAZ' AND pr.name = 'Central'
ON CONFLICT (hub_id) DO NOTHING;

INSERT INTO public.project_hub_region (hub_id, region_id, display_order)
SELECT h.id, pr.id, 2
FROM public.hubs h, public.project_region pr
WHERE h.name = 'Zubair' AND pr.name = 'Central'
ON CONFLICT (hub_id) DO NOTHING;