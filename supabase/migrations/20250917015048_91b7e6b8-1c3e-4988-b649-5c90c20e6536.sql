-- Fix the get_active_ta2_disciplines function to use correct column names
CREATE OR REPLACE FUNCTION public.get_active_ta2_disciplines()
 RETURNS TABLE(value text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT d.name::text AS value
  FROM public.profiles p
  JOIN public.discipline d ON p.discipline = d.id
  WHERE p.is_active = true AND d.is_active = true AND p.discipline IS NOT NULL
  ORDER BY d.name::text;
$function$;

-- Fix the get_active_ta2_commissions function to use correct column names
CREATE OR REPLACE FUNCTION public.get_active_ta2_commissions()
 RETURNS TABLE(value text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT c.name::text AS value
  FROM public.profiles p
  JOIN public.commission c ON p.commission = c.id
  WHERE p.is_active = true AND c.is_active = true AND p.commission IS NOT NULL
  ORDER BY c.name::text;
$function$;