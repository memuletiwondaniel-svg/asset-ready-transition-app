-- Clear existing categories (will cascade to items due to foreign key)
DELETE FROM public.pssr_checklist_items;
DELETE FROM public.pssr_checklist_categories;

-- Insert new categories with ref_ids
INSERT INTO public.pssr_checklist_categories (name, ref_id, description, display_order, is_active) VALUES
('Technical Integrity', 'TI', 'Technical integrity related items', 1, true),
('Process Safety', 'PS', 'Process safety related items', 2, true),
('Organization', 'ORG', 'Organization related items', 3, true),
('Documentation', 'DOC', 'Documentation related items', 4, true),
('Emergency Response', 'ER', 'Emergency response related items', 5, true),
('HSE', 'HSE', 'Health, Safety & Environment related items', 6, true);