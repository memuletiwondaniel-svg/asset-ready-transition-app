-- Make phase_id nullable to allow independent VCR creation
ALTER TABLE public.p2a_handover_points 
  ALTER COLUMN phase_id DROP NOT NULL;

-- Add handover_plan_id to directly link VCRs to plans (for unassigned VCRs)
ALTER TABLE public.p2a_handover_points 
  ADD COLUMN IF NOT EXISTS handover_plan_id UUID REFERENCES public.p2a_handover_plans(id) ON DELETE CASCADE;

-- Update existing VCRs to have handover_plan_id based on their phase
UPDATE public.p2a_handover_points hp
SET handover_plan_id = ph.handover_plan_id
FROM public.p2a_project_phases ph
WHERE hp.phase_id = ph.id AND hp.handover_plan_id IS NULL;

-- Update generate_vcr_code function to work with handover_plan_id directly
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
  -- Count all VCRs for this project code directly from handover_plans
  SELECT COALESCE(MAX(
    CASE 
      WHEN hp.vcr_code ~ ('^VCR-' || p_project_code || '-[0-9]+$')
      THEN CAST(SUBSTRING(hp.vcr_code FROM '[0-9]+$') AS INTEGER)
      ELSE 0 
    END
  ), 0) + 1 INTO next_num
  FROM public.p2a_handover_points hp
  JOIN public.p2a_handover_plans pl ON hp.handover_plan_id = pl.id
  WHERE pl.project_code = p_project_code;
  
  vcr_code := 'VCR-' || p_project_code || '-' || LPAD(next_num::TEXT, 3, '0');
  RETURN vcr_code;
END;
$function$;