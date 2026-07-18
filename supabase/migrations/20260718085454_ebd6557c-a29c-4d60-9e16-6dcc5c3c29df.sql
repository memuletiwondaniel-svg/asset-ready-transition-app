
-- 1) Drop cross-tenant broad SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view all PSSRs" ON public.pssrs;
DROP POLICY IF EXISTS "Authenticated users can view all ORPs" ON public.orp_plans;

-- 2) projects: replace public-role SELECT with authenticated-only
DROP POLICY IF EXISTS "All users can view projects" ON public.projects;
CREATE POLICY "Authenticated users can view active projects"
  ON public.projects FOR SELECT TO authenticated
  USING (is_active = true);

-- 3) Re-scope misconfigured service-role policies
DROP POLICY IF EXISTS "Service role can manage fred failures" ON public.fred_resolution_failures;
CREATE POLICY "Service role can manage fred failures"
  ON public.fred_resolution_failures FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert fred kpis" ON public.fred_kpi_snapshots;
CREATE POLICY "Service role can insert fred kpis"
  ON public.fred_kpi_snapshots FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages config snapshots" ON public.selma_config_snapshot;
CREATE POLICY "Service role manages config snapshots"
  ON public.selma_config_snapshot FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages sync changes" ON public.dms_sync_changes;
CREATE POLICY "Service role manages sync changes"
  ON public.dms_sync_changes FOR INSERT TO service_role
  WITH CHECK (true);

-- 4) Strip 2FA & temporary-password columns from client SELECTs
REVOKE SELECT (two_factor_secret, two_factor_backup_codes, temporary_password)
  ON public.profiles FROM authenticated, anon;
