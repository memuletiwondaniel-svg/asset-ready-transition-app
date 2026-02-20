
-- Create a function to generate plant-aware PSSR IDs
-- Format: PSSR-PLANTCODE-YEAR-SEQ (e.g., PSSR-NRNGL-2026-001)
CREATE OR REPLACE FUNCTION public.generate_pssr_code(plant_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  year_part TEXT;
  next_num INTEGER;
  pssr_code TEXT;
  clean_plant TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  clean_plant := UPPER(TRIM(plant_code));
  
  -- Count existing PSSRs for this plant and year
  SELECT COALESCE(MAX(
    CASE 
      WHEN pssr_id ~ ('^PSSR-' || clean_plant || '-' || year_part || '-[0-9]+$')
      THEN CAST(SUBSTRING(pssr_id FROM '[0-9]+$') AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_num
  FROM public.pssrs
  WHERE pssr_id LIKE 'PSSR-' || clean_plant || '-' || year_part || '-%';
  
  pssr_code := 'PSSR-' || clean_plant || '-' || year_part || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN pssr_code;
END;
$function$;

-- Add reason_id column to pssrs if not exists (to link to pssr_reasons table)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pssrs' AND column_name = 'reason_id') THEN
    ALTER TABLE public.pssrs ADD COLUMN reason_id UUID REFERENCES public.pssr_reasons(id);
  END IF;
END $$;
