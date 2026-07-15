
-- SoF approver roster repair: fix legacy handover points where HSE Director
-- was seeded as approver_name='HSE Director' with user_id NULL and/or wrong
-- level. Delete unsigned/unresolved rows then re-seed canonical 4-director L1.

-- 1) Purge unsigned/unresolved rows so the seeder can rebuild them cleanly.
--    Signed rows are preserved (audit).
DELETE FROM public.vcr_sof_approvers
WHERE status <> 'SIGNED'
  AND (user_id IS NULL OR approver_name = approver_role OR approver_level <> 1);

-- 2) Re-run the canonical seeder for every VCR handover point.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.p2a_handover_points WHERE vcr_code IS NOT NULL LOOP
    PERFORM public.seed_vcr_sof_approvers(r.id);
  END LOOP;
END $$;

-- 3) Alias-tolerant resolver update: if a role label lookup fails, try the
--    HSE↔HSSE alias before returning NULL. Applied inside resolve_project_role_user
--    so both certs and any other caller benefit.
CREATE OR REPLACE FUNCTION public.resolve_project_role_user(p_project_id uuid, p_role_label text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role_id uuid; v_scope public.role_scope; v_user uuid;
  v_region uuid; v_hub uuid; v_plant uuid;
  v_labels text[];
  v_label text;
BEGIN
  -- Build an alias-tolerant search list. HSE Director <-> HSSE Director.
  v_labels := ARRAY[p_role_label];
  IF lower(p_role_label) = 'hse director' THEN
    v_labels := v_labels || ARRAY['HSSE Director'];
  ELSIF lower(p_role_label) = 'hsse director' THEN
    v_labels := v_labels || ARRAY['HSE Director'];
  END IF;

  FOREACH v_label IN ARRAY v_labels LOOP
    SELECT id, scope INTO v_role_id, v_scope FROM public.roles
     WHERE name = v_label AND is_active AND NOT is_retired LIMIT 1;
    IF v_role_id IS NULL THEN CONTINUE; END IF;

    SELECT user_id INTO v_user FROM public.project_team_members
     WHERE project_id = p_project_id AND role = v_label
     ORDER BY created_at NULLS LAST, user_id LIMIT 1;
    IF v_user IS NOT NULL THEN RETURN v_user; END IF;

    IF v_scope = 'portfolio' THEN
      SELECT region_id INTO v_region FROM public.projects WHERE id = p_project_id;
      IF v_region IS NOT NULL THEN
        SELECT user_id INTO v_user FROM public.region_role_holders
         WHERE region_id = v_region AND role_id = v_role_id
         ORDER BY assigned_at, user_id LIMIT 1;
        IF v_user IS NOT NULL THEN RETURN v_user; END IF;
      END IF;
    ELSIF v_scope = 'hub' THEN
      SELECT hub_id INTO v_hub FROM public.projects WHERE id = p_project_id;
      IF v_hub IS NOT NULL THEN
        SELECT user_id INTO v_user FROM public.hub_role_holders
         WHERE hub_id = v_hub AND role_id = v_role_id
         ORDER BY assigned_at, user_id LIMIT 1;
        IF v_user IS NOT NULL THEN RETURN v_user; END IF;
      END IF;
    ELSIF v_scope = 'plant' THEN
      SELECT plant_id INTO v_plant FROM public.projects WHERE id = p_project_id;
      IF v_plant IS NOT NULL THEN
        SELECT user_id INTO v_user FROM public.plant_role_holders
         WHERE plant_id = v_plant AND role_id = v_role_id
         ORDER BY assigned_at, user_id LIMIT 1;
        IF v_user IS NOT NULL THEN RETURN v_user; END IF;
      END IF;
    END IF;

    SELECT user_id INTO v_user FROM public.org_role_holders
     WHERE role_id = v_role_id ORDER BY assigned_at, user_id LIMIT 1;
    IF v_user IS NOT NULL THEN RETURN v_user; END IF;
  END LOOP;

  RETURN NULL;
END;
$function$;

-- 4) Re-seed once more now that the alias-tolerant resolver is in place.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.p2a_handover_points WHERE vcr_code IS NOT NULL LOOP
    PERFORM public.seed_vcr_sof_approvers(r.id);
  END LOOP;
END $$;
