-- Allow admins to update any profile (needed to set avatar_url when creating users)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (user_is_admin(auth.uid()))
    WITH CHECK (user_is_admin(auth.uid()));
  END IF;
END $$;