import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePSSRAllowedApproverRoles = () => {
  const { data: allowedRoleIds = [], isLoading } = useQuery({
    queryKey: ['pssr-allowed-approver-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pssr_allowed_approver_roles')
        .select('role_id');

      if (error) throw error;
      return data.map(item => item.role_id);
    },
  });

  return { allowedRoleIds, isLoading };
};
