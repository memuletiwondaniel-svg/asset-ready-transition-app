-- CRITICAL SECURITY FIX: Secure password_reset_tokens table
-- Password reset tokens should NEVER be readable by users, not even admins

-- Drop the existing admin policy that allows reading tokens
DROP POLICY IF EXISTS "Admins can manage password reset tokens" ON public.password_reset_tokens;

-- Create explicit DENY policy for SELECT - NO ONE can read tokens directly
-- This policy will be checked first due to how RLS works
CREATE POLICY "No direct SELECT access to password reset tokens"
ON public.password_reset_tokens
FOR SELECT
TO public
USING (false);  -- Explicitly deny all SELECT access

-- Create explicit DENY policy for INSERT - NO ONE can insert directly
CREATE POLICY "No direct INSERT access to password reset tokens"
ON public.password_reset_tokens
FOR INSERT
TO public
WITH CHECK (false);  -- Explicitly deny all INSERT access

-- Create explicit DENY policy for UPDATE - NO ONE can update directly
CREATE POLICY "No direct UPDATE access to password reset tokens"
ON public.password_reset_tokens
FOR UPDATE
TO public
USING (false);  -- Explicitly deny all UPDATE access

-- Create explicit DENY policy for DELETE - NO ONE can delete directly
CREATE POLICY "No direct DELETE access to password reset tokens"
ON public.password_reset_tokens
FOR DELETE
TO public
USING (false);  -- Explicitly deny all DELETE access

-- Create a secure function to generate password reset tokens (server-side only)
CREATE OR REPLACE FUNCTION public.create_password_reset_token(
  target_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_id uuid;
  reset_token text;
BEGIN
  -- Generate a cryptographically secure random token
  reset_token := encode(gen_random_bytes(32), 'hex');
  
  -- Invalidate any existing unused tokens for this user
  UPDATE public.password_reset_tokens
  SET used = true
  WHERE user_id = target_user_id 
    AND used = false 
    AND expires_at > now();
  
  -- Insert new token (expires in 1 hour)
  INSERT INTO public.password_reset_tokens (
    user_id,
    token,
    expires_at,
    used
  ) VALUES (
    target_user_id,
    reset_token,
    now() + interval '1 hour',
    false
  )
  RETURNING id INTO token_id;
  
  RETURN token_id;
END;
$$;

-- Create a secure function to validate and use a password reset token
CREATE OR REPLACE FUNCTION public.validate_password_reset_token(
  reset_token text
)
RETURNS TABLE(
  is_valid boolean,
  user_id uuid,
  token_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token_record record;
BEGIN
  -- Find the token
  SELECT 
    t.id,
    t.user_id,
    t.expires_at,
    t.used
  INTO token_record
  FROM public.password_reset_tokens t
  WHERE t.token = reset_token
  LIMIT 1;
  
  -- Check if token exists, is not used, and not expired
  IF token_record.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  IF token_record.used = true THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  IF token_record.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  
  -- Mark token as used (one-time use only)
  UPDATE public.password_reset_tokens
  SET used = true
  WHERE id = token_record.id;
  
  -- Return success with user_id
  RETURN QUERY SELECT true, token_record.user_id, token_record.id;
END;
$$;

-- Create a function to clean up expired tokens (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete tokens that expired more than 7 days ago
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() - interval '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions only to authenticated users
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_password_reset_token(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_password_reset_tokens() TO authenticated;

-- Add comment explaining the security model
COMMENT ON TABLE public.password_reset_tokens IS 
'CRITICAL SECURITY: This table should NEVER have SELECT policies allowing direct access. All operations must go through SECURITY DEFINER functions to prevent token exposure.';

COMMENT ON FUNCTION public.create_password_reset_token IS 
'Creates a secure password reset token. Only accessible via this function, never via direct INSERT.';

COMMENT ON FUNCTION public.validate_password_reset_token IS 
'Validates and marks a password reset token as used. Returns user_id if valid. Only accessible via this function.';

COMMENT ON FUNCTION public.cleanup_expired_password_reset_tokens IS 
'Maintenance function to clean up expired password reset tokens older than 7 days.';