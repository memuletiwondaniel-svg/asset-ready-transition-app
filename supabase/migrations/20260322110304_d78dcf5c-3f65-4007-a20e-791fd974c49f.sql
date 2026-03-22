-- =============================================================================
-- SECURITY HARDENING (Part 2): Column-level privilege enforcement
-- =============================================================================
-- Column-level REVOKE doesn't override table-level GRANT in Postgres.
-- We must revoke table-level SELECT and re-grant on safe columns only.
-- This ensures authenticated/anon users CANNOT read two_factor_secret,
-- two_factor_backup_codes, or temporary_password even via direct table queries.
-- Edge Functions use service_role which retains full access.
-- =============================================================================

-- Revoke table-level SELECT (this removes ALL column access)
REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- Re-grant SELECT on every column EXCEPT the 3 sensitive ones
GRANT SELECT (
  id, user_id, email, full_name, first_name, last_name,
  department, avatar_url, phone_number, primary_phone, secondary_phone,
  country_code, company, position, plant, commission, hub, field, station,
  role, manager_id, is_active, status, account_status, sso_enabled,
  two_factor_enabled, functional_email, functional_email_address,
  backup_email, personal_email, last_login_at, created_at, updated_at,
  notification_preferences, preferences, tenant_id,
  password_change_required, password_reset_required,
  authenticator_id, password_changed_at, login_attempts, locked_until,
  last_password_reset, stale_flagged_at, offboarded_at, offboarded_by,
  offboard_notes, rejection_reason
) ON public.profiles TO anon, authenticated;

-- Preserve INSERT/UPDATE/DELETE grants (these don't expose read of sensitive cols)
GRANT INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;