-- Grant admin role to memuletiwondaniel@gmail.com
-- First, get the user_id for this email
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email in profiles table
  SELECT user_id INTO target_user_id
  FROM public.profiles
  WHERE email = 'memuletiwondaniel@gmail.com'
  LIMIT 1;

  -- If user exists, grant admin role
  IF target_user_id IS NOT NULL THEN
    -- Delete existing roles for this user to avoid conflicts
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::public.user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email memuletiwondaniel@gmail.com not found';
  END IF;
END $$;