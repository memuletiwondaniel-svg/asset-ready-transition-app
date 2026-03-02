UPDATE public.profiles 
SET role = (SELECT id FROM public.roles WHERE name = 'Elect TA2 - Asset' LIMIT 1),
    updated_at = now()
WHERE user_id = '67835b48-7e50-4f5c-bc20-92f460729bd4';