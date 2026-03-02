UPDATE public.profiles 
SET role = (SELECT id FROM public.roles WHERE name = 'Rotating TA2 - Asset' LIMIT 1),
    updated_at = now()
WHERE user_id IN (
  '706c8a81-4340-4316-8123-8c180bebc3b6',  -- Hamad El Naggar
  'bfb38ac2-a280-4b1c-8f11-f75c58ebbff0'   -- Lip Tong
);