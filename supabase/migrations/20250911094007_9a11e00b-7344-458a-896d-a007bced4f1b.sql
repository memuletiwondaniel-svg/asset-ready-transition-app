-- Fix the typo in category name and update to use DC reference ID
UPDATE public.checklist_items 
SET 
  category = 'Documentation',
  category_ref_id = 'DC',
  unique_id = 'DC' || LPAD(sequence_number::text, 2, '0')
WHERE category = 'Documenttaion' AND category_ref_id = 'XX';