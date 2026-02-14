
CREATE OR REPLACE FUNCTION public.find_deputy_plant_director(plant_name_param text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.is_active = true
    AND (
      p.position ILIKE '%Dep. Plant Director - ' || plant_name_param || '%'
      OR p.position ILIKE '%Deputy Plant Director - ' || plant_name_param || '%'
    )
  LIMIT 1;
END;
$$;
