import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileUser {
  user_id: string;
  full_name: string;
  role?: string;
  position?: string;
  avatar_url?: string;
}

export const useProfileUsers = () => {
  return useQuery({
    queryKey: ['profile-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, avatar_url')
        .eq('is_active', true)
        .not('full_name', 'is', null);

      if (error) throw error;

      return data?.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || '',
        role: profile.position || '',
        position: profile.position || '',
        avatar_url: profile.avatar_url || ''
      })) || [];
    }
  });
};

export const useProfileUsersByRole = (role: string) => {
  return useQuery({
    queryKey: ['profile-users-by-role', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, avatar_url')
        .eq('is_active', true)
        .not('full_name', 'is', null);

      if (error) throw error;

      return data?.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || '',
        role: profile.position || '',
        position: profile.position || '',
        avatar_url: profile.avatar_url || ''
      })) || [];
    },
    enabled: true
  });
};