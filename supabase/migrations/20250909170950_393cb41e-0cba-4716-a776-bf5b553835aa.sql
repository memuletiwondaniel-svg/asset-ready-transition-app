-- Fix security warnings by adding search_path to functions and dropping the problematic view

-- Drop the security definer view that's causing issues
DROP VIEW IF EXISTS public.user_management_view;

-- Update functions to include search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign default 'user' role to new users
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.user_id, 'user', NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role = role_name::public.user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create a simple function to get user management data instead of a view
CREATE OR REPLACE FUNCTION public.get_user_management_data()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  company public.user_company,
  employee_id TEXT,
  job_title TEXT,
  phone_number TEXT,
  account_status TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  sso_enabled BOOLEAN,
  roles TEXT[],
  manager_name TEXT
) AS $$
BEGIN
  RETURN QUERY
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
    ARRAY_AGG(ur.role::TEXT) as roles,
    manager.full_name as manager_name
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id
  LEFT JOIN public.profiles manager ON p.manager_id = manager.user_id
  GROUP BY p.user_id, p.email, p.full_name, p.company, p.employee_id, 
           p.job_title, p.phone_number, p.account_status, p.last_login_at, 
           p.created_at, p.sso_enabled, manager.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;