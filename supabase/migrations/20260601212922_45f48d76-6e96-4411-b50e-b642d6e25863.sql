
-- 1. Stage discriminator + VCR point reference
ALTER TABLE public.p2a_handover_approvers
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'P2A'
    CHECK (stage IN ('P2A','VCR')),
  ADD COLUMN IF NOT EXISTS point_id uuid NULL
    REFERENCES public.p2a_handover_points(id) ON DELETE CASCADE;

ALTER TABLE public.p2a_handover_approvers
  DROP CONSTRAINT IF EXISTS p2a_handover_approvers_stage_point_check;
ALTER TABLE public.p2a_handover_approvers
  ADD CONSTRAINT p2a_handover_approvers_stage_point_check
    CHECK ((stage = 'P2A' AND point_id IS NULL) OR (stage = 'VCR' AND point_id IS NOT NULL));

-- 2. FK on handover_id -> plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='p2a_handover_approvers'
      AND constraint_type='FOREIGN KEY' AND constraint_name='p2a_handover_approvers_handover_id_fkey'
  ) THEN
    ALTER TABLE public.p2a_handover_approvers
      ADD CONSTRAINT p2a_handover_approvers_handover_id_fkey
      FOREIGN KEY (handover_id) REFERENCES public.p2a_handover_plans(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_p2a_approvers_handover_stage
  ON public.p2a_handover_approvers(handover_id, stage, status);
CREATE INDEX IF NOT EXISTS idx_p2a_approvers_point_stage
  ON public.p2a_handover_approvers(point_id, stage, status) WHERE point_id IS NOT NULL;

-- 4. P2A gate rewritten to read p2a_handover_approvers (β), stage='P2A'
CREATE OR REPLACE FUNCTION public.p2a_plan_is_approved(_plan_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _model text; _count int;
BEGIN
  SELECT gate_model INTO _model FROM public.p2a_handover_plans WHERE id = _plan_id;
  IF _model = 'legacy' THEN RETURN true; END IF;
  SELECT COUNT(DISTINCT a.role_name) INTO _count
  FROM public.p2a_handover_approvers a
  JOIN public.roles r ON r.name = a.role_name
  WHERE a.handover_id = _plan_id AND a.stage = 'P2A' AND a.status = 'APPROVED'
    AND a.role_name IN ('Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director')
    AND r.is_active = true AND r.is_retired = false;
  RETURN _count = 4;
END $function$;

-- 5. VCR gate rewritten with point_id key + stage='VCR'
DROP FUNCTION IF EXISTS public.vcr_plan_is_approved(uuid);
CREATE FUNCTION public.vcr_plan_is_approved(_point_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _model text; _count int;
BEGIN
  SELECT gate_model INTO _model FROM public.p2a_handover_points WHERE id = _point_id;
  IF _model = 'legacy' THEN RETURN true; END IF;
  SELECT COUNT(DISTINCT a.role_name) INTO _count
  FROM public.p2a_handover_approvers a
  JOIN public.roles r ON r.name = a.role_name
  WHERE a.point_id = _point_id AND a.stage = 'VCR' AND a.status = 'APPROVED'
    AND a.role_name IN ('Construction Lead','Commissioning Lead','Project Hub Lead','Dep. Plant Director')
    AND r.is_active = true AND r.is_retired = false;
  RETURN _count = 4;
END $function$;

-- 6. Backfill existing rows as P2A (default already covers, this is defensive)
UPDATE public.p2a_handover_approvers SET stage='P2A' WHERE stage IS NULL;
