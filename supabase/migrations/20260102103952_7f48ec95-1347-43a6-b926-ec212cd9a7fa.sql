-- Add UQST and UQMT as fields under UQ plant
INSERT INTO field (name, plant_id, is_active) VALUES 
  ('UQST - UQ Storage Terminal', 'dc4c5f3f-8e4d-46b3-adab-6d74cddb91b7', true),
  ('UQMT - UQ Marine Terminal', 'dc4c5f3f-8e4d-46b3-adab-6d74cddb91b7', true);

-- Add Pipelines as a new top-level plant
INSERT INTO plant (name, is_active) VALUES ('Pipelines', true);