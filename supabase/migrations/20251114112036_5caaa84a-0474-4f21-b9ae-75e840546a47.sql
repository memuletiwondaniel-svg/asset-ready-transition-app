-- Update function to sync more profile fields to auth.users metadata
CREATE OR REPLACE FUNCTION public.sync_profile_names_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if any tracked fields changed
  IF (TG_OP = 'UPDATE' AND (
    OLD.first_name IS DISTINCT FROM NEW.first_name OR 
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.avatar_url IS DISTINCT FROM NEW.avatar_url OR
    OLD.phone_number IS DISTINCT FROM NEW.phone_number OR
    OLD.primary_phone IS DISTINCT FROM NEW.primary_phone OR
    OLD.position IS DISTINCT FROM NEW.position
  )) OR TG_OP = 'INSERT' THEN
    
    -- Update auth.users raw_user_meta_data with all tracked fields
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'full_name', NEW.full_name,
        'avatar_url', NEW.avatar_url,
        'phone_number', COALESCE(NEW.primary_phone, NEW.phone_number),
        'position', NEW.position
      )
    WHERE id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger with updated field list
DROP TRIGGER IF EXISTS sync_profile_names_to_auth_trigger ON public.profiles;
CREATE TRIGGER sync_profile_names_to_auth_trigger
  AFTER INSERT OR UPDATE OF first_name, last_name, full_name, avatar_url, phone_number, primary_phone, position ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_names_to_auth();

-- Backfill all existing profiles with the new fields
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'first_name', p.first_name,
    'last_name', p.last_name,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'phone_number', COALESCE(p.primary_phone, p.phone_number),
    'position', p.position
  )
FROM public.profiles p
WHERE u.id = p.user_id;