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
$function$;