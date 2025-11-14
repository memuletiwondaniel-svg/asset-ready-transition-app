-- Drop ALL existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Users can view basic profile info for team selection" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "All users can view profiles" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view only their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a policy for admins to view all profiles for management
CREATE POLICY "Admins have full profile access"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_is_admin(auth.uid()));

-- Create a secure function to get only public-safe profile info for team selection
-- This function returns ONLY non-sensitive fields needed for team selection
CREATE OR REPLACE FUNCTION public.get_team_member_info(member_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  user_position text,
  department text,
  company user_company
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return basic, non-sensitive information
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p."position" as user_position,
    p.department,
    p.company
  FROM public.profiles p
  WHERE p.user_id = member_user_id 
    AND p.is_active = true
    AND p.account_status = 'active';
END;
$$;

-- Create a function to search team members by name (returns limited info)
CREATE OR REPLACE FUNCTION public.search_team_members(search_term text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  user_position text,
  department text,
  company user_company
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return basic, non-sensitive information for active users
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p."position" as user_position,
    p.department,
    p.company
  FROM public.profiles p
  WHERE p.is_active = true 
    AND p.account_status = 'active'
    AND (
      search_term IS NULL 
      OR p.full_name ILIKE '%' || search_term || '%'
      OR p."position" ILIKE '%' || search_term || '%'
      OR p.department ILIKE '%' || search_term || '%'
    )
  ORDER BY p.full_name
  LIMIT 100;
END;
$$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION public.get_team_member_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_team_members(text) TO authenticated;