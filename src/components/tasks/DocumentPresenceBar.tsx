import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  online_at: string;
}

interface DocumentPresenceBarProps {
  users: PresenceUser[];
  saveStatus: 'saved' | 'saving' | 'unsaved';
}

const DocumentPresenceBar: React.FC<DocumentPresenceBarProps> = ({ users, saveStatus }) => {
  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/50 rounded-t-lg">
      {/* Online users */}
      <div className="flex items-center gap-1">
        {users.length > 0 ? (
          <TooltipProvider>
            <div className="flex -space-x-1.5">
              {users.slice(0, 5).map((u) => (
                <Tooltip key={u.user_id}>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className="h-6 w-6 border-2 border-background">
                        {u.avatar_url ? (
                          <AvatarImage src={u.avatar_url} alt={u.full_name} />
                        ) : null}
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-background" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {u.full_name} — editing
                  </TooltipContent>
                </Tooltip>
              ))}
              {users.length > 5 && (
                <span className="text-[10px] text-muted-foreground ml-2">
                  +{users.length - 5} more
                </span>
              )}
            </div>
          </TooltipProvider>
        ) : (
          <span className="text-[10px] text-muted-foreground">Only you</span>
        )}
      </div>

      {/* Save status */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            saveStatus === 'saved' && 'bg-emerald-500',
            saveStatus === 'saving' && 'bg-amber-500 animate-pulse',
            saveStatus === 'unsaved' && 'bg-amber-500'
          )}
        />
        <span className="text-[10px] text-muted-foreground">
          {saveStatus === 'saved' && 'All changes saved'}
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'unsaved' && 'Unsaved changes'}
        </span>
      </div>
    </div>
  );
};

export default DocumentPresenceBar;
