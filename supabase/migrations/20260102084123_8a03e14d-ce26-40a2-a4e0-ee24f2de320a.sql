-- Update the get_roles_by_category function to use display_order for sorting
CREATE OR REPLACE FUNCTION public.get_roles_by_category()
RETURNS TABLE (
  category_id uuid,
  category_name text,
  category_order integer,
  role_id uuid,
  role_name text,
  role_description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rc.id as category_id,
    rc.name as category_name,
    rc.display_order as category_order,
    r.id as role_id,
    r.name as role_name,
    r.description as role_description
  FROM public.role_category rc
  LEFT JOIN public.roles r ON r.category_id = rc.id AND r.is_active = true
  WHERE rc.is_active = true
  ORDER BY rc.display_order, r.display_order, r.name;
$$;