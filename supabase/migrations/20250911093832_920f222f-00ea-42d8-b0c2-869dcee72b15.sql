-- Update the get_category_ref_id function to include Documentation -> DC mapping
CREATE OR REPLACE FUNCTION public.get_category_ref_id(category_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  CASE LOWER(category_name)
    WHEN 'general' THEN RETURN 'GN';
    WHEN 'process safety' THEN RETURN 'PS';
    WHEN 'organization' THEN RETURN 'OR';
    WHEN 'health & safety' THEN RETURN 'HS';
    WHEN 'emergency response' THEN RETURN 'ER';
    WHEN 'paco' THEN RETURN 'IN';
    WHEN 'static' THEN RETURN 'MS';
    WHEN 'rotating' THEN RETURN 'MR';
    WHEN 'civil' THEN RETURN 'CX';
    WHEN 'elect' THEN RETURN 'EL';
    WHEN 'documentation' THEN RETURN 'DC';
    ELSE RETURN 'XX'; -- Default for unknown categories
  END CASE;
END;
$function$;

-- Update existing checklist items that have XX category_ref_id for Documentation category
UPDATE public.checklist_items 
SET 
  category_ref_id = 'DC',
  unique_id = 'DC' || LPAD(sequence_number::text, 2, '0')
WHERE category = 'Documentation' AND category_ref_id = 'XX';