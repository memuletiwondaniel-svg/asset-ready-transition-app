-- Delete PSSR checklist items first (they reference categories via FK)
DELETE FROM pssr_checklist_items;

-- Delete all existing PSSR checklist categories
DELETE FROM pssr_checklist_categories;

-- Insert the 5 VCR categories into PSSR checklist categories
INSERT INTO pssr_checklist_categories (name, ref_id, description, display_order, is_active) VALUES
  ('Design Integrity', 'DI', 'Compliance with Design and Engineering standards and requirements defined in the approved BfD', 1, true),
  ('Technical Integrity', 'TI', 'Safety Critical Equipment are installed and tested as per design and meet the agreed performance standards', 2, true),
  ('Operating Integrity', 'OI', 'Facility can be safely operated by competent operators and within approved operating envelops', 3, true),
  ('Management Systems', 'MS', 'Operational and Maintenance Management systems and frameworks required to support day-to-day operation and maintenance', 4, true),
  ('Health & Safety', 'HS', 'Compliance with HSE requirements and safety-critical systems', 5, true);