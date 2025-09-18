-- Create trigger to update unique_id when category changes
CREATE OR REPLACE FUNCTION public.update_checklist_item_on_category_change()
RETURNS TRIGGER AS $$
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
    
    -- Update the item with new category reference
    NEW.category_ref_id := new_ref_id;
    NEW.sequence_number := next_seq;
    NEW.unique_id := new_ref_id || LPAD(next_seq::text, 2, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_checklist_item_category ON public.checklist_items;
CREATE TRIGGER trigger_update_checklist_item_category
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_checklist_item_on_category_change();