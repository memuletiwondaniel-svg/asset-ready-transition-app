import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Cloud, CloudOff, Loader2, Users, Wifi } from 'lucide-react';

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

  const activeCount = users.length + 1; // +1 for current user

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-b border-border/40">
      {/* Left: Online users */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3 w-3" />
          <span className="text-[10px] font-medium tracking-wide uppercase">
            {activeCount} {activeCount === 1 ? 'editor' : 'editors'}
          </span>
        </div>

        {users.length > 0 && (
          <TooltipProvider delayDuration={200}>
            <div className="flex -space-x-2">
              {users.slice(0, 4).map((u, i) => (
                <Tooltip key={u.user_id}>
                  <TooltipTrigger asChild>
                    <div className="relative group/avatar">
                      <Avatar className={cn(
                        'h-6 w-6 ring-2 ring-background transition-all duration-200',
                        'group-hover/avatar:ring-primary/30 group-hover/avatar:scale-110 group-hover/avatar:z-10'
                      )}>
                        {u.avatar_url ? (
                          <AvatarImage src={u.avatar_url} alt={u.full_name} />
                        ) : null}
                        <AvatarFallback className="text-[8px] font-semibold bg-primary/10 text-primary">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {u.full_name}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
              {users.length > 4 && (
                <div className="h-6 w-6 rounded-full bg-muted ring-2 ring-background flex items-center justify-center">
                  <span className="text-[9px] font-semibold text-muted-foreground">
                    +{users.length - 4}
                  </span>
                </div>
              )}
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Right: Save status pill */}
      <div className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300',
        saveStatus === 'saved' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        saveStatus === 'saving' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        saveStatus === 'unsaved' && 'bg-muted text-muted-foreground'
      )}>
        {saveStatus === 'saved' && <Cloud className="h-3 w-3" />}
        {saveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
        {saveStatus === 'unsaved' && <CloudOff className="h-3 w-3" />}
        <span>
          {saveStatus === 'saved' && 'Synced'}
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'unsaved' && 'Unsaved'}
        </span>
      </div>
    </div>
  );
};

export default DocumentPresenceBar;
