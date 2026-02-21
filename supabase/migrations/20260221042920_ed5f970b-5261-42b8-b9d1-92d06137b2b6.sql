
-- Update the generate_pssr_code function to remove year from format
CREATE OR REPLACE FUNCTION public.generate_pssr_code(plant_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
  pssr_code TEXT;
  clean_plant TEXT;
BEGIN
  clean_plant := UPPER(TRIM(plant_code));
  
  -- Count existing PSSRs for this plant (new format without year)
  SELECT COALESCE(MAX(
    CASE 
      WHEN pssr_id ~ ('^PSSR-' || clean_plant || '-[0-9]+$')
      THEN CAST(SUBSTRING(pssr_id FROM '[0-9]+$') AS INTEGER)
      -- Also check old format with year for migration compatibility
      WHEN pssr_id ~ ('^PSSR-' || clean_plant || '-[0-9]{4}-[0-9]+$')
      THEN CAST(SUBSTRING(pssr_id FROM '[0-9]+$') AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_num
  FROM public.pssrs
  WHERE pssr_id LIKE 'PSSR-' || clean_plant || '-%';
  
  pssr_code := 'PSSR-' || clean_plant || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN pssr_code;
END;
$function$;

-- Update the existing record to new format
UPDATE public.pssrs SET pssr_id = 'PSSR-BNGL-001' WHERE pssr_id = 'PSSR-BNGL-2026-001';
