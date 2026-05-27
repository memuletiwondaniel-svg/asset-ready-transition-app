
-- 1) Lock down sensitive profile columns: only service_role (edge functions) can read them
REVOKE SELECT (two_factor_secret, two_factor_backup_codes, temporary_password)
  ON public.profiles FROM anon, authenticated, PUBLIC;

-- 2) Require authentication to read private project-documents bucket
DROP POLICY IF EXISTS "Users can view project documents" ON storage.objects;
CREATE POLICY "Authenticated users can view project documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-documents' AND auth.uid() IS NOT NULL);

-- 3) Make v_person_overall_progress run with the querying user's privileges (not the view owner's)
ALTER VIEW public.v_person_overall_progress SET (security_invoker = true);
