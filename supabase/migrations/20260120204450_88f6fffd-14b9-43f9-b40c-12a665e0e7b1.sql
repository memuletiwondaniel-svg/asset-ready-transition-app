-- Rename "Performance Test" to "Perf Test"
UPDATE p2a_deliverable_categories 
SET name = 'Perf Test'
WHERE id = 'ec124e98-effe-4e63-816a-05485388cf65';

-- Rename "Construction & Commissioning" to "Mech Comp (MC)"
UPDATE p2a_deliverable_categories 
SET name = 'Mech Comp (MC)', description = 'Mechanical completion status'
WHERE id = '3d7bbcd1-d752-43e2-a285-a85877127eeb';

-- Insert new RFSU category with display_order 2 (right after Mech Comp)
-- First shift all other categories up
UPDATE p2a_deliverable_categories 
SET display_order = display_order + 1
WHERE display_order >= 2;

-- Insert RFSU
INSERT INTO p2a_deliverable_categories (name, description, display_order, is_active)
VALUES ('RFSU', 'Ready for Start-Up', 2, true);