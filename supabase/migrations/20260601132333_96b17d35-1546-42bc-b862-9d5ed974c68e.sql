
-- Mig 8: Harness RLS facet
-- Goal: prove RLS rail by restricting harness-origin sessions to is_test_project=true rows.
-- Mechanism: RESTRICTIVE policies keyed on is_harness_user() (email LIKE 'm11-%@test.local').
-- RESTRICTIVE policies AND with permissive policies — non-harness users see NO change.
-- For harness users, every write must target a row whose owning project has is_test_project=true.

CREATE OR REPLACE FUNCTION public.is_harness_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email LIKE 'm11-%@test.local'
  )
$$;

REVOKE ALL ON FUNCTION public.is_harness_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_harness_user() TO authenticated;

-- Helper: resolve project's is_test_project flag (NULL-safe = false)
CREATE OR REPLACE FUNCTION public.project_is_test(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_test_project FROM public.projects WHERE id = _project_id), false)
$$;

REVOKE ALL ON FUNCTION public.project_is_test(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.project_is_test(uuid) TO authenticated;

-- projects: harness users may only INSERT/UPDATE/DELETE rows where is_test_project=true
CREATE POLICY harness_projects_insert_test_only
  ON public.projects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_harness_user() OR is_test_project = true);

CREATE POLICY harness_projects_update_test_only
  ON public.projects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_harness_user() OR is_test_project = true)
  WITH CHECK (NOT public.is_harness_user() OR is_test_project = true);

CREATE POLICY harness_projects_delete_test_only
  ON public.projects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_harness_user() OR is_test_project = true);

-- orp_plans
CREATE POLICY harness_orp_plans_insert_test_only
  ON public.orp_plans AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_harness_user() OR public.project_is_test(project_id));

CREATE POLICY harness_orp_plans_update_test_only
  ON public.orp_plans AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_harness_user() OR public.project_is_test(project_id))
  WITH CHECK (NOT public.is_harness_user() OR public.project_is_test(project_id));

CREATE POLICY harness_orp_plans_delete_test_only
  ON public.orp_plans AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_harness_user() OR public.project_is_test(project_id));

-- p2a_handover_plans
CREATE POLICY harness_p2a_plans_insert_test_only
  ON public.p2a_handover_plans AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_harness_user() OR public.project_is_test(project_id));

CREATE POLICY harness_p2a_plans_update_test_only
  ON public.p2a_handover_plans AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT public.is_harness_user() OR public.project_is_test(project_id))
  WITH CHECK (NOT public.is_harness_user() OR public.project_is_test(project_id));

CREATE POLICY harness_p2a_plans_delete_test_only
  ON public.p2a_handover_plans AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT public.is_harness_user() OR public.project_is_test(project_id));

-- orp_approvals (resolve project via orp_plans)
CREATE POLICY harness_orp_approvals_insert_test_only
  ON public.orp_approvals AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_harness_user()
    OR EXISTS (SELECT 1 FROM public.orp_plans p
               WHERE p.id = orp_approvals.orp_plan_id
                 AND public.project_is_test(p.project_id))
  );

CREATE POLICY harness_orp_approvals_update_test_only
  ON public.orp_approvals AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    NOT public.is_harness_user()
    OR EXISTS (SELECT 1 FROM public.orp_plans p
               WHERE p.id = orp_approvals.orp_plan_id
                 AND public.project_is_test(p.project_id))
  );

-- p2a_handover_approvers (resolve via p2a_handover_plans)
CREATE POLICY harness_p2a_appr_insert_test_only
  ON public.p2a_handover_approvers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_harness_user()
    OR EXISTS (SELECT 1 FROM public.p2a_handover_plans p
               WHERE p.id = p2a_handover_approvers.handover_id
                 AND public.project_is_test(p.project_id))
  );

CREATE POLICY harness_p2a_appr_update_test_only
  ON public.p2a_handover_approvers AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    NOT public.is_harness_user()
    OR EXISTS (SELECT 1 FROM public.p2a_handover_plans p
               WHERE p.id = p2a_handover_approvers.handover_id
                 AND public.project_is_test(p.project_id))
  );

-- p2a_plan_approvals
CREATE POLICY harness_p2a_pa_insert_test_only
  ON public.p2a_plan_approvals AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_harness_user()
    OR EXISTS (SELECT 1 FROM public.p2a_handover_plans p
               WHERE p.id = p2a_plan_approvals.handover_plan_id
                 AND public.project_is_test(p.project_id))
  );

CREATE POLICY harness_p2a_pa_update_test_only
  ON public.p2a_plan_approvals AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    NOT public.is_harness_user()
    OR EXISTS (SELECT 1 FROM public.p2a_handover_plans p
               WHERE p.id = p2a_plan_approvals.handover_plan_id
                 AND public.project_is_test(p.project_id))
  );

-- user_tasks: scope by metadata->>project_id (existing convention in code)
CREATE POLICY harness_user_tasks_insert_test_only
  ON public.user_tasks AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_harness_user()
    OR (
      (metadata ->> 'project_id') IS NOT NULL
      AND public.project_is_test((metadata ->> 'project_id')::uuid)
    )
  );

CREATE POLICY harness_user_tasks_update_test_only
  ON public.user_tasks AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    NOT public.is_harness_user()
    OR (
      (metadata ->> 'project_id') IS NOT NULL
      AND public.project_is_test((metadata ->> 'project_id')::uuid)
    )
  );

CREATE POLICY harness_user_tasks_delete_test_only
  ON public.user_tasks AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    NOT public.is_harness_user()
    OR (
      (metadata ->> 'project_id') IS NOT NULL
      AND public.project_is_test((metadata ->> 'project_id')::uuid)
    )
  );

COMMENT ON FUNCTION public.is_harness_user() IS
  'M11 harness facet: returns true if the current auth user is an M11 test user (email LIKE m11-%@test.local). Used only by RESTRICTIVE policies that constrain harness writes to is_test_project=true rows. Non-harness users see no behavior change.';
