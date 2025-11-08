import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WidgetCard } from './WidgetCard';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  UserPlus, 
  Edit,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'approval' | 'comment' | 'update' | 'created' | 'assigned' | 'status_change';
  pssrId: string;
  projectName: string;
  user: {
    name: string;
    avatar: string;
  };
  message: string;
  timestamp: Date;
  metadata?: {
    oldValue?: string;
    newValue?: string;
  };
}

interface PSSRRecentActivitiesWidgetProps {
  limit?: number;
}

export const PSSRRecentActivitiesWidget: React.FC<PSSRRecentActivitiesWidgetProps> = ({ 
  limit = 4 
}) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Mock activity data - in production, this would come from Supabase realtime
  useEffect(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'approval',
        pssrId: 'PSSR-2024-001',
        projectName: 'HM Additional Compressors',
        user: {
          name: 'Sarah Johnson',
          avatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face'
        },
        message: 'approved the safety checklist',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      },
      {
        id: '2',
        type: 'comment',
        pssrId: 'PSSR-2024-004',
        projectName: 'Majnoon New Gas Tie-in',
        user: {
          name: 'Omar Al-Basri',
          avatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face'
        },
        message: 'added a comment: "Need to review pressure test results before approval"',
        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      },
      {
        id: '3',
        type: 'status_change',
        pssrId: 'PSSR-2024-002',
        projectName: 'LPG Unit 12.1 Rehabilitation',
        user: {
          name: 'Ahmed Al-Rashid',
          avatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face'
        },
        message: 'changed status',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        metadata: {
          oldValue: 'Draft',
          newValue: 'Under Review'
        }
      },
      {
        id: '4',
        type: 'update',
        pssrId: 'PSSR-2024-001',
        projectName: 'HM Additional Compressors',
        user: {
          name: 'Mohammed Hassan',
          avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face'
        },
        message: 'updated equipment inspection results',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      },
      {
        id: '5',
        type: 'assigned',
        pssrId: 'PSSR-2024-003',
        projectName: 'UQ Jetty 2 Export Terminal',
        user: {
          name: 'Admin User',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        },
        message: 'assigned John Davis as reviewer',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
      },
      {
        id: '6',
        type: 'created',
        pssrId: 'PSSR-2024-005',
        projectName: 'New Pipeline Installation',
        user: {
          name: 'Sarah Johnson',
          avatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face'
        },
        message: 'created a new PSSR',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      }
    ];

    setActivities(mockActivities.slice(0, limit));
  }, [limit]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'update':
        return <Edit className="h-4 w-4 text-warning" />;
      case 'created':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'assigned':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'status_change':
        return <TrendingUp className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'approval':
        return 'bg-success/10 border-success/20';
      case 'comment':
        return 'bg-primary/10 border-primary/20';
      case 'update':
        return 'bg-warning/10 border-warning/20';
      case 'created':
        return 'bg-primary/10 border-primary/20';
      case 'assigned':
        return 'bg-primary/10 border-primary/20';
      case 'status_change':
        return 'bg-warning/10 border-warning/20';
      default:
        return 'bg-muted/10 border-border';
    }
  };

  return (
    <WidgetCard title="Recent Activity" className="h-full">
      <div className="space-y-1.5">
        {activities.map((activity) => (
          <div
            key={activity.id}
            onClick={() => navigate(`/pssr/${activity.pssrId}`)}
            className="p-1.5 hover:bg-accent/50 transition-colors cursor-pointer rounded-lg border border-transparent hover:border-border/50"
          >
            <div className="flex gap-1.5">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                <AvatarFallback className="text-xs">{activity.user.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-tight">
                      <span className="font-medium text-foreground">{activity.user.name}</span>
                      {' '}
                      <span className="text-muted-foreground">{activity.message}</span>
                    </p>
                  </div>
                  <div className={`p-0.5 rounded-md border ${getActivityColor(activity.type)} flex-shrink-0`}>
                    {getActivityIcon(activity.type)}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    {activity.pssrId}
                  </Badge>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {activity.projectName}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>

                {activity.metadata?.oldValue && activity.metadata?.newValue && (
                  <div className="flex items-center gap-1 text-xs">
                    <Badge variant="outline" className="bg-muted/30 h-4 px-1">
                      {activity.metadata.oldValue}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 h-4 px-1">
                      {activity.metadata.newValue}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
};
