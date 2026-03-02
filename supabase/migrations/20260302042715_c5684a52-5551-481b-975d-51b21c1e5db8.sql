-- Reassign Hugo and Arvind to Process TA2 - Asset role
UPDATE public.profiles 
SET role = (SELECT id FROM public.roles WHERE name = 'Process TA2 - Asset' LIMIT 1),
    updated_at = now()
WHERE user_id IN (
  'e2146fc7-5d51-4e46-af7c-062addb2c40b',  -- Arvind Gupta
  'f24408e0-4d30-49db-82b9-7fae440946b6'   -- Hugo Satink
);