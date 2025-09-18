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
$function$

-- Update the update_checklist_item_on_category_change function to include hyphens
CREATE OR REPLACE FUNCTION public.update_checklist_item_on_category_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_ref_id text;
  next_seq integer;
BEGIN
  -- Check if category changed
  IF TG_OP = 'UPDATE' AND OLD.category != NEW.category THEN
    -- Get new category ref ID
    new_ref_id := get_category_ref_id(NEW.category);
    
    -- Get next sequence number for the new category
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO next_seq
    FROM public.checklist_items 
    WHERE category = NEW.category AND is_active = true AND unique_id != NEW.unique_id;
    
    -- Update the item with new category reference including hyphen
    NEW.category_ref_id := new_ref_id;
    NEW.sequence_number := next_seq;
    NEW.unique_id := new_ref_id || '-' || LPAD(next_seq::text, 2, '0');
  END IF;
  
  RETURN NEW;
END;
$$

-- Update the update_checklist_sequence_numbers function to include hyphens
CREATE OR REPLACE FUNCTION public.update_checklist_sequence_numbers(target_category text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  WITH numbered_items AS (
    SELECT 
      ctid,
      ROW_NUMBER() OVER (ORDER BY sequence_number, created_at) as new_seq_num,
      get_category_ref_id(target_category) as ref_id
    FROM public.checklist_items
    WHERE category = target_category AND is_active = true
  )
  UPDATE public.checklist_items 
  SET 
    sequence_number = numbered_items.new_seq_num,
    unique_id = numbered_items.ref_id || '-' || LPAD(numbered_items.new_seq_num::text, 2, '0')
  FROM numbered_items 
  WHERE public.checklist_items.ctid = numbered_items.ctid;
END;
$function$