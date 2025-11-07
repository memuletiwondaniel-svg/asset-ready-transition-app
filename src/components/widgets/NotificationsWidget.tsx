import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsWidgetProps {
  settings: Record<string, any>;
}

export const NotificationsWidget: React.FC<NotificationsWidgetProps> = ({ settings }) => {
  // Mock notifications
  const notifications = [
    {
      id: 1,
      title: 'Task assigned to you',
      message: 'Review checklist item #PS-12',
      time: new Date(Date.now() - 1000 * 60 * 30),
      type: 'info',
      read: false
    },
    {
      id: 2,
      title: 'Approval required',
      message: 'PSSR awaiting your approval',
      time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      type: 'warning',
      read: false
    },
    {
      id: 3,
      title: 'Task completed',
      message: 'Safety inspection completed',
      time: new Date(Date.now() - 1000 * 60 * 60 * 4),
      type: 'success',
      read: true
    }
  ];

  const typeColors = {
    info: 'text-primary',
    warning: 'text-warning',
    success: 'text-success'
  };

  return (
    <>
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Notifications
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="ml-auto text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">Recent alerts and updates</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {notifications.map((notification, idx) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border transition-all ${
              notification.read 
                ? 'border-border/20 bg-card/30' 
                : 'border-border/40 bg-gradient-to-br from-card/50 to-card/30'
            }`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex gap-2">
              <Circle className={`w-2 h-2 mt-1.5 ${typeColors[notification.type]} fill-current`} />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(notification.time, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </>
  );
};
