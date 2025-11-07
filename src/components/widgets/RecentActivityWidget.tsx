import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityWidgetProps {
  settings: Record<string, any>;
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({ settings }) => {
  // Mock activity data - in real app, this would come from an API
  const activities = [
    {
      id: 1,
      action: 'Completed task',
      item: 'Review safety checklist',
      time: new Date(Date.now() - 1000 * 60 * 15),
      type: 'success'
    },
    {
      id: 2,
      action: 'Created PSSR',
      item: 'Plant A - Equipment Check',
      time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      type: 'info'
    },
    {
      id: 3,
      action: 'Approved',
      item: 'P2A Plan for Project X',
      time: new Date(Date.now() - 1000 * 60 * 60 * 5),
      type: 'success'
    }
  ];

  const typeColors = {
    success: 'text-success',
    info: 'text-primary',
    warning: 'text-warning'
  };

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-xs">Your latest actions</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {activities.map((activity, idx) => (
          <div
            key={activity.id}
            className="flex gap-3 p-3 rounded-lg border border-border/40 bg-gradient-to-br from-card/50 to-card/30 animate-smooth-in"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <Circle className={`w-2 h-2 mt-1.5 ${typeColors[activity.type as keyof typeof typeColors]} fill-current`} />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">
                {activity.action} <span className="text-muted-foreground">•</span>{' '}
                <span className="text-muted-foreground">{activity.item}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(activity.time, { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </>
  );
};
