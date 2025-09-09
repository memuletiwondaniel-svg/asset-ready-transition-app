-- Enhanced user management system

-- Add additional user status and management fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_change_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "email_notifications": true,
  "pssr_updates": true,
  "system_alerts": true,
  "delegation_alerts": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_password_reset timestamp with time zone,
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS backup_email text;

-- Create user sessions table for SSO tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  sso_provider text,
  ip_address inet,
  user_agent text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.user_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" 
ON public.user_sessions 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on password_reset_tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for password_reset_tokens
CREATE POLICY "Admins can manage password reset tokens" 
ON public.password_reset_tokens 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Create user activity log table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity_logs
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs" 
ON public.user_activity_logs 
FOR ALL 
USING (user_is_admin(auth.uid()));

-- Create function to get enhanced user management data
CREATE OR REPLACE FUNCTION public.get_enhanced_user_management_data()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  first_name text,
  last_name text,
  company user_company,
  employee_id text,
  job_title text,
  department text,
  phone_number text,
  account_status text,
  status user_status,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone,
  sso_enabled boolean,
  two_factor_enabled boolean,
  roles text[],
  projects text[],
  manager_name text,
  pending_actions integer,
  login_attempts integer,
  locked_until timestamp with time zone,
  password_change_required boolean,
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.first_name,
    p.last_name,
    p.company,
    p.employee_id,
    p.job_title,
    p.department,
    p.phone_number,
    p.account_status,
    p.status,
    p.last_login_at,
    p.created_at,
    p.sso_enabled,
    p.two_factor_enabled,
    COALESCE(ARRAY_AGG(DISTINCT ur.role::TEXT) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::TEXT[]) as roles,
    COALESCE(ARRAY_AGG(DISTINCT up.project_name) FILTER (WHERE up.project_name IS NOT NULL), ARRAY[]::TEXT[]) as projects,
    manager.full_name as manager_name,
    COALESCE(COUNT(DISTINCT pcr.id) FILTER (WHERE pcr.status = 'NOT_SUBMITTED'), 0)::integer as pending_actions,
    p.login_attempts,
    p.locked_until,
    p.password_change_required,
    us.last_activity
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN public.user_projects up ON p.user_id = up.user_id
  LEFT JOIN public.profiles manager ON p.manager_id = manager.user_id
  LEFT JOIN public.pssrs pssr ON pssr.user_id = p.user_id
  LEFT JOIN public.pssr_checklist_responses pcr ON pcr.pssr_id = pssr.id
  LEFT JOIN public.user_sessions us ON us.user_id = p.user_id AND us.is_active = true
  GROUP BY 
    p.user_id, p.email, p.full_name, p.first_name, p.last_name, p.company, 
    p.employee_id, p.job_title, p.department, p.phone_number, p.account_status, 
    p.status, p.last_login_at, p.created_at, p.sso_enabled, p.two_factor_enabled,
    p.login_attempts, p.locked_until, p.password_change_required,
    manager.full_name, us.last_activity;
END;
$$;

-- Function to handle user login tracking
CREATE OR REPLACE FUNCTION public.track_user_login(user_uuid uuid, session_data jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update last login
  UPDATE public.profiles 
  SET 
    last_login_at = now(),
    login_attempts = 0,
    locked_until = NULL
  WHERE user_id = user_uuid;
  
  -- Log the activity
  INSERT INTO public.user_activity_logs (user_id, activity_type, description, metadata)
  VALUES (
    user_uuid, 
    'login', 
    'User logged in successfully',
    COALESCE(session_data, '{}'::jsonb)
  );
END;
$$;

-- Function to handle failed login attempts
CREATE OR REPLACE FUNCTION public.track_failed_login(user_uuid uuid, ip_addr inet DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_attempts integer;
BEGIN
  -- Increment login attempts
  UPDATE public.profiles 
  SET 
    login_attempts = login_attempts + 1,
    locked_until = CASE 
      WHEN login_attempts >= 4 THEN now() + interval '30 minutes'
      ELSE locked_until
    END
  WHERE user_id = user_uuid
  RETURNING login_attempts INTO current_attempts;
  
  -- Log the failed attempt
  INSERT INTO public.user_activity_logs (user_id, activity_type, description, ip_address, metadata)
  VALUES (
    user_uuid, 
    'failed_login', 
    'Failed login attempt',
    ip_addr,
    jsonb_build_object('attempt_number', current_attempts)
  );
END;
$$;

-- Function to reset user password
CREATE OR REPLACE FUNCTION public.initiate_password_reset(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  reset_token_id uuid;
BEGIN
  -- Find user by email
  SELECT user_id INTO target_user_id
  FROM public.profiles
  WHERE email = user_email AND is_active = true;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Create password reset token
  INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
  VALUES (
    target_user_id,
    encode(gen_random_bytes(32), 'hex'),
    now() + interval '1 hour'
  )
  RETURNING id INTO reset_token_id;
  
  -- Log the activity
  INSERT INTO public.user_activity_logs (user_id, activity_type, description)
  VALUES (target_user_id, 'password_reset_requested', 'Password reset token generated');
  
  RETURN reset_token_id;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token) WHERE used = false;
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create triggers for updating timestamps
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add notification function for user management events
CREATE OR REPLACE FUNCTION public.notify_user_management_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notify about user profile changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.user_activity_logs (user_id, activity_type, description, metadata)
    VALUES (
      NEW.user_id,
      'status_changed',
      'User status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for user status changes
CREATE TRIGGER notify_user_status_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_management_event();