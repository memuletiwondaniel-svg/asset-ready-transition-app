-- Update the function to perform hard deletion instead of soft deletion
CREATE OR REPLACE FUNCTION public.soft_delete_checklist_item(p_unique_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
BEGIN
  -- Fetch the category of the item to be deleted
  SELECT category INTO v_category
  FROM public.checklist_items
  WHERE unique_id = p_unique_id
  LIMIT 1;

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Checklist item % not found', p_unique_id;
  END IF;

  -- Hard delete the item (completely remove from database)
  DELETE FROM public.checklist_items
  WHERE unique_id = p_unique_id;

  -- Re-sequence remaining items in the category
  PERFORM public.update_checklist_sequence_numbers(v_category);
END;
$$;