-- Update the assign_checklist_unique_id function to include hyphens
CREATE OR REPLACE FUNCTION public.assign_checklist_unique_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  ref_id text;
  next_seq integer;
BEGIN
  -- Get category ref ID
  ref_id := get_category_ref_id(NEW.category);
  
  -- Get next sequence number for this category
  SELECT COALESCE(MAX(sequence_number), 0) + 1 
  INTO next_seq
  FROM public.checklist_items 
  WHERE category = NEW.category AND is_active = true;
  
  -- Assign values with hyphen in unique_id
  NEW.category_ref_id := ref_id;
  NEW.sequence_number := next_seq;
  NEW.unique_id := ref_id || '-' || LPAD(next_seq::text, 2, '0');
  
  RETURN NEW;
END;
$function$;