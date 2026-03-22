
-- profiles SELECT: "Admins have full profile access" is subset of "Tenant: view profiles" for admins
-- Keep "Tenant: view profiles" (broader), drop admin-only one since admins already match tenant check
-- Actually admins need explicit access even without tenant — consolidate into one
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
DROP POLICY IF EXISTS "Tenant: view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    user_is_admin((select auth.uid()))
    OR (tenant_id = get_user_tenant_id()) OR (tenant_id IS NULL)
    OR (user_id = (select auth.uid()))
  );

-- projects UPDATE: consolidate 2 authenticated policies into 1
DROP POLICY IF EXISTS "Tenant: update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

CREATE POLICY "Authenticated users can update projects" ON public.projects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    ((select auth.uid()) = created_by) OR user_is_admin((select auth.uid()))
    OR (tenant_id = get_user_tenant_id()) OR (tenant_id IS NULL)
  );
