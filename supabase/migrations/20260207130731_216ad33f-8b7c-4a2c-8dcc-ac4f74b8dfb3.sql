
-- Drop the overly restrictive unique index that prevents a subsystem from being mapped at all
-- The correct constraint (p2a_handover_point_systems_unique_mapping) already exists
DROP INDEX IF EXISTS idx_p2a_hp_systems_unique_subsystem;
