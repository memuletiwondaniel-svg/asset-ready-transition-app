-- Add user privileges table and enhance user management

-- Create user privilege enum
CREATE TYPE user_privilege AS ENUM (
  'view_only',
  'complete_delegate_tasks', 
  'edit_pssr_checklist_approvers',
  'manage_users',
  'manage_projects',
  'manage_pssr_master_checklist',
  'manage_operation_readiness_plan',
  'manage_training_plan',
  'manage_pac',
  'manage_fac'
);

-- Create user privilege assignments table
CREATE TABLE IF NOT EXISTS public.user_privilege_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  privilege user_privilege NOT NULL,
  granted_by uuid REFERENCES public.profiles(user_id),
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, privilege)
);

-- Enable RLS on user_privilege_assignments
ALTER TABLE public.user_privilege_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_privilege_assignments
CREATE POLICY "Users can view their own privileges" 
ON public.user_privilege_assignments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all privileges" 
ON public.user_privilege_assignments 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Create authentication tokens table for secure approval links
CREATE TABLE IF NOT EXISTS public.authentication_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_request_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  authenticator_id uuid NOT NULL REFERENCES public.profiles(user_id),
  action_type text NOT NULL CHECK (action_type IN ('approve', 'reject')),
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on authentication_tokens
ALTER TABLE public.authentication_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for authentication_tokens
CREATE POLICY "Authenticators can use their tokens" 
ON public.authentication_tokens 
FOR ALL 
USING (auth.uid() = authenticator_id);

CREATE POLICY "Admins can view all tokens" 
ON public.authentication_tokens 
FOR SELECT 
USING (user_is_admin(auth.uid()));

-- Function to create authentication tokens
CREATE OR REPLACE FUNCTION public.create_authentication_token(
  request_id uuid,
  auth_id uuid,
  action text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_value text;
BEGIN
  -- Generate secure token
  token_value := encode(gen_random_bytes(32), 'hex');
  
  -- Insert token
  INSERT INTO public.authentication_tokens (
    user_request_id,
    token,
    authenticator_id,
    action_type,
    expires_at
  ) VALUES (
    request_id,
    token_value,
    auth_id,
    action,
    now() + interval '24 hours'
  );
  
  RETURN token_value;
END;
$$;

-- Function to validate and use authentication token
CREATE OR REPLACE FUNCTION public.validate_authentication_token(token_value text)
RETURNS TABLE(
  is_valid boolean,
  user_request_id uuid,
  authenticator_id uuid,
  action_type text,
  user_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record record;
  user_record record;
BEGIN
  -- Get token details
  SELECT * INTO token_record
  FROM public.authentication_tokens
  WHERE token = token_value
    AND used = false
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::uuid, null::uuid, null::text, null::jsonb;
    RETURN;
  END IF;
  
  -- Get user request data
  SELECT * INTO user_record
  FROM public.profiles
  WHERE user_id = token_record.user_request_id;
  
  -- Return validation result
  RETURN QUERY SELECT 
    true,
    token_record.user_request_id,
    token_record.authenticator_id,
    token_record.action_type,
    to_jsonb(user_record);
END;
$$;

-- Function to mark token as used
CREATE OR REPLACE FUNCTION public.use_authentication_token(token_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.authentication_tokens
  SET used = true, used_at = now()
  WHERE token = token_value
    AND used = false
    AND expires_at > now();
  
  RETURN FOUND;
END;
$$;

-- Function to get user privileges
CREATE OR REPLACE FUNCTION public.get_user_privileges(target_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN ARRAY(
    SELECT privilege::text
    FROM public.user_privilege_assignments
    WHERE user_id = target_user_id
  );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_privilege_assignments_user_id ON public.user_privilege_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_authentication_tokens_token ON public.authentication_tokens(token) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_authentication_tokens_user_request ON public.authentication_tokens(user_request_id);

-- Add privilege checking function
CREATE OR REPLACE FUNCTION public.user_has_specific_privilege(user_uuid uuid, privilege_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_privilege_assignments 
    WHERE user_id = user_uuid 
    AND privilege = privilege_name::user_privilege
  );
END;
$$;