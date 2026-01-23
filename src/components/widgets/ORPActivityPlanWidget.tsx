import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ChevronDown, ChevronUp, EyeOff, Loader2, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { useORPPlanDetails } from '@/hooks/useORPPlans';
import { Progress } from '@/components/ui/progress';
import { ORPGanttChart } from '@/components/orp/ORPGanttChart';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface ORPActivityPlanWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  'NOT_STARTED': 'bg-muted text-muted-foreground',
  'IN_PROGRESS': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'COMPLETED': 'bg-green-500/10 text-green-600 border-green-500/20',
  'BLOCKED': 'bg-red-500/10 text-red-600 border-red-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  'NOT_STARTED': 'Not Started',
  'IN_PROGRESS': 'In Progress',
  'COMPLETED': 'Completed',
  'BLOCKED': 'Blocked',
};

export const ORPActivityPlanWidget: React.FC<ORPActivityPlanWidgetProps> = ({ projectId, dragAttributes, dragListeners, onHide }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: plans = [], isLoading } = useProjectORPPlans(projectId);
  
  // Get the primary plan (most recent active one)
  const primaryPlan = plans[0];
  
  // Fetch full plan details when expanded (for Gantt chart)
  const { data: planDetails, isLoading: detailsLoading } = useORPPlanDetails(isExpanded ? primaryPlan?.id : '');

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

  const handleToggleExpand = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <Card className={cn(
      "transition-all duration-300 group",
      isExpanded ? "col-span-full" : "h-full hover:shadow-lg hover:scale-[1.02] hover:border-purple-500/20"
    )}>
      <CardHeader 
        {...dragAttributes} 
        {...dragListeners} 
        className={cn(
          "cursor-grab active:cursor-grabbing",
          isExpanded && "pb-2"
        )}
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
            <span>ORA Activity Plan</span>
            {totalDeliverables > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {completedDeliverables}/{totalDeliverables}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {plans.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                className="h-7 w-7"
                title={isExpanded ? "Collapse" : "Expand Gantt Chart"}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
            {onHide && !isExpanded && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onHide();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                title="Hide widget"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
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
          <div className="text-center py-8 text-muted-foreground">
            <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="mb-3">No activity plans yet</p>
            <Button size="sm" onClick={() => navigate('/operation-readiness')}>
              Create First Plan
            </Button>
          </div>
        ) : isExpanded ? (
          /* Expanded View - Gantt Chart */
          <div className="space-y-4">
            {/* Summary Progress Bar */}
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate(`/operation-readiness/${primaryPlan.id}`)}
                className="shrink-0"
              >
                Open Full View <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
            
            {/* Gantt Chart */}
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading Gantt chart...</span>
              </div>
            ) : planDetails?.deliverables ? (
              <div className="border rounded-lg overflow-hidden">
                <ORPGanttChart 
                  planId={primaryPlan.id} 
                  deliverables={planDetails.deliverables} 
                  hideToolbar 
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No deliverables to display
              </div>
            )}
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
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Upcoming Activities
                </div>
                {allUpcomingActivities.slice(0, 4).map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={handleToggleExpand}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      activity.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-muted-foreground/40'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {activity.name}
                      </div>
                      {activity.start_date && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(activity.start_date), 'MMM d')}
                          {activity.end_date && ` - ${format(parseISO(activity.end_date), 'MMM d')}`}
                        </div>
                      )}
                    </div>
                    {activity.completion_percentage > 0 && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {activity.completion_percentage}%
                      </Badge>
                    )}
                  </div>
                ))}
                {allUpcomingActivities.length > 4 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-muted-foreground"
                    onClick={handleToggleExpand}
                  >
                    +{allUpcomingActivities.length - 4} more activities
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">All activities completed</span>
              </div>
            )}
            
            {/* View Details Link */}
            <Button 
              size="sm" 
              variant="link" 
              className="p-0 h-auto" 
              onClick={() => navigate(`/operation-readiness/${primaryPlan.id}`)}
            >
              View Full Plan <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
