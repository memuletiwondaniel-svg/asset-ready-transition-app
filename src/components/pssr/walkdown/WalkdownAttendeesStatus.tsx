import React from 'react';
import { useOutlookCalendar } from '@/hooks/useOutlookCalendar';
import { useMicrosoftOAuth } from '@/hooks/useMicrosoftOAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check,
  X,
  HelpCircle,
  Clock,
  RefreshCw,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalkdownAttendeesStatusProps {
  walkdownEventId: string;
  showSyncButton?: boolean;
  compact?: boolean;
}

const RSVP_CONFIG = {
  accepted: {
    icon: Check,
    label: 'Accepted',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    badgeVariant: 'default' as const,
  },
  declined: {
    icon: X,
    label: 'Declined',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    badgeVariant: 'destructive' as const,
  },
  tentative: {
    icon: HelpCircle,
    label: 'Tentative',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    badgeVariant: 'secondary' as const,
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    badgeVariant: 'outline' as const,
  },
};

export const WalkdownAttendeesStatus: React.FC<WalkdownAttendeesStatusProps> = ({
  walkdownEventId,
  showSyncButton = true,
  compact = false,
}) => {
  const { isConnected } = useMicrosoftOAuth();
  const { 
    attendees, 
    rsvpStats, 
    isLoadingAttendees, 
    syncRsvp, 
    isSyncingRsvp 
  } = useOutlookCalendar(walkdownEventId);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoadingAttendees) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!attendees.length) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No attendees yet</p>
      </div>
    );
  }

  if (compact) {
    // Compact view: just show stats
    return (
      <div className="flex items-center gap-2 text-sm">
        {rsvpStats && (
          <>
            {rsvpStats.accepted > 0 && (
              <Badge variant="default" className="bg-green-600 gap-1">
                <Check className="w-3 h-3" />
                {rsvpStats.accepted}
              </Badge>
            )}
            {rsvpStats.declined > 0 && (
              <Badge variant="destructive" className="gap-1">
                <X className="w-3 h-3" />
                {rsvpStats.declined}
              </Badge>
            )}
            {rsvpStats.tentative > 0 && (
              <Badge variant="secondary" className="gap-1">
                <HelpCircle className="w-3 h-3" />
                {rsvpStats.tentative}
              </Badge>
            )}
            {rsvpStats.pending > 0 && (
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {rsvpStats.pending}
              </Badge>
            )}
          </>
        )}
        {showSyncButton && isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncRsvp(walkdownEventId)}
            disabled={isSyncingRsvp}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("w-3 h-3", isSyncingRsvp && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="space-y-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Attendee Responses ({attendees.length})
        </h4>
        {showSyncButton && isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncRsvp(walkdownEventId)}
            disabled={isSyncingRsvp}
            className="h-7 gap-1"
          >
            <RefreshCw className={cn("w-3 h-3", isSyncingRsvp && "animate-spin")} />
            Sync
          </Button>
        )}
      </div>

      {/* Stats summary */}
      {rsvpStats && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(RSVP_CONFIG).map(([status, config]) => {
            const count = rsvpStats[status as keyof typeof rsvpStats];
            if (count === 0) return null;
            const Icon = config.icon;
            return (
              <Badge key={status} variant={config.badgeVariant} className="gap-1">
                <Icon className="w-3 h-3" />
                {count} {config.label}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Attendee list */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {attendees.map((attendee) => {
          const config = RSVP_CONFIG[attendee.rsvp_status];
          const Icon = config.icon;
          
          return (
            <div
              key={attendee.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg",
                config.bgColor
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(attendee.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{attendee.name}</p>
                  {attendee.role && (
                    <p className="text-xs text-muted-foreground">{attendee.role}</p>
                  )}
                </div>
              </div>
              <div className={cn("flex items-center gap-1", config.color)}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{config.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
