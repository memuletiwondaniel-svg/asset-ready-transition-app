import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CurrentUserRole {
  userId: string | null;
  role: string | null;
  position: string | null;
  isLoading: boolean;
}

// Roles allowed to create VCRs
const VCR_CREATOR_ROLES = [
  'ORA Engineer',
  'ORA Lead',
  'ORA Engr.',
  'ORA Engr',
  'Snr ORA Engr',
  'Snr ORA Engr.',
  'Snr. ORA Engr.',
  'Snr. ORA Engr',
  'Senior ORA Engr.',
  'Senior ORA Engineer',
];

export const useCurrentUserRole = () => {
  return useQuery({
    queryKey: ['current-user-role'],
    staleTime: 300000, // Cache for 5 minutes
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { userId: null, role: null, position: null };

      // Get user's profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, position')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { userId: user.id, role: null, position: null };
      }

      // If role is a UUID, look up the role name
      let roleName = profile?.role || null;
      if (roleName && roleName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('name')
          .eq('id', roleName)
          .single();
        roleName = roleData?.name || null;
      }

      return {
        userId: user.id,
        role: roleName,
        position: profile?.position || null,
      };
    },
  });
};

/**
 * Check if the current user can create VCRs
 * Only ORA Engineers and ORA Leads are allowed
 */
export const useCanCreateVCR = () => {
  const { data, isLoading } = useCurrentUserRole();
  
  const canCreate = !isLoading && data?.role && VCR_CREATOR_ROLES.some(
    allowedRole => data.role?.toLowerCase().includes(allowedRole.toLowerCase()) ||
                   allowedRole.toLowerCase().includes(data.role?.toLowerCase() || '')
  );

  return { canCreate, isLoading };
};
