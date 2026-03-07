import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, Clock, CheckCircle2, FileEdit, Send, AlertTriangle, ChevronRight, ChevronDown, Trash2, CalendarRange, Activity, CircleDot } from 'lucide-react';
import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans, ProjectORPActivity } from '@/hooks/useProjectORPPlans';
import { useORPPlans } from '@/hooks/useORPPlans';
import { Progress } from '@/components/ui/progress';
import { ORPGanttOverlay } from '@/components/orp/ORPGanttOverlay';
import { ORAActivityPlanWizard } from '@/components/ora/wizard/ORAActivityPlanWizard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  isReadOnly?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  DRAFT: { label: 'Draft', icon: FileEdit, className: 'bg-muted text-muted-foreground border-border' },
  PENDING_APPROVAL: { label: 'Under Review', icon: Send, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

const getActivityStatus = (activity: { end_date: string | null; status: string }) => {
  if (activity.status === 'COMPLETED') return 'completed';
  if (activity.end_date && isPast(parseISO(activity.end_date))) return 'overdue';
  if (activity.end_date && isToday(parseISO(activity.end_date))) return 'due-today';
  if (activity.status === 'IN_PROGRESS') return 'in-progress';
  return 'upcoming';
};

const ActivityRow: React.FC<{ activity: ProjectORPActivity; isCompleted?: boolean; onClick?: () => void }> = ({ activity, isCompleted, onClick }) => {
  const actStatus = getActivityStatus(activity);
  return (
    <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer" onClick={onClick}>
      {isCompleted ? (
        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
      ) : actStatus === 'overdue' ? (
        <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
      ) : actStatus === 'in-progress' ? (
        <CircleDot className="h-3 w-3 text-amber-500 shrink-0" />
      ) : (
        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
      )}
      <span className={cn(
        "truncate flex-1",
        isCompleted && "text-muted-foreground",
        actStatus === 'overdue' && !isCompleted && "text-destructive font-medium"
      )}>
        {activity.name}
      </span>
      {activity.end_date && (
        <span className={cn(
          "text-[10px] shrink-0",
          actStatus === 'overdue' && !isCompleted ? "text-destructive" : "text-muted-foreground"
        )}>
          {format(parseISO(activity.end_date), 'MMM d')}
        </span>
      )}
    </div>
  );
};

export const ORPActivityPlanWidget: React.FC<ORPActivityPlanWidgetProps> = ({ 
  projectId, 
  projectCode,
  projectName,
  dragAttributes, 
  dragListeners, 
  onHide,
  isReadOnly = false,
}) => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);
  const { data: plans = [], isLoading } = useProjectORPPlans(projectId);
  const { deletePlan, isDeletingPlan } = useORPPlans();
  
  const primaryPlan = plans[0];
  const planStatus = primaryPlan?.status || '';
  const statusConfig = STATUS_CONFIG[planStatus];

  const totalDeliverables = primaryPlan?.deliverable_count || 0;
  const completedDeliverables = primaryPlan?.completed_count || 0;
  const inProgressCount = primaryPlan?.in_progress_count || 0;
  const notStartedCount = primaryPlan?.not_started_count || 0;
  const overallProgress = primaryPlan?.overall_progress || 0;
  const upcomingActivities = primaryPlan?.upcoming_activities || [];
  const completedActivities = primaryPlan?.completed_activities || [];

  const isDraft = planStatus === 'DRAFT';

  // No plan state
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
              {!isReadOnly && (
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setWizardOpen(true); }}>
                  Create ORA Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {!isReadOnly && <ORAActivityPlanWizard open={wizardOpen} onOpenChange={setWizardOpen} projectId={projectId} />}
      </>
    );
  }

  // Draft state
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
              <p className="text-xs opacity-70 mb-4">
                {isReadOnly ? 'A draft plan is being prepared.' : 'You have an unsaved draft. Continue where you left off.'}
              </p>
              {!isReadOnly && (
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
              )}
            </div>
          </CardContent>
        </Card>
        {!isReadOnly && (
          <>
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
        )}
      </>
    );
  }

  // Active plan (PENDING_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED)
  return (
    <>
      <Card className="h-full flex flex-col transition-all duration-300 group overflow-hidden">
        <CardHeader {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing flex-shrink-0 pb-3">
          <CardTitle className="text-lg flex items-center gap-3">
            <StyledWidgetIcon Icon={Settings2} gradientFrom="from-purple-500" gradientTo="to-violet-500" glowFrom="from-purple-500/40" glowTo="to-violet-500/40" />
            <span>ORA Activities</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden pt-0">
          {/* Section 1: ORA Plan CTA with Status */}
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs h-9"
              onClick={() => setOverlayOpen(true)}
            >
              <span className="flex items-center gap-1.5 font-medium">
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
            {primaryPlan.plan_start_date && primaryPlan.plan_end_date && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1.5">
                <CalendarRange className="h-3 w-3" />
                <span>
                  {format(parseISO(primaryPlan.plan_start_date), 'MMM d, yyyy')} — {format(parseISO(primaryPlan.plan_end_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Progress Summary */}
          <div className="flex-shrink-0 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setOverlayOpen(true)}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Overall Progress</span>
              <span className="font-bold text-sm">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2 mb-2" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-green-600 font-medium">{completedDeliverables} completed</span>
              {' · '}
              <span className="text-blue-600 font-medium">{inProgressCount} in progress</span>
              {' · '}
              <span>{notStartedCount} not started</span>
            </p>
          </div>

          {/* Scrollable activity sections */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
            {/* Section 3: Ongoing / Upcoming */}
            {upcomingActivities.length > 0 && (
              <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 group/trigger hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    {upcomingOpen ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Ongoing & Upcoming
                    </span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">
                      {upcomingActivities.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {upcomingActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} onClick={() => setOverlayOpen(true)} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Section 4: Recently Completed */}
            {completedActivities.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 group/trigger hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    {completedOpen ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Recently Completed
                    </span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">
                      {completedActivities.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {completedActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} isCompleted onClick={() => setOverlayOpen(true)} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CardContent>
      </Card>

      <ORPGanttOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        planId={primaryPlan.id}
        planStatus={planStatus}
        overallProgress={overallProgress}
        completedCount={completedDeliverables}
        totalCount={totalDeliverables}
        inProgressCount={inProgressCount}
        notStartedCount={notStartedCount}
        p2aProgress={primaryPlan?.p2a_progress || 0}
        vcrCount={primaryPlan?.vcr_count || 0}
        projectCode={projectCode}
        projectName={projectName}
        isReadOnly={isReadOnly}
      />

      <ORAActivityPlanWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
      />
    </>
  );
};
