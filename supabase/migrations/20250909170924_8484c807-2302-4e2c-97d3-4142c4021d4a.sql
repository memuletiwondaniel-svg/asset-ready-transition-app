-- Create user roles enum
CREATE TYPE public.user_company AS ENUM ('BGC', 'KENT');
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'engineer', 'safety_officer', 'technical_authority', 'user');

-- Update profiles table to include company and extended user information
ALTER TABLE public.profiles 
ADD COLUMN company public.user_company,
ADD COLUMN employee_id TEXT,
ADD COLUMN phone_number TEXT,
ADD COLUMN job_title TEXT,
ADD COLUMN manager_id UUID REFERENCES public.profiles(user_id),
ADD COLUMN sso_enabled BOOLEAN DEFAULT false,
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended', 'pending_approval'));

-- Create user roles junction table for multiple roles per user
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    role public.user_role NOT NULL,
    granted_by UUID REFERENCES public.profiles(user_id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Create audit log table for user actions
CREATE TABLE public.user_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit logs (only admins can view)
CREATE POLICY "Admins can view audit logs" 
ON public.user_audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Create function to handle user login audit
CREATE OR REPLACE FUNCTION public.log_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_login_at
  UPDATE public.profiles 
  SET last_login_at = now() 
  WHERE user_id = NEW.id;
  
  -- Log the login action
  INSERT INTO public.user_audit_logs (user_id, action, details)
  VALUES (NEW.id, 'login', jsonb_build_object('login_time', now()));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for login auditing on auth.users
CREATE TRIGGER on_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.log_user_login();

-- Create function to assign default role to new users
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign default 'user' role to new users
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.user_id, 'user', NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to assign default role
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_user_role();

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role = role_name::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create view for user management dashboard
CREATE VIEW public.user_management_view AS
SELECT 
  p.user_id,
  p.email,
  p.full_name,
  p.company,
  p.employee_id,
  p.job_title,
  p.phone_number,
  p.account_status,
  p.last_login_at,
  p.created_at,
  p.sso_enabled,
  ARRAY_AGG(ur.role) as roles,
  manager.full_name as manager_name
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
LEFT JOIN public.profiles manager ON p.manager_id = manager.user_id
GROUP BY p.user_id, p.email, p.full_name, p.company, p.employee_id, 
         p.job_title, p.phone_number, p.account_status, p.last_login_at, 
         p.created_at, p.sso_enabled, manager.full_name;