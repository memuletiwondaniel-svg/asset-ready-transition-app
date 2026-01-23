import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ChevronDown, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { Progress } from '@/components/ui/progress';
import { ORPGanttOverlay } from '@/components/orp/ORPGanttOverlay';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ORPActivityPlanWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

export const ORPActivityPlanWidget: React.FC<ORPActivityPlanWidgetProps> = ({ 
  projectId, 
  dragAttributes, 
  dragListeners, 
  onHide 
}) => {
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const { data: plans = [], isLoading } = useProjectORPPlans(projectId);
  
  // Get the primary plan (most recent active one)
  const primaryPlan = plans[0];

  // Combine all upcoming activities from all plans
  const allUpcomingActivities = useMemo(() => {
    return plans.flatMap(plan => plan.upcoming_activities || []);
  }, [plans]);

  // Calculate overall stats
  const totalDeliverables = plans.reduce((sum, p) => sum + p.deliverable_count, 0);
  const completedDeliverables = plans.reduce((sum, p) => sum + p.completed_count, 0);
  const overallProgress = totalDeliverables > 0 
    ? Math.round((completedDeliverables / totalDeliverables) * 100) 
    : 0;

  const handleOpenOverlay = () => {
    if (primaryPlan) {
      setOverlayOpen(true);
    }
  };

  return (
    <>
      <Card 
        className={cn(
          "h-full transition-all duration-300 group cursor-pointer",
          "hover:shadow-lg hover:scale-[1.02] hover:border-purple-500/20"
        )}
        onClick={handleOpenOverlay}
      >
        <CardHeader 
          {...dragAttributes} 
          {...dragListeners} 
          className="cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StyledWidgetIcon 
                Icon={CalendarCheck}
                gradientFrom="from-purple-500"
                gradientTo="to-violet-500"
                glowFrom="from-purple-500/40"
                glowTo="to-violet-500/40"
              />
              <span>ORA Plan</span>
              {totalDeliverables > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {completedDeliverables}/{totalDeliverables}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div 
              className="text-center py-8 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-3">No activity plans yet</p>
              <Button size="sm" onClick={() => navigate('/operation-readiness')}>
                Create First Plan
              </Button>
            </div>
          ) : (
            /* Collapsed View - Upcoming Activities Summary */
            <div className="space-y-3">
              {/* Overall Progress */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
                <div className="text-xs text-muted-foreground mt-1">
                  {completedDeliverables} of {totalDeliverables} activities completed
                </div>
              </div>
              
              {/* Upcoming Activities List */}
              {allUpcomingActivities.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Upcoming Activities
                  </div>
                  {allUpcomingActivities.slice(0, 4).map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-center gap-2 py-1.5 px-2 rounded-md border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        activity.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-muted-foreground/40'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {activity.name}
                        </div>
                        {activity.start_date && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {format(parseISO(activity.start_date), 'MMM d')}
                            {activity.end_date && ` - ${format(parseISO(activity.end_date), 'MMM d')}`}
                          </div>
                        )}
                      </div>
                      {activity.completion_percentage > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {activity.completion_percentage}%
                        </Badge>
                      )}
                    </div>
                  ))}
                  {allUpcomingActivities.length > 4 && (
                    <div className="w-full text-center text-xs text-muted-foreground py-1 hover:text-foreground transition-colors">
                      +{allUpcomingActivities.length - 4} more activities
                      <ChevronDown className="h-2.5 w-2.5 ml-0.5 inline" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs">All activities completed</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gantt Chart Overlay */}
      {primaryPlan && (
        <ORPGanttOverlay
          open={overlayOpen}
          onOpenChange={setOverlayOpen}
          planId={primaryPlan.id}
          overallProgress={overallProgress}
          completedCount={completedDeliverables}
          totalCount={totalDeliverables}
        />
      )}
    </>
  );
};
