import React from 'react';
import { CheckCircle, FileText, UserPlus, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityWidgetProps {
  className?: string;
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({ className }) => {
  // Mock recent activities - in real app, fetch from API
  const activities = [
    {
      id: '1',
      type: 'approval',
      action: 'Approved PSSR-2024-001',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      id: '2',
      type: 'creation',
      action: 'Created new checklist',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      icon: FileText,
      color: 'text-blue-500'
    },
    {
      id: '3',
      type: 'user',
      action: 'Added team member',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      icon: UserPlus,
      color: 'text-purple-500'
    },
    {
      id: '4',
      type: 'settings',
      action: 'Updated project settings',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      icon: Settings,
      color: 'text-orange-500'
    },
    {
      id: '5',
      type: 'approval',
      action: 'Reviewed P2A handover',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      icon: CheckCircle,
      color: 'text-green-500'
    }
  ];

  return (
    <div className={className}>
      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-all duration-200 animate-fade-in group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`p-2 rounded-lg bg-muted/50 group-hover:scale-110 transition-transform duration-200`}>
                <Icon className={`w-4 h-4 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.action}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
