-- =============================================================================
-- SECURITY HARDENING: Prevent 2FA secret and temporary password exposure
-- =============================================================================
-- Problem: The profiles table SELECT RLS policy allows all tenant users to read
-- sensitive columns (two_factor_secret, two_factor_backup_codes, temporary_password).
-- These should NEVER be readable by the authenticated/anon roles — only by
-- service_role (used by Edge Functions for TOTP verification).
--
-- Fix:
--   1. Revoke SELECT on sensitive columns from anon/authenticated roles
--   2. Drop & recreate profiles_safe view (excludes sensitive columns, adds new safe cols)
--   3. Add trigger to auto-null temporary_password after first use
-- =============================================================================

-- Step 1: Revoke column-level SELECT on sensitive fields
REVOKE SELECT (two_factor_secret, two_factor_backup_codes, temporary_password)
  ON public.profiles FROM anon, authenticated;

-- Step 2: Drop and recreate profiles_safe view with additional safe columns
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe AS
SELECT
  id, user_id, email, full_name, first_name, last_name,
  department, avatar_url, phone_number, primary_phone, secondary_phone,
  country_code, company, position, plant, commission, hub, field, station,
  role, manager_id, is_active, status, account_status, sso_enabled,
  two_factor_enabled, functional_email, functional_email_address,
  backup_email, personal_email, last_login_at, created_at, updated_at,
  notification_preferences, preferences, tenant_id,
  password_change_required, password_reset_required
FROM public.profiles;

COMMENT ON VIEW public.profiles_safe IS
  'Safe view of profiles excluding two_factor_secret, two_factor_backup_codes, and temporary_password. Use this for all cross-tenant reads.';

-- Grant access on the safe view
GRANT SELECT ON public.profiles_safe TO anon, authenticated;

-- Step 3: Auto-null temporary_password after first successful login
CREATE OR REPLACE FUNCTION public.clear_temporary_password()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.password_change_required = true
     AND NEW.password_change_required = false
     AND OLD.temporary_password IS NOT NULL THEN
    NEW.temporary_password := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_temp_password_on_change ON public.profiles;

CREATE TRIGGER clear_temp_password_on_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_temporary_password();