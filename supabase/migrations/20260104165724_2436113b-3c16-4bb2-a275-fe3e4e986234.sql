-- Add region_id (Portfolio) column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.project_region(id);

-- Create junction table for project-location (station) associations (one project can have multiple locations)
CREATE TABLE IF NOT EXISTS public.project_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.station(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, station_id)
);

-- Enable RLS on project_locations
ALTER TABLE public.project_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_locations
CREATE POLICY "Users can view project locations" 
ON public.project_locations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert project locations" 
ON public.project_locations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Users can update project locations" 
ON public.project_locations 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Users can delete project locations" 
ON public.project_locations 
FOR DELETE 
TO authenticated 
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_locations_project_id ON public.project_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_locations_station_id ON public.project_locations(station_id);
CREATE INDEX IF NOT EXISTS idx_projects_region_id ON public.projects(region_id);