import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  UserPlus, 
  Edit,
  AlertCircle,
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

interface PSSRActivityFeedProps {
  maxHeight?: string;
  limit?: number;
}

const PSSRActivityFeed: React.FC<PSSRActivityFeedProps> = ({ 
  maxHeight = '600px',
  limit = 50 
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Mock activity data - in production, this would come from Supabase realtime
  useEffect(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'approval',
        pssrId: 'PSSR-DP300-001',
        projectName: 'HM Additional Compressors',
        user: {
          name: 'Safety Lead',
          avatar: ''
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
          name: 'PSSR Reviewer',
          avatar: ''
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
        pssrId: 'PSSR-DP300-001',
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
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'update':
        return <Edit className="h-4 w-4 text-amber-600" />;
      case 'created':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'assigned':
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      case 'status_change':
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'approval':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'comment':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'update':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'created':
        return 'bg-primary/10 border-primary/20';
      case 'assigned':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'status_change':
        return 'bg-orange-500/10 border-orange-500/20';
      default:
        return 'bg-muted/10 border-border';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="space-y-0">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  index !== activities.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <div className="flex gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-foreground">{activity.user.name}</span>
                          {' '}
                          <span className="text-muted-foreground">{activity.message}</span>
                        </p>
                      </div>
                      <div className={`p-1.5 rounded-md border ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {activity.pssrId}
                      </Badge>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {activity.projectName}
                      </span>
                    </div>

                    {activity.metadata?.oldValue && activity.metadata?.newValue && (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="bg-muted/30">
                          {activity.metadata.oldValue}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {activity.metadata.newValue}
                        </Badge>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PSSRActivityFeed;
