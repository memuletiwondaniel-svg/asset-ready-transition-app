-- Create function to sync profile names to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_profile_names_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if first_name or last_name changed
  IF (TG_OP = 'UPDATE' AND (
    OLD.first_name IS DISTINCT FROM NEW.first_name OR 
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.full_name IS DISTINCT FROM NEW.full_name
  )) OR TG_OP = 'INSERT' THEN
    
    -- Update auth.users raw_user_meta_data
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'full_name', NEW.full_name
      )
    WHERE id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync profile names to auth metadata
DROP TRIGGER IF EXISTS sync_profile_names_to_auth_trigger ON public.profiles;
CREATE TRIGGER sync_profile_names_to_auth_trigger
  AFTER INSERT OR UPDATE OF first_name, last_name, full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_names_to_auth();

-- Backfill existing profiles to auth.users metadata
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'first_name', p.first_name,
    'last_name', p.last_name,
    'full_name', p.full_name
  )
FROM public.profiles p
WHERE u.id = p.user_id
  AND p.first_name IS NOT NULL;