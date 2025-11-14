import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  online_at: string;
}

export const useUserPresence = (currentUserId: string | undefined) => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel('online-users');

    // Track own presence
    const updatePresence = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', currentUserId)
        .single();

      if (profile) {
        channel.track({
          user_id: currentUserId,
          full_name: profile.full_name || 'Unknown',
          avatar_url: profile.avatar_url,
          online_at: new Date().toISOString()
        });
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((presence) => {
            if (presence.user_id !== currentUserId) {
              users.push(presence as PresenceUser);
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await updatePresence();
        }
      });

    // Update presence every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    return () => {
      clearInterval(interval);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return onlineUsers;
};
