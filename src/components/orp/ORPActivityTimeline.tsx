import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  CheckCircle, 
  Users, 
  Paperclip, 
  UserPlus,
  Clock,
  Edit
} from 'lucide-react';
import { useORPActivityLog } from '@/hooks/useORPActivityLog';
import { formatDistanceToNow } from 'date-fns';

interface ORPActivityTimelineProps {
  planId: string;
}

export const ORPActivityTimeline: React.FC<ORPActivityTimelineProps> = ({ planId }) => {
  const { data: activities, isLoading } = useORPActivityLog(planId);

  const getActivityIcon = (entityType: string, activityType: string) => {
    switch (entityType) {
      case 'deliverable':
        return activityType === 'UPDATE' ? <Edit className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4" />;
      case 'resource':
        return <Users className="h-4 w-4" />;
      case 'attachment':
        return <Paperclip className="h-4 w-4" />;
      case 'collaborator':
        return <UserPlus className="h-4 w-4" />;
      case 'plan':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityColor = (entityType: string) => {
    switch (entityType) {
      case 'deliverable':
        return 'bg-blue-500';
      case 'approval':
        return 'bg-green-500';
      case 'resource':
        return 'bg-purple-500';
      case 'attachment':
        return 'bg-amber-500';
      case 'collaborator':
        return 'bg-cyan-500';
      case 'plan':
        return 'bg-slate-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getActivityDescription = (activity: any) => {
    const { entity_type, description, metadata } = activity;
    
    switch (entity_type) {
      case 'deliverable':
        if (description === 'updated' && metadata?.new?.status !== metadata?.old?.status) {
          const statusLabels: Record<string, string> = {
            NOT_STARTED: 'Not Started',
            IN_PROGRESS: 'In Progress',
            COMPLETED: 'Completed',
            ON_HOLD: 'On Hold'
          };
          return `moved deliverable from ${statusLabels[metadata.old.status]} to ${statusLabels[metadata.new.status]}`;
        }
        return `${description} a deliverable`;
      case 'approval':
        if (metadata?.new?.status) {
          return `${metadata.new.status.toLowerCase()} an approval`;
        }
        return `${description} an approval`;
      case 'resource':
        if (metadata?.new?.name) {
          return `${description} resource: ${metadata.new.name}`;
        }
        return `${description} a resource`;
      case 'attachment':
        if (metadata?.new?.file_name) {
          return `${description} file: ${metadata.new.file_name}`;
        }
        return `${description} an attachment`;
      case 'collaborator':
        return `${description} a collaborator`;
      case 'plan':
        if (description === 'updated' && metadata?.new?.status !== metadata?.old?.status) {
          return `changed plan status to ${metadata.new.status}`;
        }
        return `${description} the plan`;
      default:
        return description;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {activities && activities.length > 0 ? (
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-3">
                  {/* Timeline connector */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-5 top-12 h-full w-px bg-border" />
                  )}

                  {/* Activity icon */}
                  <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${getActivityColor(activity.entity_type)} text-white`}>
                    {getActivityIcon(activity.entity_type, activity.activity_type)}
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={activity.user?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {activity.user?.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {activity.user?.full_name || 'Unknown User'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {activity.entity_type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getActivityDescription(activity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground/70">
                Activity will appear here as the ORP progresses
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
