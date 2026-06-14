-- 1) Harden the auto-create trigger: idempotent + email-local-part fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
BEGIN
  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    NEW.email
  );

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2) Backfill any auth.users that have no profile row
INSERT INTO public.profiles (user_id, email, full_name)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    u.email
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
  AND u.email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;