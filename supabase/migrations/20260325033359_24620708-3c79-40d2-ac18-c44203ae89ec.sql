-- Fix RLS policies that reference user_metadata (security linter issue)
-- Replace with proper tenant isolation using profiles table

DROP POLICY IF EXISTS "Authenticated users read own tenant sync data" ON dms_external_sync;
CREATE POLICY "Authenticated users read own tenant sync data"
  ON dms_external_sync FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users read own tenant sync logs" ON dms_sync_logs;
CREATE POLICY "Authenticated users read own tenant sync logs"
  ON dms_sync_logs FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM profiles p WHERE p.user_id = (SELECT auth.uid())
    )
  );