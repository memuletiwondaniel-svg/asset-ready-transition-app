
-- B2B cap-2 guard: a portfolio (or plant-scoped) role flagged is_b2b
-- must never have more than 2 distinct user holders per scope key.
-- Solo roles (is_b2b=false) are not capped here.

CREATE OR REPLACE FUNCTION public.validate_b2b_cap_region()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_b2b   boolean;
  v_role     text;
  v_region   text;
  v_count    int;
  v_existing text;
BEGIN
  SELECT COALESCE(is_b2b, false), name INTO v_is_b2b, v_role
    FROM public.roles WHERE id = NEW.role_id;
  IF NOT COALESCE(v_is_b2b, false) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_count
    FROM public.region_role_holders
   WHERE region_id = NEW.region_id
     AND role_id   = NEW.role_id
     AND user_id  <> NEW.user_id;

  IF v_count >= 2 THEN
    SELECT name INTO v_region FROM public.project_region WHERE id = NEW.region_id;
    SELECT string_agg(COALESCE(p.full_name, p.first_name || ' ' || p.last_name, 'Unknown'), ' + ')
      INTO v_existing
      FROM public.region_role_holders rrh
      JOIN public.profiles p ON p.user_id = rrh.user_id
     WHERE rrh.region_id = NEW.region_id
       AND rrh.role_id   = NEW.role_id;

    RAISE EXCEPTION
      'B2B_CAP_REACHED: % already has a complete % pair (%). To assign another user, choose who they replace.',
      COALESCE(v_region, 'This portfolio'),
      COALESCE(v_role, 'role'),
      COALESCE(v_existing, 'two existing holders')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_b2b_cap_region ON public.region_role_holders;
CREATE TRIGGER trg_validate_b2b_cap_region
BEFORE INSERT ON public.region_role_holders
FOR EACH ROW EXECUTE FUNCTION public.validate_b2b_cap_region();

CREATE OR REPLACE FUNCTION public.validate_b2b_cap_plant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_b2b   boolean;
  v_role     text;
  v_plant    text;
  v_count    int;
  v_existing text;
  v_sentinel uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  SELECT COALESCE(is_b2b, false), name INTO v_is_b2b, v_role
    FROM public.roles WHERE id = NEW.role_id;
  IF NOT COALESCE(v_is_b2b, false) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO v_count
    FROM public.plant_role_holders
   WHERE plant_id = NEW.plant_id
     AND role_id  = NEW.role_id
     AND COALESCE(field_id, v_sentinel) = COALESCE(NEW.field_id, v_sentinel)
     AND user_id <> NEW.user_id;

  IF v_count >= 2 THEN
    SELECT name INTO v_plant FROM public.plant WHERE id = NEW.plant_id;
    SELECT string_agg(COALESCE(p.full_name, p.first_name || ' ' || p.last_name, 'Unknown'), ' + ')
      INTO v_existing
      FROM public.plant_role_holders prh
      JOIN public.profiles p ON p.user_id = prh.user_id
     WHERE prh.plant_id = NEW.plant_id
       AND prh.role_id  = NEW.role_id
       AND COALESCE(prh.field_id, v_sentinel) = COALESCE(NEW.field_id, v_sentinel);

    RAISE EXCEPTION
      'B2B_CAP_REACHED: % already has a complete % pair (%). To assign another user, choose who they replace.',
      COALESCE(v_plant, 'This plant'),
      COALESCE(v_role, 'role'),
      COALESCE(v_existing, 'two existing holders')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_b2b_cap_plant ON public.plant_role_holders;
CREATE TRIGGER trg_validate_b2b_cap_plant
BEFORE INSERT ON public.plant_role_holders
FOR EACH ROW EXECUTE FUNCTION public.validate_b2b_cap_plant();

-- RPC: preflight read of current holders for a (role, region) — used by
-- the UI to detect the cap before submission and to show the existing
-- pair so the admin can pick who to replace.
CREATE OR REPLACE FUNCTION public.get_region_role_holders_preflight(
  p_role_id uuid,
  p_region_id uuid
) RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rrh.user_id,
         COALESCE(p.full_name, p.first_name || ' ' || p.last_name, 'Unknown')
    FROM public.region_role_holders rrh
    LEFT JOIN public.profiles p ON p.user_id = rrh.user_id
   WHERE rrh.region_id = p_region_id
     AND rrh.role_id   = p_role_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_region_role_holders_preflight(uuid, uuid) TO authenticated;

-- Atomic save-with-replacement: delete a chosen holder's roster row in
-- the same transaction as the new INSERT, so the cap-2 trigger sees a
-- consistent state and the swap is loss-free.
CREATE OR REPLACE FUNCTION public.set_user_region_role_holders_v2(
  p_user_id          uuid,
  p_role_id          uuid,
  p_region_ids       uuid[],
  p_replace_user_id  uuid DEFAULT NULL,
  p_replace_region_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_scope text; v_is_admin boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role)
    INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT scope::text INTO v_scope FROM public.roles WHERE id = p_role_id;
  IF v_scope IS DISTINCT FROM 'portfolio' THEN
    RAISE EXCEPTION 'role % is not portfolio-scoped (scope=%)', p_role_id, v_scope;
  END IF;

  -- Optional atomic replacement of an existing holder in the target region.
  IF p_replace_user_id IS NOT NULL AND p_replace_region_id IS NOT NULL THEN
    DELETE FROM public.region_role_holders
     WHERE user_id   = p_replace_user_id
       AND role_id   = p_role_id
       AND region_id = p_replace_region_id;
  END IF;

  DELETE FROM public.region_role_holders
   WHERE user_id = p_user_id
     AND role_id = p_role_id
     AND (p_region_ids IS NULL OR NOT (region_id = ANY(p_region_ids)));

  IF p_region_ids IS NOT NULL AND array_length(p_region_ids, 1) > 0 THEN
    INSERT INTO public.region_role_holders (region_id, role_id, user_id, assigned_by)
    SELECT rid, p_role_id, p_user_id, auth.uid()
    FROM unnest(p_region_ids) AS rid
    ON CONFLICT (region_id, role_id, user_id) DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_region_role_holders_v2(uuid, uuid, uuid[], uuid, uuid) TO authenticated;
