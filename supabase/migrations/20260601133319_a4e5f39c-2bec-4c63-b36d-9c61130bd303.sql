
-- Mig 9: Harness membership table — replaces email-pattern trust root.
-- Trust root moves from "email shape" to "did the service-role provisioner register you".

CREATE TABLE public.harness_users (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX harness_users_run_id_idx ON public.harness_users(run_id);

COMMENT ON TABLE public.harness_users IS
  'M11 harness membership. Written ONLY via service-role at provision time; read by is_harness_user() to gate the Mig 8 RLS facet. Authenticated users have no write grants — forgery requires service-role.';

-- Grants:
--   - authenticated gets SELECT only (lets is_harness_user() resolve; SECURITY DEFINER would bypass RLS anyway but keep grants tight).
--   - NO INSERT/UPDATE/DELETE to authenticated or anon. Service-role uses BYPASSRLS.
GRANT SELECT ON public.harness_users TO authenticated;
GRANT ALL    ON public.harness_users TO service_role;
-- explicitly: no anon access.

ALTER TABLE public.harness_users ENABLE ROW LEVEL SECURITY;

-- SELECT policy: a user can only see their own row. Closes any "who else is a harness user" enumeration.
CREATE POLICY harness_users_select_self
  ON public.harness_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated → all such writes denied.
-- service_role bypasses RLS entirely (Supabase default), so provisioning works without a policy.

-- Swap is_harness_user() body. Signature/security/grants preserved.
CREATE OR REPLACE FUNCTION public.is_harness_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.harness_users
    WHERE user_id = auth.uid()
  )
$$;

-- Re-assert grants (CREATE OR REPLACE preserves them but be explicit).
REVOKE ALL ON FUNCTION public.is_harness_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_harness_user() TO authenticated;

COMMENT ON FUNCTION public.is_harness_user() IS
  'M11 harness facet trust root: returns true iff caller is registered in public.harness_users (service-role-only writes). Replaces the previous email-pattern check so signup cannot forge harness identity.';
