import { useEffect, useState, useCallback, useRef } from 'react';
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
  const previousAvatarRef = useRef<string | null>(null);

  const getAvatarUrl = useCallback((avatarPath: string | null, forceRefresh = false) => {
    if (!avatarPath) return null;
    
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    
    const publicUrl = supabase.storage.from('user-avatars').getPublicUrl(avatarPath).data.publicUrl;
    
    // Only add cache-busting if avatar changed or force refresh
    if (forceRefresh) {
      return `${publicUrl}?t=${Date.now()}`;
    }
    
    return publicUrl;
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, position, email, company, phone_number')
      .eq('user_id', userId)
      .single();

    if (data) {
      const avatarUrl = getAvatarUrl(data.avatar_url, false);
      previousAvatarRef.current = data.avatar_url;
      
      // Preload avatar image before updating state
      if (avatarUrl) {
        const img = new Image();
        img.src = avatarUrl;
      }
      
      setProfile({ ...data, avatar_url: avatarUrl });
    }
  }, [userId, getAvatarUrl]);

  useEffect(() => {
    fetchProfile();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`profile-changes-${userId}`)
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
          
          // Check if avatar actually changed
          const avatarChanged = newData.avatar_url !== previousAvatarRef.current;
          const avatarUrl = getAvatarUrl(newData.avatar_url, avatarChanged);
          
          previousAvatarRef.current = newData.avatar_url;
          setProfile({ ...newData, avatar_url: avatarUrl });
          
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['profile-users'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, fetchProfile, getAvatarUrl]);

  return { profile, refetch: fetchProfile };
};
