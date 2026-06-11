-- GATE C closeout: remove profiles.position ILIKE fallback from
-- find_deputy_plant_director. Structured plant_role_holders path only.
-- Empty roster → NULL (caller surfaces "Not assigned"), no stringly drift.
CREATE OR REPLACE FUNCTION public.find_deputy_plant_director(plant_name_param text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plant_id uuid; v_role_id uuid;
BEGIN
  SELECT id INTO v_plant_id FROM public.plant WHERE name ILIKE plant_name_param LIMIT 1;
  SELECT id INTO v_role_id  FROM public.roles
   WHERE name='Dep. Plant Director' AND is_active AND NOT is_retired LIMIT 1;

  IF v_plant_id IS NULL OR v_role_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT prh.user_id, p.full_name, p.avatar_url
    FROM public.plant_role_holders prh
    JOIN public.profiles p ON p.user_id = prh.user_id
   WHERE prh.plant_id = v_plant_id AND prh.role_id = v_role_id
   ORDER BY prh.assigned_at LIMIT 1;
END;
$$;