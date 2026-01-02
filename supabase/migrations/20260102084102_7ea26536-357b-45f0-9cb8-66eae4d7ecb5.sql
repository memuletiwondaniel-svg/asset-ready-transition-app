-- Add display_order column to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Update Operations roles with the specified order
UPDATE roles SET display_order = 1 WHERE name = 'Prod Director';
UPDATE roles SET display_order = 2 WHERE name = 'Plant Director';
UPDATE roles SET display_order = 3 WHERE name = 'Dep. Plant Director';
UPDATE roles SET display_order = 4 WHERE name = 'Ops Team Lead';
UPDATE roles SET display_order = 5 WHERE name = 'Ops Coach';
UPDATE roles SET display_order = 6 WHERE name = 'Site Engr.';
UPDATE roles SET display_order = 7 WHERE name = 'ORA Engr.';
UPDATE roles SET display_order = 8 WHERE name = 'ORA Lead';
UPDATE roles SET display_order = 9 WHERE name = 'CMMS Lead';
UPDATE roles SET display_order = 10 WHERE name = 'CMMS Engr.';