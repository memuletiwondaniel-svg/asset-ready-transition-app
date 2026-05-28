import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, Clock, CheckCircle2, FileEdit, Send, AlertTriangle, ChevronRight, ChevronDown, Trash2, CalendarRange, Activity, CircleDot, Plus, Pencil } from 'lucide-react';

import { StyledWidgetIcon } from './StyledWidgetIcon';
import { useProjectORPPlans, ProjectORPActivity } from '@/hooks/useProjectORPPlans';
import { useORPPlans } from '@/hooks/useORPPlans';
import { Progress } from '@/components/ui/progress';
import { ORPGanttOverlay } from '@/components/orp/ORPGanttOverlay';
import { ORAActivityPlanWizard } from '@/components/ora/wizard/ORAActivityPlanWizard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ORAApprovalsPanel } from '@/components/ora/ORAApprovalsPanel';
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
  const actStatus = isCompleted ? 'completed' : getActivityStatus(activity);
  const Icon =
    actStatus === 'completed' ? CheckCircle2 :
    actStatus === 'overdue' ? AlertTriangle :
    actStatus === 'in-progress' ? CircleDot :
    Clock;
  const iconColor =
    actStatus === 'completed' ? 'text-green-600' :
    actStatus === 'overdue' ? 'text-destructive' :
    actStatus === 'in-progress' ? 'text-amber-500' :
    'text-muted-foreground';
  return (
    <div
      className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
      <span className={cn("truncate flex-1 text-foreground/90", isCompleted && "text-muted-foreground")}>
        {activity.name}
      </span>
      {activity.end_date && (
        <span className="text-[10px] shrink-0 text-muted-foreground">
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
  const [highlightCode, setHighlightCode] = useState<string | undefined>(undefined);
  const [autoOpenAdd, setAutoOpenAdd] = useState(false);
  const [approversOpen, setApproversOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ongoingOpen, setOngoingOpen] = useState(true);
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
  const rawUpcoming = primaryPlan?.upcoming_activities || [];
  const completedActivities = primaryPlan?.completed_activities || [];

  // Split into Ongoing (in-progress or overdue) vs Upcoming (future / not started)
  const ongoingActivities = rawUpcoming.filter(a => {
    const s = getActivityStatus(a);
    return s === 'in-progress' || s === 'overdue' || s === 'due-today';
  });
  const upcomingActivities = rawUpcoming.filter(a => {
    const s = getActivityStatus(a);
    return s === 'upcoming';
  });

  const openActivityOverlay = (code?: string) => {
    setHighlightCode(code);
    setAutoOpenAdd(false);
    setOverlayOpen(true);
  };

  const openAddActivity = () => {
    setHighlightCode(undefined);
    setAutoOpenAdd(true);
    setOverlayOpen(true);
  };

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
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 group/cta"
                    onClick={(e) => { e.stopPropagation(); setWizardOpen(true); }}
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground group-hover/cta:text-green-600 transition-colors" />

                    <FileEdit className="h-3.5 w-3.5 text-muted-foreground group-hover/cta:text-green-600 transition-colors" />
                    Continue ORA Plan
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }}
                    aria-label="Delete draft"
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
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setOverlayOpen(true); }}
              className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer relative z-10"
            >
              <StyledWidgetIcon Icon={Settings2} gradientFrom="from-purple-500" gradientTo="to-violet-500" glowFrom="from-purple-500/40" glowTo="to-violet-500/40" />
              <span className="truncate">ORA Activities</span>
            </button>
            {!isReadOnly && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); openAddActivity(); }}
                title="Add activity"
                className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 h-5 px-2 rounded-full bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 relative z-10"
              >
                <Plus className="h-3 w-3" /> Add Activity
              </button>
            )}
            {statusConfig && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setApproversOpen(true); }}
                className="shrink-0 cursor-pointer relative z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                title="View approvers"
              >
                <Badge variant="outline" className={cn("text-[10px] h-5 px-2 hover:opacity-80 transition-opacity", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden pt-0">
          {/* Section 2: Progress Summary */}
          <div className="flex-shrink-0 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openActivityOverlay()}>
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
            {/* Ongoing */}
            {ongoingActivities.length > 0 && (
              <Collapsible open={ongoingOpen} onOpenChange={setOngoingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 group/trigger hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    {ongoingOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Ongoing</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">{ongoingActivities.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {ongoingActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} onClick={() => openActivityOverlay(activity.activity_code)} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Upcoming */}
            {upcomingActivities.length > 0 && (
              <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 group/trigger hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    {upcomingOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Upcoming</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">{upcomingActivities.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {upcomingActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} onClick={() => openActivityOverlay(activity.activity_code)} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Completed (collapsed by default) */}
            {completedActivities.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 group/trigger hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    {completedOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Completed</span>
                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">{completedActivities.length}</Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {completedActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} isCompleted onClick={() => openActivityOverlay(activity.activity_code)} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CardContent>
      </Card>

      <ORPGanttOverlay
        open={overlayOpen}
        onOpenChange={(o) => { setOverlayOpen(o); if (!o) { setHighlightCode(undefined); setAutoOpenAdd(false); } }}
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
        highlightActivityCode={highlightCode}
        autoOpenAddActivity={autoOpenAdd}
      />

      <ORAActivityPlanWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        projectId={projectId}
      />

      <Dialog open={approversOpen} onOpenChange={setApproversOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ORA Activities — Approvers</DialogTitle>
          </DialogHeader>
          <ORAApprovalsPanel planId={primaryPlan.id} />
        </DialogContent>
      </Dialog>
    </>
  );
};
