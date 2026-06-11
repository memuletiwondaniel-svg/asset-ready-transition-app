
DROP FUNCTION IF EXISTS public.get_roles_by_category();

CREATE FUNCTION public.get_roles_by_category()
RETURNS TABLE(
  category_id    uuid,
  category_name  text,
  category_order integer,
  role_id        uuid,
  role_name      text,
  role_description text,
  role_is_b2b    boolean,
  role_scope     text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rc.id, rc.name, rc.display_order,
         r.id, r.name, r.description,
         COALESCE(r.is_b2b, false), r.scope::text
  FROM public.role_category rc
  LEFT JOIN public.roles r ON r.category_id = rc.id AND r.is_active = true
  WHERE rc.is_active = true
  ORDER BY rc.display_order, r.name;
$$;

CREATE OR REPLACE FUNCTION public.get_user_region_role_holders(p_user_id uuid)
RETURNS TABLE(role_id uuid, role_name text, region_id uuid, region_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rrh.role_id, r.name, rrh.region_id, pr.name
  FROM public.region_role_holders rrh
  JOIN public.roles r           ON r.id = rrh.role_id
  JOIN public.project_region pr ON pr.id = rrh.region_id
  WHERE rrh.user_id = p_user_id
    AND (
      p_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.user_roles ur
                  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::user_role)
    );
$$;

CREATE OR REPLACE FUNCTION public.set_user_region_role_holders(
  p_user_id    uuid,
  p_role_id    uuid,
  p_region_ids uuid[]
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

GRANT EXECUTE ON FUNCTION public.get_user_region_role_holders(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_region_role_holders(uuid, uuid, uuid[]) TO authenticated;
