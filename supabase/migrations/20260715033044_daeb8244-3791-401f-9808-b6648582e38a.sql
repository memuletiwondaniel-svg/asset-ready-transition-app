
-- 1) Canonical SoF seeder: 4 directors, all Level 1 (parallel).
CREATE OR REPLACE FUNCTION public.seed_vcr_sof_approvers(p_hp uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plan uuid; v_project uuid;
  v_roles text[] := ARRAY['Plant Director','HSE Director','P&E Director','P&M Director'];
  v_role text; v_user uuid; v_name text;
BEGIN
  IF p_hp IS NULL THEN RETURN; END IF;
  SELECT handover_plan_id INTO v_plan FROM public.p2a_handover_points WHERE id = p_hp;
  IF v_plan IS NULL THEN RETURN; END IF;
  SELECT project_id INTO v_project FROM public.p2a_handover_plans WHERE id = v_plan;

  FOREACH v_role IN ARRAY v_roles LOOP
    IF EXISTS (SELECT 1 FROM public.vcr_sof_approvers WHERE handover_point_id = p_hp AND approver_role = v_role) THEN CONTINUE; END IF;
    v_user := public.resolve_project_role_user(v_project, v_role);
    IF v_user IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.vcr_sof_approvers WHERE handover_point_id = p_hp AND user_id = v_user
    ) THEN v_user := NULL; END IF;
    v_name := NULL;
    IF v_user IS NOT NULL THEN SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_user LIMIT 1; END IF;
    INSERT INTO public.vcr_sof_approvers (handover_point_id, approver_role, approver_level, user_id, approver_name, status)
    VALUES (p_hp, v_role, 1, v_user, COALESCE(v_name, v_role), 'LOCKED');
  END LOOP;
END $$;

-- 2) Data repair: remove non-canonical SoF rows that are NOT signed; preserve signed rows.
DELETE FROM public.vcr_sof_approvers
 WHERE status <> 'SIGNED'
   AND approver_role NOT IN ('Plant Director','HSE Director','P&E Director','P&M Director');

-- 3) Re-seed canonical seats for every handover point that has a vcr_code.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.p2a_handover_points WHERE vcr_code IS NOT NULL LOOP
    PERFORM public.seed_vcr_sof_approvers(r.id);
  END LOOP;
END $$;
