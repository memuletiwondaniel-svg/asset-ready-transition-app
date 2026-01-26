-- Update the VCR code generation function to new format: VCR-XXX-DPYYY
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
  -- Count all VCRs for this project code and get next sequence number
  -- New format: VCR-XXX-DPYYY where XXX is sequence, YYY is project code
  SELECT COALESCE(MAX(
    CASE 
      WHEN hp.vcr_code ~ ('^VCR-[0-9]+-DP' || p_project_code || '$')
      THEN CAST(SUBSTRING(hp.vcr_code FROM '^VCR-([0-9]+)-DP') AS INTEGER)
      -- Also check old format for migration compatibility
      WHEN hp.vcr_code ~ ('^VCR-' || p_project_code || '-[0-9]+$')
      THEN CAST(SUBSTRING(hp.vcr_code FROM '[0-9]+$') AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_num
  FROM public.p2a_handover_points hp
  JOIN public.p2a_handover_plans pl ON hp.handover_plan_id = pl.id
  WHERE pl.project_code = p_project_code;
  
  -- New format: VCR-001-DP300
  vcr_code := 'VCR-' || LPAD(next_num::TEXT, 3, '0') || '-DP' || p_project_code;
  RETURN vcr_code;
END;
$function$;