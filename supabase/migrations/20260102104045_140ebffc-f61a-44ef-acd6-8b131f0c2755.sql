-- Add display_order column to plant table
ALTER TABLE plant ADD COLUMN display_order integer DEFAULT 0;

-- Set display order for existing plants (Pipelines last)
UPDATE plant SET display_order = 1 WHERE name = 'BNGL';
UPDATE plant SET display_order = 2 WHERE name = 'CS';
UPDATE plant SET display_order = 3 WHERE name = 'KAZ';
UPDATE plant SET display_order = 4 WHERE name = 'NRNGL';
UPDATE plant SET display_order = 5 WHERE name = 'UQ';
UPDATE plant SET display_order = 100 WHERE name = 'Pipelines';