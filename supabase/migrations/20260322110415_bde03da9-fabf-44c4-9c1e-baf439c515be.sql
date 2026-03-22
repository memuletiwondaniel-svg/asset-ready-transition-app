-- =============================================================================
-- SECURITY HARDENING: Encrypt Microsoft OAuth tokens at rest
-- =============================================================================
-- Problem: microsoft_oauth_tokens stores access_token and refresh_token in
-- plaintext. Access tokens are short-lived (1 hour) and should not be persisted.
-- Refresh tokens are long-lived and must be encrypted at rest.
--
-- Fix:
--   1. Stop storing access_token (column kept for schema compat, set to placeholder)
--   2. Encrypt refresh_token using AES-256-GCM (same crypto module as TOTP)
--   3. Revoke direct column SELECT on token columns from anon/authenticated
--   4. RLS already restricts to owner-only access (verified)
-- =============================================================================

-- Revoke table-level SELECT and re-grant on safe columns only
REVOKE SELECT ON public.microsoft_oauth_tokens FROM anon, authenticated;

GRANT SELECT (id, user_id, expires_at, scope, created_at, updated_at)
  ON public.microsoft_oauth_tokens TO anon, authenticated;

-- Preserve INSERT/UPDATE/DELETE for the owner-only RLS policies
GRANT INSERT, UPDATE, DELETE ON public.microsoft_oauth_tokens TO anon, authenticated;

-- Add column comment documenting the encryption
COMMENT ON COLUMN public.microsoft_oauth_tokens.refresh_token IS 
  'AES-256-GCM encrypted via _shared/crypto.ts. Format: base64(iv):base64(ciphertext):base64(tag)';
COMMENT ON COLUMN public.microsoft_oauth_tokens.access_token IS 
  'No longer persisted — set to placeholder. Fresh tokens obtained via refresh flow.';