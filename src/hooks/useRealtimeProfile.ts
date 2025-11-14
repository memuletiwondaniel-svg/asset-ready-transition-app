import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  position: string | null;
  email: string | null;
  company: string | null;
  phone_number: string | null;
}

export const useRealtimeProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Fetch initial profile
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, position, email, company, phone_number')
        .eq('user_id', userId)
        .single();

      if (data) {
        const avatarUrl = data.avatar_url?.startsWith('http') 
          ? data.avatar_url 
          : data.avatar_url 
            ? supabase.storage.from('user-avatars').getPublicUrl(data.avatar_url).data.publicUrl 
            : null;
        
        setProfile({ ...data, avatar_url: avatarUrl });
      }
    };

    fetchProfile();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newData = payload.new as UserProfile;
          const avatarUrl = newData.avatar_url?.startsWith('http') 
            ? newData.avatar_url 
            : newData.avatar_url 
              ? supabase.storage.from('user-avatars').getPublicUrl(newData.avatar_url).data.publicUrl 
              : null;
          
          setProfile({ ...newData, avatar_url: avatarUrl });
          
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['profile-users'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return profile;
};
