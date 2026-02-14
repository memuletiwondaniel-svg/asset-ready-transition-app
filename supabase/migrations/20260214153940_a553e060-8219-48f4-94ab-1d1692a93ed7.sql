-- Delete duplicate subsystems, keeping only the first one (by created_at)
DELETE FROM p2a_subsystems
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY system_id, subsystem_id ORDER BY created_at ASC) as rn
    FROM p2a_subsystems
  ) ranked
  WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE p2a_subsystems
ADD CONSTRAINT p2a_subsystems_system_id_subsystem_id_key UNIQUE (system_id, subsystem_id);