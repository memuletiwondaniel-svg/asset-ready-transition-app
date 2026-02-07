
-- Drop the old unique constraint that doesn't account for subsystem_id
ALTER TABLE public.p2a_handover_point_systems
  DROP CONSTRAINT p2a_handover_point_systems_handover_point_id_system_id_key;

-- Create a new unique constraint that includes subsystem_id (using COALESCE for nulls)
-- We use a unique index with COALESCE to handle nullable subsystem_id
CREATE UNIQUE INDEX p2a_handover_point_systems_unique_mapping
  ON public.p2a_handover_point_systems (handover_point_id, system_id, COALESCE(subsystem_id, '00000000-0000-0000-0000-000000000000'));
