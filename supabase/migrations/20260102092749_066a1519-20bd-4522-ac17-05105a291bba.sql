-- Add Section Head role under Operations category
INSERT INTO public.roles (name, description, category_id, is_active, display_order)
SELECT 
  'Section Head',
  'Section Head - Operations',
  rc.id,
  true,
  11
FROM public.role_category rc 
WHERE rc.name = 'Operations'
AND NOT EXISTS (
  SELECT 1 FROM public.roles r 
  WHERE r.name = 'Section Head' 
  AND r.category_id = rc.id
);