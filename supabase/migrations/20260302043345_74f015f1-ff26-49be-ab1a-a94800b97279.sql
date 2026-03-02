UPDATE public.profiles 
SET role = (SELECT id FROM public.roles WHERE name = 'MCI TA2 - Asset' LIMIT 1),
    updated_at = now()
WHERE user_id = 'c22b9de5-97e4-40f2-ba49-5677b06bedd4';