-- First, create a security definer function to check if user is admin (fixes infinite recursion)
CREATE OR REPLACE FUNCTION public.user_is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role = 'admin'::user_role
  );
END;
$$;

-- Drop the existing overly permissive policy that allows all users to see all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policies for the profiles table
-- Policy 1: Users can view their own complete profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Admins can view all profiles for user management purposes
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.user_is_admin(auth.uid()));

-- Update user_roles policies to fix infinite recursion
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (public.user_is_admin(auth.uid()));

-- Update user_privileges policies to fix infinite recursion  
DROP POLICY IF EXISTS "Admins can manage all user privileges" ON public.user_privileges;
CREATE POLICY "Admins can manage all user privileges" 
ON public.user_privileges 
FOR ALL 
USING (public.user_is_admin(auth.uid()));

-- Create a function for getting limited public profile info for legitimate business needs
CREATE OR REPLACE FUNCTION public.get_public_profile_info(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  first_name text,
  last_name text,
  company user_company,
  job_title text,
  department text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return basic info needed for team selection, etc.
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.company,
    p.job_title,
    p.department
  FROM public.profiles p
  WHERE p.user_id = target_user_id 
    AND p.is_active = true;
END;
$$;