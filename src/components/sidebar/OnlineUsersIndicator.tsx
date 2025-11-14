import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface OnlineUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  online_at: string;
}

interface OnlineUsersIndicatorProps {
  users: OnlineUser[];
  collapsed?: boolean;
}

export const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({
  users,
  collapsed = false
}) => {
  if (users.length === 0) return null;

  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return supabase.storage.from('user-avatars').getPublicUrl(avatarUrl).data.publicUrl;
  };

  const displayUsers = users.slice(0, 5);
  const remainingCount = users.length - displayUsers.length;

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center w-full h-10">
              <div className="relative">
                <Users className="h-5 w-5 text-muted-foreground" />
                {users.length > 0 && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium text-xs">{users.length} team member{users.length !== 1 ? 's' : ''} online</p>
              <div className="space-y-1">
                {users.slice(0, 3).map((user) => (
                  <p key={user.user_id} className="text-xs text-muted-foreground">
                    {user.full_name}
                  </p>
                ))}
                {users.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{users.length - 3} more
                  </p>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="px-3 py-3 border-t border-border/40 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">
            {users.length} Online
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        {displayUsers.map((user) => {
          const initials = user.full_name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <TooltipProvider key={user.user_id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="h-8 w-8 border-2 border-card cursor-pointer hover:scale-110 transition-transform">
                      <AvatarImage src={getAvatarUrl(user.avatar_url) || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-card" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{user.full_name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        
        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{remainingCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  {users.slice(5).map((user) => (
                    <p key={user.user_id} className="text-xs">
                      {user.full_name}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};
