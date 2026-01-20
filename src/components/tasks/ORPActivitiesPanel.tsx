import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MyTasksPanelCard } from './MyTasksPanelCard';
import { useUserORPActivities } from '@/hooks/useUserORPActivities';
import { useUserLastLogin } from '@/hooks/useUserLastLogin';
import { cn } from '@/lib/utils';

export const ORPActivitiesPanel: React.FC = () => {
  const navigate = useNavigate();
  const { activities, stats, isLoading } = useUserORPActivities();
  const { isNewSinceLastLogin } = useUserLastLogin();

  const newCount = activities.filter(a => isNewSinceLastLogin(a.created_at)).length;

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

  // Group activities by plan to avoid duplicates
  const uniquePlans = activities.reduce((acc, activity) => {
    if (!acc.find(a => a.plan_id === activity.plan_id)) {
      acc.push(activity);
    }
    return acc;
  }, [] as typeof activities);

  return (
    <MyTasksPanelCard
      title="ORA Activities"
      icon={<Activity className="h-5 w-5 text-white" />}
      iconColorClass="from-purple-500 to-purple-600"
      primaryStat={stats.totalPlans}
      primaryLabel="active plans"
      secondaryStat={stats.totalDeliverables - stats.completedDeliverables}
      secondaryLabel="deliverables pending"
      newCount={newCount}
      isLoading={isLoading}
      isEmpty={uniquePlans.length === 0}
      emptyMessage="No ORA activities assigned"
      onViewAll={() => navigate('/operation-readiness')}
    >
      {uniquePlans.slice(0, 5).map((activity) => {
        const isNew = isNewSinceLastLogin(activity.created_at);
        const progress = activity.deliverable_count > 0
          ? Math.round((activity.completed_deliverables / activity.deliverable_count) * 100)
          : 0;

        return (
          <div
            key={activity.id}
            className={cn(
              "p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-all cursor-pointer",
              isNew && "border-l-2 border-l-primary"
            )}
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
                  className="h-6 text-xs px-2"
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
