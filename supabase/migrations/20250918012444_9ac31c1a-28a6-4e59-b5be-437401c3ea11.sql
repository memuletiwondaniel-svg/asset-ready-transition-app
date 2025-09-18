-- Clear all entries from unique_id and category_ref_id columns in checklist_items table
UPDATE public.checklist_items 
SET 
  unique_id = NULL,
  category_ref_id = NULL;