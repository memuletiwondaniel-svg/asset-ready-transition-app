-- B5 v2: live-resolve register author
ALTER TABLE public.p2a_vcr_operational_registers
  ADD COLUMN IF NOT EXISTS author_role_id uuid REFERENCES public.roles(id),
  ADD COLUMN IF NOT EXISTS author_region_scope text;

ALTER TABLE public.p2a_vcr_register_selections
  ADD COLUMN IF NOT EXISTS author_role_id uuid REFERENCES public.roles(id),
  ADD COLUMN IF NOT EXISTS author_region_scope text;

CREATE INDEX IF NOT EXISTS idx_p2a_vcr_op_reg_author_role ON public.p2a_vcr_operational_registers(author_role_id);
CREATE INDEX IF NOT EXISTS idx_p2a_vcr_reg_sel_author_role ON public.p2a_vcr_register_selections(author_role_id);

-- Role-id based resolver (mirrors resolve_project_role_user but keyed by role_id)
CREATE OR REPLACE FUNCTION public.resolve_role_holder(p_project_id uuid, p_role_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scope public.role_scope; v_name text; v_user uuid;
  v_region uuid; v_hub uuid; v_plant uuid;
BEGIN
  SELECT scope, name INTO v_scope, v_name FROM public.roles
   WHERE id = p_role_id AND is_active AND NOT is_retired LIMIT 1;
  IF v_scope IS NULL THEN RETURN NULL; END IF;

  SELECT user_id INTO v_user FROM public.project_team_members
   WHERE project_id = p_project_id AND role = v_name
   ORDER BY created_at NULLS LAST, user_id LIMIT 1;
  IF v_user IS NOT NULL THEN RETURN v_user; END IF;

  IF v_scope = 'portfolio' THEN
    SELECT region_id INTO v_region FROM public.projects WHERE id = p_project_id;
    IF v_region IS NOT NULL THEN
      SELECT user_id INTO v_user FROM public.region_role_holders
       WHERE region_id = v_region AND role_id = p_role_id
       ORDER BY assigned_at, user_id LIMIT 1;
      IF v_user IS NOT NULL THEN RETURN v_user; END IF;
    END IF;
  ELSIF v_scope = 'hub' THEN
    SELECT hub_id INTO v_hub FROM public.projects WHERE id = p_project_id;
    IF v_hub IS NOT NULL THEN
      SELECT user_id INTO v_user FROM public.hub_role_holders
       WHERE hub_id = v_hub AND role_id = p_role_id
       ORDER BY assigned_at, user_id LIMIT 1;
      IF v_user IS NOT NULL THEN RETURN v_user; END IF;
    END IF;
  ELSIF v_scope = 'plant' THEN
    SELECT plant_id INTO v_plant FROM public.projects WHERE id = p_project_id;
    IF v_plant IS NOT NULL THEN
      SELECT user_id INTO v_user FROM public.plant_role_holders
       WHERE plant_id = v_plant AND role_id = p_role_id
       ORDER BY assigned_at, user_id LIMIT 1;
      IF v_user IS NOT NULL THEN RETURN v_user; END IF;
    END IF;
  END IF;

  SELECT user_id INTO v_user FROM public.org_role_holders
   WHERE role_id = p_role_id ORDER BY assigned_at, user_id LIMIT 1;
  RETURN v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_role_holder(uuid, uuid) TO authenticated, anon, service_role;