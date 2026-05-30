ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS is_b2b boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_roles_by_category();

CREATE OR REPLACE FUNCTION public.get_roles_by_category()
RETURNS TABLE (
  category_id uuid,
  category_name text,
  category_order integer,
  role_id uuid,
  role_name text,
  role_description text,
  role_is_b2b boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.id AS category_id,
    rc.name AS category_name,
    rc.display_order AS category_order,
    r.id AS role_id,
    r.name AS role_name,
    r.description AS role_description,
    COALESCE(r.is_b2b, false) AS role_is_b2b
  FROM public.role_category rc
  LEFT JOIN public.roles r
    ON r.category_id = rc.id AND r.is_active = true
  WHERE rc.is_active = true
  ORDER BY rc.display_order, r.name;
$$;