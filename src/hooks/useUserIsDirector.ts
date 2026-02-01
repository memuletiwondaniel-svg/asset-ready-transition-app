import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

// The director roles that get the simplified SoF-only view
const DIRECTOR_ROLE_PATTERNS = [
  'P&E Director',
  'P&M Director',
  'HSE Director',
  'HSSE Director',
  'BNGL Director',
  'CS Director',
  'UQ Director',
  'KAZ Director',
  'NRNGL Director',
];

/**
 * Hook to check if the current user has a director-level role
 * Directors get a simplified SoF-only view in My Tasks
 * Identified by role name matching known director patterns
 */
export const useUserIsDirector = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-is-director', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      // Get user's role from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.role) return false;

      // Get the role name
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', profile.role)
        .single();

      if (roleError || !role?.name) return false;

      // Check if role name matches any director pattern
      return DIRECTOR_ROLE_PATTERNS.some(
        pattern => role.name.toLowerCase() === pattern.toLowerCase()
      );
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
