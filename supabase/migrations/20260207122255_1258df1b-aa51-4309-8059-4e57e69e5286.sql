-- Add subsystem_id column to track subsystem-level VCR assignments
-- NULL = full system mapped, non-NULL = specific subsystem mapped
ALTER TABLE public.p2a_handover_point_systems 
ADD COLUMN subsystem_id uuid REFERENCES public.p2a_subsystems(id) ON DELETE CASCADE;

-- Add index for subsystem lookups
CREATE INDEX idx_p2a_hp_systems_subsystem_id ON public.p2a_handover_point_systems(subsystem_id) WHERE subsystem_id IS NOT NULL;

-- Add unique constraint to prevent duplicate subsystem assignments
-- A subsystem can only be assigned to one handover point
CREATE UNIQUE INDEX idx_p2a_hp_systems_unique_subsystem 
ON public.p2a_handover_point_systems(subsystem_id) 
WHERE subsystem_id IS NOT NULL;