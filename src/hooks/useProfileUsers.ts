import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileUser {
  user_id: string;
  full_name: string;
  role?: string;
  position?: string;
}

export const useProfileUsers = () => {
  return useQuery({
    queryKey: ['profile-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, position')
        .eq('is_active', true)
        .not('full_name', 'is', null);

      if (error) throw error;

      return data?.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || '',
        role: profile.position || '',
        position: profile.position || ''
      })) || [];
    }
  });
};

export const useProfileUsersByRole = (role: string) => {
  return useQuery({
    queryKey: ['profile-users-by-role', role],
    queryFn: async () => {
      if (!role || role === 'Other') {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, position')
          .eq('is_active', true)
          .not('full_name', 'is', null);

        if (error) throw error;

        return data?.map(profile => ({
          user_id: profile.user_id,
          full_name: profile.full_name || '',
          role: profile.position || '',
          position: profile.position || ''
        })) || [];
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, position')
        .eq('is_active', true)
        .eq('position', role)
        .not('full_name', 'is', null);

      if (error) throw error;

      return data?.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || '',
        role: profile.position || '',
        position: profile.position || ''
      })) || [];
    },
    enabled: !!role
  });
};