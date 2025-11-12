import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Edit } from 'lucide-react';

interface P2ARealtimePresenceProps {
  handoverId: string;
  deliverableId?: string;
}

interface PresenceUser {
  user_id: string;
  name: string;
  is_editing: boolean;
  last_seen: string;
}

export const P2ARealtimePresence: React.FC<P2ARealtimePresenceProps> = ({ 
  handoverId, 
  deliverableId 
}) => {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const initializePresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);

      // Subscribe to realtime changes
      const channel = supabase
        .channel(`p2a-presence-${handoverId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'p2a_user_presence',
            filter: `handover_id=eq.${handoverId}`,
          },
          (payload) => {
            console.log('Presence change:', payload);
            fetchActiveUsers();
          }
        )
        .subscribe();

      // Update own presence
      await updatePresence(false);

      // Fetch initial active users
      fetchActiveUsers();

      // Update presence every 30 seconds
      const interval = setInterval(() => {
        updatePresence(false);
      }, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
        // Mark as no longer present
        updatePresence(false, true);
      };
    };

    initializePresence();
  }, [handoverId, deliverableId]);

  const updatePresence = async (isEditing: boolean, remove: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (remove) {
      await supabase
        .from('p2a_user_presence')
        .delete()
        .eq('user_id', user.id)
        .eq('handover_id', handoverId);
    } else {
      await supabase
        .from('p2a_user_presence')
        .upsert({
          user_id: user.id,
          handover_id: handoverId,
          deliverable_id: deliverableId,
          is_editing: isEditing,
          last_seen: new Date().toISOString(),
        });
    }
  };

  const fetchActiveUsers = async () => {
    const { data, error } = await supabase
      .from('p2a_user_presence')
      .select(`
        user_id,
        is_editing,
        last_seen,
        profiles:user_id (
          full_name,
          first_name,
          last_name
        )
      `)
      .eq('handover_id', handoverId)
      .gte('last_seen', new Date(Date.now() - 60000).toISOString()); // Active in last minute

    if (error) {
      console.error('Error fetching active users:', error);
      return;
    }

    const users = data?.map((u: any) => ({
      user_id: u.user_id,
      name: u.profiles?.full_name || u.profiles?.first_name || 'Anonymous',
      is_editing: u.is_editing,
      last_seen: u.last_seen,
    })) || [];

    setActiveUsers(users.filter(u => u.user_id !== currentUser?.id));
  };

  const notifyEditing = async () => {
    await updatePresence(true);
  };

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/40">
      <Eye className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Active:</span>
      <TooltipProvider>
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 5).map((user) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {user.is_editing && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                      <Edit className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs">{user.is_editing ? 'Editing' : 'Viewing'}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      {activeUsers.length > 5 && (
        <Badge variant="secondary" className="text-xs">
          +{activeUsers.length - 5}
        </Badge>
      )}
    </div>
  );
};