-- Create a SECURITY DEFINER function to soft-delete checklist items and reorder sequence numbers
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
  WHERE unique_id = p_unique_id AND is_active = true
  LIMIT 1;

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Checklist item % not found or already inactive', p_unique_id;
  END IF;

  -- Soft delete the item
  UPDATE public.checklist_items
  SET is_active = false, updated_at = now()
  WHERE unique_id = p_unique_id;

  -- Re-sequence remaining items in the category
  PERFORM public.update_checklist_sequence_numbers(v_category);
END;
$$;

-- Allow both anon and authenticated roles to execute the function
GRANT EXECUTE ON FUNCTION public.soft_delete_checklist_item(text) TO anon, authenticated;