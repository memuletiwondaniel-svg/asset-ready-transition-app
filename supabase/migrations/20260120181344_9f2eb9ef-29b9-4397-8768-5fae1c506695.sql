-- Update Documentation to Documents
UPDATE public.p2a_deliverable_categories 
SET name = 'Documents', description = 'Technical documents and records'
WHERE name = 'Documentation';

-- Remove Maintenance Readiness
UPDATE public.p2a_deliverable_categories 
SET is_active = false
WHERE name = 'Maintenance Readiness';

-- Insert new categories: CMMS, 2Y Spares, Procedures
-- First, shift display_order for existing categories to make room
UPDATE public.p2a_deliverable_categories 
SET display_order = display_order + 3
WHERE display_order >= 5 AND name != 'Maintenance Readiness';

-- Insert CMMS after Documents (display_order 5)
INSERT INTO public.p2a_deliverable_categories (name, description, display_order, is_active)
VALUES ('CMMS', 'Computerized Maintenance Management System', 5, true)
ON CONFLICT DO NOTHING;

-- Insert 2Y Spares (display_order 6)
INSERT INTO public.p2a_deliverable_categories (name, description, display_order, is_active)
VALUES ('2Y Spares', 'Two-year spare parts inventory', 6, true)
ON CONFLICT DO NOTHING;

-- Insert Procedures (display_order 7)
INSERT INTO public.p2a_deliverable_categories (name, description, display_order, is_active)
VALUES ('Procedures', 'Operating and maintenance procedures', 7, true)
ON CONFLICT DO NOTHING;