import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetCard } from './WidgetCard';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, FileEdit, UserPlus } from 'lucide-react';

interface Activity {
  id: string;
  type: 'created' | 'approved' | 'updated' | 'review' | 'team_added';
  pssrId: string;
  description: string;
  timestamp: string;
  user: string;
}

interface PSSRRecentActivitiesWidgetProps {
  activities?: Activity[];
}

export const PSSRRecentActivitiesWidget: React.FC<PSSRRecentActivitiesWidgetProps> = ({ 
  activities = [] 
}) => {
  const navigate = useNavigate();
  
  // Default mock activities if none provided
  const defaultActivities: Activity[] = [
    {
      id: '1',
      type: 'created',
      pssrId: 'PSSR-2024-001',
      description: 'Created new PSSR for HM Additional Compressors',
      timestamp: '2 hours ago',
      user: 'Ahmed Al-Rashid',
    },
    {
      id: '2',
      type: 'approved',
      pssrId: 'PSSR-2024-003',
      description: 'Approved PSSR for UQ Jetty 2 Export Terminal',
      timestamp: '5 hours ago',
      user: 'Sarah Johnson',
    },
    {
      id: '3',
      type: 'review',
      pssrId: 'PSSR-2024-004',
      description: 'Submitted for review - Majnoon New Gas Tie-in',
      timestamp: '1 day ago',
      user: 'Omar Al-Basri',
    },
    {
      id: '4',
      type: 'updated',
      pssrId: 'PSSR-2024-002',
      description: 'Updated checklist items for LPG Unit 12.1',
      timestamp: '1 day ago',
      user: 'Mohammed Hassan',
    },
    {
      id: '5',
      type: 'team_added',
      pssrId: 'PSSR-2024-001',
      description: 'Added new team member to PSSR-2024-001',
      timestamp: '2 days ago',
      user: 'Ahmed Al-Rashid',
    },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'created':
        return <FileEdit className="h-4 w-4 text-primary" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'updated':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'team_added':
        return <UserPlus className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'created':
        return 'bg-primary/10';
      case 'approved':
        return 'bg-success/10';
      case 'review':
        return 'bg-warning/10';
      case 'updated':
        return 'bg-muted/10';
      case 'team_added':
        return 'bg-primary/10';
      default:
        return 'bg-muted/10';
    }
  };

  return (
    <WidgetCard title="Recent Activities" className="h-full">
      <div className="space-y-2">
        {displayActivities.slice(0, 4).map((activity) => (
          <div
            key={activity.id}
            onClick={() => navigate(`/pssr/${activity.pssrId}`)}
            className="flex gap-2 p-2 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-all cursor-pointer"
          >
            <div className={`flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${getActivityColor(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <p className="text-xs font-medium text-foreground line-clamp-1">
                  {activity.description}
                </p>
                <Badge variant="secondary" className="text-xs flex-shrink-0 h-5 px-1.5">
                  {activity.pssrId}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="truncate">{activity.user}</span>
                <span>•</span>
                <span className="flex-shrink-0">{activity.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
};
