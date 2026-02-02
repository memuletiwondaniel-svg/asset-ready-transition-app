import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { useUserORPActivities } from '@/hooks/useUserORPActivities';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';

import { cn } from '@/lib/utils';

interface ORPActivitiesPanelProps {
  searchQuery?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFullHeight?: boolean;
  isRelocated?: boolean;
  isDimmed?: boolean;
  onTaskCountUpdate?: (count: number) => void;
}

export const ORPActivitiesPanel: React.FC<ORPActivitiesPanelProps> = ({ 
  searchQuery = '',
  isExpanded,
  onToggleExpand,
  isFullHeight = false,
  isRelocated = false,
  isDimmed = false,
  onTaskCountUpdate,
}) => {
  const navigate = useNavigate();
  const { activities: realActivities, stats, isLoading } = useUserORPActivities();
  const { isNewSinceLastLogin } = useUserLastLogin();

  // Use only real data from the database
  const rawActivities = realActivities || [];

  const activities = rawActivities.filter(a => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.project_name?.toLowerCase().includes(query) ||
      a.plan_name?.toLowerCase().includes(query) ||
      a.role?.toLowerCase().includes(query)
    );
  });

  const newCount = activities.filter(a => isNewSinceLastLogin(a.created_at)).length;

  // Report task count to parent
  useEffect(() => {
    onTaskCountUpdate?.(rawActivities.length);
  }, [rawActivities.length, onTaskCountUpdate]);

  // Group activities by plan to avoid duplicates
  const uniquePlans = activities.reduce((acc, activity) => {
    if (!acc.find(a => a.plan_id === activity.plan_id)) {
      acc.push(activity);
    }
    return acc;
  }, [] as typeof activities);

  // Calculate stats from actual data being displayed
  const displayStats = {
    totalPlans: uniquePlans.length,
    totalDeliverables: activities.reduce((sum, a) => sum + (a.deliverable_count || 0), 0),
    completedDeliverables: activities.reduce((sum, a) => sum + (a.completed_deliverables || 0), 0),
  };

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
      case 'ORP_PHASE_1':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'ORP_PHASE_2':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'ORP_PHASE_3':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatPhase = (phase?: string) => {
    if (!phase) return 'Unknown';
    return phase.replace('ORP_', '').replace('_', ' ');
  };

  return (
    <MyTasksPanelCard
      title="ORA Activities"
      icon={<Activity className="h-5 w-5 text-white" />}
      iconColorClass="from-purple-500 to-purple-600"
      primaryStat={displayStats.totalPlans}
      primaryLabel="active plans"
      secondaryStat={displayStats.totalDeliverables - displayStats.completedDeliverables}
      secondaryLabel="deliverables pending"
      newCount={newCount}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isFullHeight={isFullHeight}
      isRelocated={isRelocated}
      isDimmed={isDimmed}
      isLoading={isLoading}
      isEmpty={uniquePlans.length === 0}
      emptyMessage="No ORA activities assigned"
      onViewAll={() => navigate('/operation-readiness')}
    >
      {uniquePlans.map((activity, index) => {
        const isNew = isNewSinceLastLogin(activity.created_at);
        const progress = activity.deliverable_count > 0
          ? Math.round((activity.completed_deliverables / activity.deliverable_count) * 100)
          : 0;

        return (
          <div
            key={activity.id}
            className={cn(
              "p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-all cursor-pointer group/item",
              "hover:shadow-sm hover:border-primary/20",
              isNew && "border-l-2 border-l-primary",
              "animate-fade-in"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => navigate(`/operation-readiness/${activity.plan_id}`)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {activity.project_name || activity.plan_name}
                  </span>
                  {isNew && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                      NEW
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Role: {activity.role} • {activity.allocation_percentage}% allocation
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      {activity.completed_deliverables}/{activity.deliverable_count} deliverables
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px]", getPhaseColor(activity.phase))}
                >
                  {formatPhase(activity.phase)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/operation-readiness/${activity.plan_id}`);
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </MyTasksPanelCard>
  );
};
