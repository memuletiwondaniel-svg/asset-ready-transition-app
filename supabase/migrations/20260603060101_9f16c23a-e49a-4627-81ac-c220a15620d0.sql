-- Extend org_role_holders to support B2B pairs (max 2 holders per global role).
-- Reuses existing useB2BPartner client logic (same position string ⇒ pair),
-- no new B2B machinery. Resolver still returns ONE uuid deterministically.

ALTER TABLE public.org_role_holders DROP CONSTRAINT org_role_holders_pkey;
ALTER TABLE public.org_role_holders ADD CONSTRAINT org_role_holders_pkey PRIMARY KEY (role_id, user_id);

CREATE OR REPLACE FUNCTION public.org_role_holders_cap_two()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.org_role_holders
  WHERE role_id = NEW.role_id;
  IF v_count >= 2 THEN
    RAISE EXCEPTION 'org_role_holders: role % already has 2 holders (B2B cap)', NEW.role_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_role_holders_cap_two ON public.org_role_holders;
CREATE TRIGGER trg_org_role_holders_cap_two
BEFORE INSERT ON public.org_role_holders
FOR EACH ROW EXECUTE FUNCTION public.org_role_holders_cap_two();

-- Update resolver: keep returning ONE uuid (deterministic first holder by assigned_at,user_id).
CREATE OR REPLACE FUNCTION public.resolve_project_role_user(p_project_id uuid, p_role_label text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_user uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles
   WHERE name = p_role_label AND is_active = true AND is_retired = false
   LIMIT 1;
  IF v_role_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Per-project assignment wins (override path).
  SELECT user_id INTO v_user
  FROM public.project_team_members
  WHERE project_id = p_project_id
    AND role = p_role_label
  ORDER BY created_at NULLS LAST, user_id
  LIMIT 1;
  IF v_user IS NOT NULL THEN
    RETURN v_user;
  END IF;

  -- Fallback: global org-level holder (deterministic first of up to 2).
  SELECT user_id INTO v_user
  FROM public.org_role_holders
  WHERE role_id = v_role_id
  ORDER BY assigned_at, user_id
  LIMIT 1;
  RETURN v_user;
END;
$$;