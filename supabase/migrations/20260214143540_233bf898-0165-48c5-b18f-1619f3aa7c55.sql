
-- Step 1: Delete subsystems that reference duplicate systems (keeping subsystems of the first/oldest system)
DELETE FROM p2a_subsystems WHERE system_id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY system_id, handover_plan_id ORDER BY created_at ASC) as rn
    FROM p2a_systems
  ) d WHERE d.rn > 1
);

-- Step 2: Delete duplicate systems (keep the first/oldest per system_id + handover_plan_id)
DELETE FROM p2a_systems WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY system_id, handover_plan_id ORDER BY created_at ASC) as rn
    FROM p2a_systems
  ) d WHERE d.rn > 1
);

-- Step 3: Add a unique constraint to prevent future duplicates
ALTER TABLE p2a_systems ADD CONSTRAINT p2a_systems_system_id_handover_plan_id_unique 
  UNIQUE (system_id, handover_plan_id);
