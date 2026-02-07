-- Add project_id column to p2a_handover_plans so plans can be linked directly to projects
ALTER TABLE public.p2a_handover_plans
ADD COLUMN project_id UUID REFERENCES public.projects(id);

-- Create index for fast lookup by project
CREATE INDEX idx_p2a_handover_plans_project_id ON public.p2a_handover_plans(project_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';