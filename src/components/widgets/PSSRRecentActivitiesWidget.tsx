import React from 'react';
import { WidgetCard } from './WidgetCard';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, FileText, CheckCircle, MessageSquare, Upload, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWidgetSize } from '@/contexts/WidgetSizeContext';

interface Activity {
  id: string;
  type: 'comment' | 'approval' | 'update' | 'upload' | 'assignment';
  user: {
    name: string;
    avatar?: string;
  };
  description: string;
  timestamp: string;
  category?: string;
}

interface PSSRRecentActivitiesWidgetProps {
  activities: Activity[];
  maxItems?: number;
  dragAttributes?: any;
  dragListeners?: any;
}

export const PSSRRecentActivitiesWidget: React.FC<PSSRRecentActivitiesWidgetProps> = ({
  activities,
  maxItems = 10,
  dragAttributes,
  dragListeners,
}) => {
  const { widgetSize } = useWidgetSize();
  const widgetId = 'pssr-recent-activities';
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'update':
        return <FileText className="h-4 w-4 text-orange-600" />;
      case 'upload':
        return <Upload className="h-4 w-4 text-purple-600" />;
      case 'assignment':
        return <UserPlus className="h-4 w-4 text-cyan-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'comment':
        return 'bg-blue-100 border-blue-200';
      case 'approval':
        return 'bg-green-100 border-green-200';
      case 'update':
        return 'bg-orange-100 border-orange-200';
      case 'upload':
        return 'bg-purple-100 border-purple-200';
      case 'assignment':
        return 'bg-cyan-100 border-cyan-200';
      default:
        return 'bg-muted border-border';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <WidgetCard 
      title="Recent Activities"
      className={`min-h-[280px] md:min-h-[300px] lg:min-h-[320px] ${
        widgetSize === 'compact' ? 'h-[280px] md:h-[300px] lg:h-[320px]' :
        widgetSize === 'standard' ? 'h-[350px] md:h-[380px] lg:h-[400px]' :
        'h-[450px] md:h-[500px] lg:h-[520px]'
      }`}
      widgetId={widgetId}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-3">
        {displayedActivities.map((activity) => (
          <div
            key={activity.id}
            className="group flex gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-accent/5 transition-all animate-fade-in"
          >
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full border',
              getActivityColor(activity.type)
            )}>
              {getActivityIcon(activity.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback className="text-xs">
                      {activity.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground truncate">
                    {activity.user.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(activity.timestamp)}
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {activity.description}
              </p>

              {activity.category && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {activity.category}
                </Badge>
              )}
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activities</p>
          </div>
        )}
      </div>
    </WidgetCard>
  );
};
