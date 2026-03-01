import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Clock, CheckCircle2, Plus, FileEdit, Send, AlertTriangle, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { useORPPlans } from '@/hooks/useORPPlans';
import { Progress } from '@/components/ui/progress';
import { ORPGanttOverlay } from '@/components/orp/ORPGanttOverlay';
import { ORAActivityPlanWizard } from '@/components/ora/wizard/ORAActivityPlanWizard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, parseISO, isPast, isToday, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface ORPActivityPlanWidgetProps {
  projectId: string;
  dragAttributes?: any;
  dragListeners?: any;
  onHide?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  DRAFT: { label: 'Draft', icon: FileEdit, className: 'bg-muted text-muted-foreground border-border' },
  PENDING_APPROVAL: { label: 'Under Review', icon: Send, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

export const ORPActivityPlanWidget: React.FC<ORPActivityPlanWidgetProps> = ({ 
  projectId, 
  dragAttributes, 
  dragListeners, 
  onHide 
}) => {
  const navigate = useNavigate();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: plans = [], isLoading } = useProjectORPPlans(projectId);
  const { deletePlan, isDeletingPlan } = useORPPlans();
  
  const primaryPlan = plans[0];
  const planStatus = primaryPlan?.status || '';
  const statusConfig = STATUS_CONFIG[planStatus];

  const allUpcomingActivities = useMemo(() => {
    return plans.flatMap(plan => plan.upcoming_activities || []);
  }, [plans]);

  const totalDeliverables = plans.reduce((sum, p) => sum + p.deliverable_count, 0);
  const completedDeliverables = plans.reduce((sum, p) => sum + p.completed_count, 0);
  const overallProgress = totalDeliverables > 0 
    ? Math.round((completedDeliverables / totalDeliverables) * 100) 
    : 0;

  const getActivityStatus = (activity: { end_date: string | null; status: string }) => {
    if (activity.status === 'COMPLETED') return 'completed';
    if (activity.end_date && isPast(parseISO(activity.end_date))) return 'overdue';
    if (activity.end_date && isToday(parseISO(activity.end_date))) return 'due-today';
    return 'upcoming';
  };

  const handleOpenOverlay = () => {
    if (primaryPlan) {
      setOverlayOpen(true);
    }
  };

  const isDraft = planStatus === 'DRAFT';

  // No plan state OR draft state → show creation/resume UI
  if (!primaryPlan || isDraft) {
    return (
      <>
        <Card className="h-full transition-all duration-300 group">
          <CardHeader 
            {...dragAttributes} 
            {...dragListeners} 
            className="cursor-grab active:cursor-grabbing"
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
              </div>
              {isDraft && (
                <Badge variant="outline" className="text-[10px] gap-1 bg-muted text-muted-foreground border-border">
                  <FileEdit className="h-3 w-3" />
                  Draft
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm font-medium mb-1">{isDraft ? 'Draft in Progress' : 'No ORA Plan'}</p>
              <p className="text-xs opacity-70 mb-4">
                {isDraft ? 'You have an unsaved draft. Continue where you left off.' : 'Operation Readiness activities will appear here'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWizardOpen(true);
                  }}
                >
                  {isDraft ? 'Continue Setup' : 'Create ORA Plan'}
                </Button>
                {isDraft && primaryPlan && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <ORAActivityPlanWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          projectId={projectId}
        />
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Draft ORA Plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the draft plan including all deliverables, resources, and approvals. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeletingPlan}
                onClick={() => {
                  if (primaryPlan) {
                    deletePlan(primaryPlan.id);
                    setDeleteDialogOpen(false);
                  }
                }}
              >
                {isDeletingPlan ? 'Deleting...' : 'Delete Plan'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  const isApproved = planStatus === 'APPROVED' || planStatus === 'COMPLETED' || planStatus === 'IN_PROGRESS';

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
            </div>
            {statusConfig && (
              <Badge variant="outline" className={cn("text-[10px] gap-1", statusConfig.className)}>
                <statusConfig.icon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                {completedDeliverables}/{totalDeliverables} activities
              </span>
              <span className="font-semibold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-1.5" />
          </div>

          {/* Activity list for approved plans */}
          {isApproved && allUpcomingActivities.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {allUpcomingActivities.slice(0, 4).map((activity) => {
                const actStatus = getActivityStatus(activity);
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-2 text-xs p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    {actStatus === 'overdue' ? (
                      <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                    ) : actStatus === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn(
                      "truncate flex-1",
                      actStatus === 'overdue' && "text-destructive font-medium",
                      actStatus === 'completed' && "text-muted-foreground line-through"
                    )}>
                      {activity.name}
                    </span>
                    {activity.end_date && (
                      <span className={cn(
                        "text-[10px] shrink-0",
                        actStatus === 'overdue' ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {format(parseISO(activity.end_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                );
              })}
              {allUpcomingActivities.length > 4 && (
                <p className="text-[10px] text-muted-foreground text-center pt-0.5">
                  +{allUpcomingActivities.length - 4} more
                </p>
              )}
            </div>
          )}

          {/* CTA for non-approved plans */}
          {!isApproved && (
            <div className="flex items-center justify-center pt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                Click to view plan details <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gantt Chart Overlay */}
      <ORPGanttOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        planId={primaryPlan.id}
        overallProgress={overallProgress}
        completedCount={completedDeliverables}
        totalCount={totalDeliverables}
      />

      <ORAActivityPlanWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
      />
    </>
  );
};
