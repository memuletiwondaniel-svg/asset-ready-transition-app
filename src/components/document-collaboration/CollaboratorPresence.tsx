import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CollaboratorPresenceData } from '@/hooks/useAttachmentCollaboration';

interface CollaboratorPresenceProps {
  onlineUsers: CollaboratorPresenceData[];
  currentPage: number;
  totalPages: number;
  fileName: string;
}

export const CollaboratorPresence: React.FC<CollaboratorPresenceProps> = ({
  onlineUsers,
  currentPage,
  totalPages,
  fileName,
}) => {
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/80 text-xs">
      {/* Left: File info */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Cloud className="h-3.5 w-3.5 text-emerald-500" />
        <span>Auto-saved</span>
        <span className="text-border">•</span>
        <span className="truncate max-w-[200px]">{fileName}</span>
        {totalPages > 1 && (
          <>
            <span className="text-border">•</span>
            <span>Page {currentPage}/{totalPages}</span>
          </>
        )}
      </div>

      {/* Right: Online users */}
      <div className="flex items-center gap-1.5">
        {onlineUsers.length > 0 ? (
          <>
            <span className="text-muted-foreground mr-1">
              {onlineUsers.length} online
            </span>
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 5).map((u) => (
                <Tooltip key={u.user_id}>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6 border-2 border-card">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary/10">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{u.full_name} — Page {u.page_number}</TooltipContent>
                </Tooltip>
              ))}
              {onlineUsers.length > 5 && (
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted border-2 border-card text-[8px] font-medium">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground/60 flex items-center gap-1">
            <CloudOff className="h-3 w-3" /> Only you
          </span>
        )}
      </div>
    </div>
  );
};
