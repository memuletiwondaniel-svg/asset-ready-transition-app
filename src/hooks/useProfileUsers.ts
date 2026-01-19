import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileUser {
  user_id: string;
  full_name: string;
  role?: string;
  role_id?: string;
  position?: string;
  avatar_url?: string;
  hub_id?: string;
}

const getFullAvatarUrl = (avatarUrl: string | null) => {
  if (!avatarUrl) return '';
  
  // If already a full URL, return as is
  if (avatarUrl.startsWith('http')) return avatarUrl;
  
  // If it's a partial path, construct the full URL
  const { data } = supabase.storage.from('user-avatars').getPublicUrl(avatarUrl);
  return data.publicUrl;
};

export const useProfileUsers = () => {
  return useQuery({
    queryKey: ['profile-users'],
    staleTime: 120000, // Cache for 2 minutes
    queryFn: async () => {
      // Fetch profiles with role UUIDs and hub
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, avatar_url, role, hub')
        .eq('is_active', true)
        .not('full_name', 'is', null);

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name');

      if (rolesError) throw rolesError;

      // Create role lookup map
      const roleMap = new Map(roles?.map(r => [r.id, r.name]) || []);

      return profiles?.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || '',
        role: roleMap.get(profile.role) || '',
        role_id: profile.role || '',
        position: profile.position || '',
        avatar_url: getFullAvatarUrl(profile.avatar_url),
        hub_id: profile.hub || ''
      })) || [];
    }
  });
};

export const useProfileUsersByRole = (role: string) => {
  return useQuery({
    queryKey: ['profile-users-by-role', role],
    queryFn: async () => {
      // Fetch profiles with role UUIDs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, position, avatar_url, role')
        .eq('is_active', true)
        .not('full_name', 'is', null);

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id, name');

      if (rolesError) throw rolesError;

      // Create role lookup map
      const roleMap = new Map(roles?.map(r => [r.id, r.name]) || []);

      return profiles?.map(profile => ({
        user_id: profile.user_id,
        full_name: profile.full_name || '',
        role: roleMap.get(profile.role) || '',
        position: profile.position || '',
        avatar_url: getFullAvatarUrl(profile.avatar_url)
      })) || [];
    },
    enabled: true
  });
};