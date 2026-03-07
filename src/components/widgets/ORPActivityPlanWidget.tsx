import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, Clock, CheckCircle2, FileEdit, Send, AlertTriangle, ChevronRight, Trash2, CalendarRange } from 'lucide-react';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans } from '@/hooks/useProjectORPPlans';
import { useORPPlans } from '@/hooks/useORPPlans';
import { Progress } from '@/components/ui/progress';
import { ORPGanttOverlay } from '@/components/orp/ORPGanttOverlay';
import { ORAActivityPlanWizard } from '@/components/ora/wizard/ORAActivityPlanWizard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface ORPActivityPlanWidgetProps {
  projectId: string;
  projectCode?: string;
  projectName?: string;
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
  projectCode,
  projectName,
  dragAttributes, 
  dragListeners, 
  onHide 
}) => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: plans = [], isLoading } = useProjectORPPlans(projectId);
  const { deletePlan, isDeletingPlan } = useORPPlans();
  
  const primaryPlan = plans[0];
  const planStatus = primaryPlan?.status || '';
  const statusConfig = STATUS_CONFIG[planStatus];

  const totalDeliverables = primaryPlan?.deliverable_count || 0;
  const completedDeliverables = primaryPlan?.completed_count || 0;
  const overallProgress = primaryPlan?.overall_progress || 0;
  const upcomingActivities = primaryPlan?.upcoming_activities || [];

  const getActivityStatus = (activity: { end_date: string | null; status: string }) => {
    if (activity.status === 'COMPLETED') return 'completed';
    if (activity.end_date && isPast(parseISO(activity.end_date))) return 'overdue';
    if (activity.end_date && isToday(parseISO(activity.end_date))) return 'due-today';
    return 'upcoming';
  };

  const isDraft = planStatus === 'DRAFT';

  // No plan state → show creation UI
  if (!primaryPlan) {
    return (
      <>
        <Card className="h-full transition-all duration-300 group">
          <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing">
            <CardTitle className="text-lg flex items-center gap-3">
              <StyledWidgetIcon Icon={Settings2} gradientFrom="from-purple-500" gradientTo="to-violet-500" glowFrom="from-purple-500/40" glowTo="to-violet-500/40" />
              <span>ORA Activities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm font-medium mb-1">No ORA Plan</p>
              <p className="text-xs opacity-70 mb-4">Operation Readiness activities will appear here</p>
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setWizardOpen(true); }}>
                Create ORA Plan
              </Button>
            </div>
          </CardContent>
        </Card>
        <ORAActivityPlanWizard open={wizardOpen} onOpenChange={setWizardOpen} projectId={projectId} />
      </>
    );
  }

  // Draft state → show resume UI
  if (isDraft) {
    return (
      <>
        <Card className="h-full transition-all duration-300 group">
          <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing">
            <CardTitle className="text-lg flex items-center gap-3">
              <StyledWidgetIcon Icon={Settings2} gradientFrom="from-purple-500" gradientTo="to-violet-500" glowFrom="from-purple-500/40" glowTo="to-violet-500/40" />
              <span>ORA Activities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm font-medium mb-1">Draft in Progress</p>
              <p className="text-xs opacity-70 mb-4">You have an unsaved draft. Continue where you left off.</p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setWizardOpen(true); }}>
                  Continue Setup
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <ORAActivityPlanWizard open={wizardOpen} onOpenChange={setWizardOpen} projectId={projectId} />
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
                onClick={() => { deletePlan(primaryPlan.id); setDeleteDialogOpen(false); }}
              >
                {isDeletingPlan ? 'Deleting...' : 'Delete Plan'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Active plan (PENDING_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED)
  return (
    <>
      <Card className="h-full transition-all duration-300 group">
        <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing">
          <CardTitle className="text-lg flex items-center gap-3">
            <StyledWidgetIcon Icon={Settings2} gradientFrom="from-purple-500" gradientTo="to-violet-500" glowFrom="from-purple-500/40" glowTo="to-violet-500/40" />
            <span>ORA Activities</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* ORA Plan CTA with inline status badge */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs h-8"
            onClick={() => setOverlayOpen(true)}
          >
            <span className="flex items-center gap-1.5">
              ORA Plan
            </span>
            <span className="flex items-center gap-1.5">
              {statusConfig && (
                <Badge variant="outline" className={cn("text-[9px] gap-0.5 h-5 px-1.5", statusConfig.className)}>
                  <statusConfig.icon className="h-2.5 w-2.5" />
                  {statusConfig.label}
                </Badge>
              )}
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </span>
          </Button>

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

          {/* Key dates */}
          {primaryPlan.plan_start_date && primaryPlan.plan_end_date && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <CalendarRange className="h-3 w-3" />
              <span>
                {format(parseISO(primaryPlan.plan_start_date), 'MMM d, yyyy')} — {format(parseISO(primaryPlan.plan_end_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {/* Activity list */}
          {upcomingActivities.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {upcomingActivities.slice(0, 6).map((activity) => {
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
              {upcomingActivities.length > 6 && (
                <button
                  onClick={() => setOverlayOpen(true)}
                  className="text-[10px] text-muted-foreground text-center w-full pt-0.5 hover:text-foreground transition-colors"
                >
                  +{upcomingActivities.length - 6} more
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gantt Chart Overlay with status badge + approvals side panel */}
      <ORPGanttOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        planId={primaryPlan.id}
        planStatus={planStatus}
        overallProgress={overallProgress}
        completedCount={completedDeliverables}
        totalCount={totalDeliverables}
        inProgressCount={primaryPlan?.in_progress_count || 0}
        notStartedCount={primaryPlan?.not_started_count || 0}
        p2aProgress={primaryPlan?.p2a_progress || 0}
        vcrCount={primaryPlan?.vcr_count || 0}
      />

      <ORAActivityPlanWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
      />
    </>
  );
};
