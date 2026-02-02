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

// Director roles that should only have SOF access (no project creation, etc.)
const SOF_ONLY_DIRECTOR_ROLES = [
  'P&E Director',
  'P&M Director',
  'HSE Director',
  'HSSE Director',
  'BNGL Director',
  'CS Director',
  'UQ Director',
  'KAZ Director',
  'NRNGL Director',
  'Plant Director',
  'Dep. Plant Director',
  'Deputy Plant Director',
];

export const useCurrentUserRole = () => {
  return useQuery({
    queryKey: ['current-user-role'],
    staleTime: 300000, // Cache for 5 minutes
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { userId: null, role: null, position: null };

      // Get user's profile with role - join with roles table to get role name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          role,
          position,
          roles:role (
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return { userId: user.id, role: null, position: null };
      }

      // Get the role name from the joined roles table
      const roleName = (profile?.roles as any)?.name || null;

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

/**
 * Check if the current user is a director (SOF-only access)
 * Directors should not be able to create projects, VCRs, PSSRs, etc.
 */
export const useIsDirector = () => {
  const { data, isLoading } = useCurrentUserRole();
  
  const isDirector = !isLoading && data?.role && SOF_ONLY_DIRECTOR_ROLES.some(
    directorRole => data.role?.toLowerCase() === directorRole.toLowerCase() ||
                    data.role?.toLowerCase().includes(directorRole.toLowerCase())
  );

  return { isDirector, isLoading, role: data?.role };
};

/**
 * Check if user can perform general actions (create projects, PSSRs, etc.)
 * Directors are excluded from these actions
 */
export const useCanPerformActions = () => {
  const { isDirector, isLoading } = useIsDirector();
  
  return { canPerformActions: !isLoading && !isDirector, isLoading };
};
