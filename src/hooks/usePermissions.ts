import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppPermission =
  | 'create_project'
  | 'create_vcr'
  | 'create_pssr'
  | 'approve_pssr'
  | 'approve_sof'
  | 'manage_users'
  | 'access_admin'
  | 'view_reports'
  | 'create_ora_plan'
  | 'manage_p2a'
  | 'manage_orm'
  | 'create_p2a_plan';

export const usePermissions = () => {
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['user-permissions'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id,
      });

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }

      return (data as string[]) || [];
    },
  });

  const hasPermission = (permission: AppPermission): boolean => {
    return permissions.includes(permission);
  };

  return { permissions, hasPermission, isLoading };
};

/**
 * Convenience hook: replaces useCanCreateVCR
 */
export const useCanCreateVCRPermission = () => {
  const { hasPermission, isLoading } = usePermissions();
  return { canCreate: !isLoading && hasPermission('create_vcr'), isLoading };
};

/**
 * Convenience hook: replaces useIsDirector
 * A user is considered "director-only" if they have view_reports but NOT create_project
 */
export const useIsDirectorPermission = () => {
  const { hasPermission, isLoading } = usePermissions();
  const isDirector = !isLoading && hasPermission('view_reports') && !hasPermission('create_project');
  return { isDirector, isLoading };
};

/**
 * Convenience hook: replaces useCanPerformActions
 */
export const useCanPerformActionsPermission = () => {
  const { hasPermission, isLoading } = usePermissions();
  return { canPerformActions: !isLoading && hasPermission('create_project'), isLoading };
};
