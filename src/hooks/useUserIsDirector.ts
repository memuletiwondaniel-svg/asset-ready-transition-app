import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

/**
 * Hook to check if the current user has a director-level role
 * Directors get a simplified SoF-only view in My Tasks
 */
export const useUserIsDirector = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-is-director', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      // Get user's role_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.role) return false;

      // Check if the role is a director role
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('is_director')
        .eq('id', profile.role)
        .single();

      if (roleError) return false;

      return role?.is_director === true;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
