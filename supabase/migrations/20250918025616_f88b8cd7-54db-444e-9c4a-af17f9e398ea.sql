-- Update existing checklist items to have hyphens in unique_id
UPDATE public.checklist_items 
SET unique_id = 
  CASE 
    WHEN unique_id ~ '^[A-Z]{2}[0-9]{2}$' 
    THEN SUBSTRING(unique_id, 1, 2) || '-' || SUBSTRING(unique_id, 3, 2)
    ELSE unique_id
  END
WHERE unique_id ~ '^[A-Z]{2}[0-9]{2}$' AND is_active = true;