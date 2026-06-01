-- ============================================================================
-- Migration 7: projects.is_test_project flag for M11 harness scoping
-- ============================================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_test_project boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_is_test_project
  ON public.projects (is_test_project)
  WHERE is_test_project = true;

COMMENT ON COLUMN public.projects.is_test_project IS
  'M11 harness scope flag. true => row is a test fixture provisioned by '
  'test-workflow-e2e and eligible for harness sweep teardown by test_run_id. '
  'Production projects must remain false. RLS scoping for harness writes is '
  'added in a follow-up migration once the harness scaffold lands.';
