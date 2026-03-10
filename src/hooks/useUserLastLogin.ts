import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';

export const useUserLastLogin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lastLogin } = useQuery({
    queryKey: ['user-last-login', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('last_login_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.last_login_at || null;
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Don't refetch during session
  });

  const updateLastLogin = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-last-login', user?.id] });
    },
  });

  const isNewSinceLastLogin = (createdAt: string): boolean => {
    if (!lastLogin) return false;
    return new Date(createdAt) > new Date(lastLogin);
  };

  return {
    lastLogin,
    updateLastLogin: updateLastLogin.mutate,
    isNewSinceLastLogin,
  };
};
