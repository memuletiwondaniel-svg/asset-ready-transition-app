UPDATE public.profiles 
SET role = (SELECT id FROM public.roles WHERE name = 'Static TA2 - Asset' LIMIT 1),
    updated_at = now()
WHERE user_id = '87a805bc-edac-43b9-93c7-c0fb8e23e7d1';