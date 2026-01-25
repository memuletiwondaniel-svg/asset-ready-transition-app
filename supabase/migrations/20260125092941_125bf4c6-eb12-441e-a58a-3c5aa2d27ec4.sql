-- Drop and recreate the function with fixed parameter name
DROP FUNCTION IF EXISTS public.generate_vcr_code(text);

CREATE OR REPLACE FUNCTION public.generate_vcr_code(p_project_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
  vcr_code TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN hp.vcr_code ~ ('^VCR-' || p_project_code || '-[0-9]+$')
      THEN CAST(SUBSTRING(hp.vcr_code FROM '[0-9]+$') AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_num
  FROM public.p2a_handover_points hp
  JOIN public.p2a_project_phases ph ON hp.phase_id = ph.id
  JOIN public.p2a_handover_plans pl ON ph.handover_plan_id = pl.id
  WHERE pl.project_code = p_project_code;
  
  vcr_code := 'VCR-' || p_project_code || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN vcr_code;
END;
$function$;