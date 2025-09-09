-- First, fix the infinite recursion issue in user_roles by creating a security definer function
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

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new restrictive policies for the profiles table
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

-- Update the existing user_roles policies to use the security definer function
-- to prevent infinite recursion
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (public.user_is_admin(auth.uid()));

-- Also update user_privileges policies
DROP POLICY IF EXISTS "Admins can manage all user privileges" ON public.user_privileges;
CREATE POLICY "Admins can manage all user privileges" 
ON public.user_privileges 
FOR ALL 
USING (public.user_is_admin(auth.uid()));

-- Create a view for limited public profile information that users can access
-- for legitimate business needs (like team member selection)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  full_name,
  first_name,
  last_name,
  company,
  job_title,
  department
FROM public.profiles
WHERE is_active = true;

-- Set up RLS for the view - users can see basic info for team selection
ALTER VIEW public.public_profiles SET (security_barrier = true);
GRANT SELECT ON public.public_profiles TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can view public profile information" 
ON public.public_profiles 
FOR SELECT 
TO authenticated
USING (true);