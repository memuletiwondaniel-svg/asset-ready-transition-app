import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, X, Calendar, AlertTriangle, ChevronRight, Pencil, CalendarCheck, ClipboardList, FileText, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import CreatePSSRWizard from '@/components/pssr/CreatePSSRWizard';
import { ORAActivityPlanWizard } from '@/components/ora/wizard/ORAActivityPlanWizard';
import { ORPGanttOverlay } from '@/components/orp/ORPGanttOverlay';
import { P2APlanCreationWizard } from '@/components/widgets/p2a-wizard/P2APlanCreationWizard';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';

import { ORAActivityTaskSheet } from './ORAActivityTaskSheet';
import { VCRExecutionPlanWizard } from '@/components/widgets/vcr-wizard/VCRExecutionPlanWizard';
import type { UserTask } from '@/hooks/useUserTasks';
import type { ProjectVCR } from '@/hooks/useProjectVCRs';

interface TaskDetailSheetProps {
  task: UserTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (taskId: string, comment: string) => void;
  onReject: (taskId: string, comment: string) => void;
}

export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  open,
  onOpenChange,
  onApprove,
  onReject,
}) => {
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [oraWizardOpen, setOraWizardOpen] = useState(false);
  const [oraGanttOpen, setOraGanttOpen] = useState(false);
  const [oraActivityOpen, setOraActivityOpen] = useState(false);
  const [vcrWizardOpen, setVcrWizardOpen] = useState(false);
  const [oraReviewWizardOpen, setOraReviewWizardOpen] = useState(false);
  const [p2aWizardOpen, setP2aWizardOpen] = useState(false);

  const oraProjectId = task?.metadata?.project_id as string | undefined;
  const isOraTask = task ? (task.type === 'ora_plan_creation' || (task.metadata?.action === 'create_ora_plan' && task.metadata?.source === 'ora_workflow')) : false;
  const isP2aTask = task?.metadata?.action === 'create_p2a_plan';
  const p2aProjectId = task?.metadata?.project_id as string | undefined;

  // Check if an ORA plan exists for this project (draft or approved)
  const { data: existingOraPlan } = useQuery({
    queryKey: ['ora-plan-exists', oraProjectId],
    queryFn: async () => {
      if (!oraProjectId) return null;
      const { data } = await (supabase as any)
        .from('orp_plans')
        .select('id, status')
        .eq('project_id', oraProjectId)
        .order('created_at', { ascending: false })
        .limit(1);
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!oraProjectId && isOraTask,
    staleTime: 30_000,
  });

  const hasExistingOraDraft = existingOraPlan?.status === 'DRAFT';
  const resolvedOraPlanId = (task?.metadata?.plan_id as string) || existingOraPlan?.id;

  // Fetch project info for P2A wizard
  const { data: p2aProjectInfo } = useQuery({
    queryKey: ['p2a-project-info', p2aProjectId],
    queryFn: async () => {
      if (!p2aProjectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('project_id_prefix, project_id_number, project_title')
        .eq('id', p2aProjectId)
        .single();
      return data;
    },
    enabled: !!p2aProjectId && isP2aTask,
    staleTime: 60_000,
  });

  // Check if P2A plan draft exists
  const { data: hasExistingP2aDraft } = useQuery({
    queryKey: ['p2a-plan-exists-task', p2aProjectId],
    queryFn: async () => {
      if (!p2aProjectId) return false;
      const { data } = await (supabase as any)
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_id', p2aProjectId)
        .limit(1);
      return data && data.length > 0;
    },
    enabled: !!p2aProjectId && isP2aTask,
    staleTime: 30_000,
  });

  const handleAction = (type: 'approve' | 'reject') => {
    if (!task) return;
    if (type === 'approve') {
      onApprove(task.id, comment);
    } else {
      onReject(task.id, comment);
    }
    setComment('');
    setAction(null);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setComment('');
      setAction(null);
    }
    onOpenChange(isOpen);
  };

  if (!task) return null;

  const planStatus = (task.metadata?.plan_status as string || '').toUpperCase();
  const isCompleted = task.status === 'completed' || ['APPROVED', 'COMPLETED'].includes(planStatus);

  const daysPending = isCompleted ? 0 : Math.floor(
    (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );


  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">{priority} Priority</Badge>;
      case 'Medium':
        return <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">{priority} Priority</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{priority} Priority</Badge>;
    }
  };

  const pssrId = task.metadata?.pssr_id as string | undefined;
  const isOraReviewTask = task.type === 'ora_plan_review';
  const isOraActivityTask = task.type === 'ora_activity' || task.metadata?.action === 'complete_ora_activity';
  const isVcrDeliveryPlanTask = (task.type === 'vcr_delivery_plan' || task.metadata?.action === 'create_vcr_delivery_plan');
  const oraPlanId = task.metadata?.plan_id as string | undefined;
  const p2aProjectCode = task.metadata?.project_code as string | undefined;

  const p2aCtaLabel = hasExistingP2aDraft ? 'Continue P2A Plan' : 'Create P2A Plan';
  const resolvedP2aProjectCode = p2aProjectCode || (p2aProjectInfo ? `${p2aProjectInfo.project_id_prefix || ''}-${p2aProjectInfo.project_id_number || ''}` : '');
  const resolvedP2aProjectName = p2aProjectInfo?.project_title || '';

  const isReviewTask = (['review', 'approval', 'ora_plan_review'].includes(task.type) || !!pssrId) && !isOraReviewTask;
  const isActionTask = isOraTask || isOraActivityTask || isVcrDeliveryPlanTask || isP2aTask;

  const oraCtaLabel = isCompleted ? 'View ORA Plan' : hasExistingOraDraft ? 'Continue Creating ORA Plan' : 'Create ORA Plan';
  const oraIntentMessage = isCompleted
    ? 'The ORA Activity Plan has been approved. Click below to view the finalized plan.'
    : hasExistingOraDraft
      ? 'You have a saved draft for this ORA Activity Plan. Click below to continue where you left off.'
      : 'You have been assigned to create the ORA Activity Plan for this project. Click below to launch the planning wizard.';

  const getIntentMessage = () => {
    if (isP2aTask) return 'The ORA Plan has been approved. Create the Project to Asset (P2A) handover plan for this project.';
    if (isOraTask) return oraIntentMessage;
    if (isVcrDeliveryPlanTask) return 'You need to set up the VCR Delivery Plan for this item. Click below to configure the execution plan.';
    if (isOraActivityTask) return 'You have an ORA activity to complete. Click below to open the activity details and update progress.';
    if (isOraReviewTask) return 'You have been asked to review and approve an ORA Plan. Use the button below to review, then approve or request changes.';
    if (pssrId) return 'You have been asked to review and approve a PSSR. Use the button below to review, then approve or reject.';
    if (isReviewTask) return 'This task requires your review and decision.';
    return null;
  };

  const intentMessage = getIntentMessage();

  const projectCode = task.metadata?.project_code as string | undefined;

  const getTypeBadge = () => {
    if (isOraTask && projectCode) return <ProjectIdBadge size="sm">{projectCode}</ProjectIdBadge>;
    if (isP2aTask && projectCode) return <ProjectIdBadge size="sm">{projectCode}</ProjectIdBadge>;
    if (isP2aTask) return <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">P2A Plan</Badge>;
    if (isOraTask) return <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-600">ORA Plan</Badge>;
    if (isOraReviewTask) return <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">ORA Review</Badge>;
    if (isOraActivityTask) return <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">ORA Activity</Badge>;
    if (isVcrDeliveryPlanTask) return <Badge variant="secondary" className="text-xs bg-teal-500/10 text-teal-600">VCR Delivery Plan</Badge>;
    switch (task.type) {
      case 'review':
        return <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">Review</Badge>;
      case 'approval':
        return <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">Approval</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{task.type}</Badge>;
    }
  };

  // Build VCR object for the wizard when needed
  const vcrForWizard: ProjectVCR | null = isVcrDeliveryPlanTask && task.metadata ? {
    id: task.metadata.vcr_id,
    vcr_code: task.metadata.vcr_code || '',
    name: task.metadata.vcr_name || '',
    description: null,
    status: 'IN_PROGRESS',
    target_date: null,
    created_at: '',
    progress: 0,
    systems_count: 0,
    has_hydrocarbon: false,
  } : null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {getTypeBadge()}
              {getPriorityBadge(task.priority)}
            </div>
             <SheetTitle className="text-left text-base sm:text-lg leading-snug mt-2 break-words">
              {task.title}
            </SheetTitle>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            )}
          </SheetHeader>

          <div className="space-y-5">
            {/* Meta info */}
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                </div>
                {isCompleted ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Completed {format(new Date(task.metadata?.completed_at || task.created_at), 'MMM d, yyyy')}</span>
                  </div>
                ) : daysPending > 0 ? (
                  <div className={cn(
                    "flex items-center gap-1.5",
                    daysPending >= 7 ? "text-destructive" : daysPending >= 3 ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {daysPending >= 7 && <AlertTriangle className="h-3.5 w-3.5" />}
                    <span>{daysPending} day{daysPending !== 1 ? 's' : ''} pending</span>
                  </div>
                ) : null}
              </div>

              {task.due_date && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Intent message */}
            {intentMessage && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-muted-foreground leading-relaxed">{intentMessage}</p>
              </div>
            )}

            {/* Review & Edit CTA - opens the wizard in lead-review mode */}
            {pssrId && (
              <Button
                className="w-full gap-2 bg-muted hover:bg-muted/80 text-foreground font-medium border border-border"
                onClick={() => setWizardOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Review & Edit PSSR
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            )}

            {/* ORA Plan Creation CTA - prominent for action tasks */}
            {isOraTask && oraProjectId && (
              <Button
                className={cn(
                  "w-full gap-2 font-medium",
                  isCompleted
                    ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
                onClick={() => {
                  if (isCompleted && resolvedOraPlanId) {
                    onOpenChange(false);
                    setOraGanttOpen(true);
                  } else {
                    setOraWizardOpen(true);
                  }
                }}
              >
                {isCompleted ? <Eye className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                {oraCtaLabel}
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            )}

            {/* ORA Plan Review CTA - opens wizard in review mode */}
            {isOraReviewTask && oraPlanId && (
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={() => {
                  onOpenChange(false);
                  setOraReviewWizardOpen(true);
                }}
              >
                <CalendarCheck className="h-4 w-4" />
                Review ORA Plan
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            )}

            {/* ORA Activity Task CTA - prominent for action tasks */}
            {isOraActivityTask && (
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={() => {
                  onOpenChange(false);
                  setOraActivityOpen(true);
                }}
              >
                <CalendarCheck className="h-4 w-4" />
                Open Activity Details
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            )}

            {/* P2A Plan Creation CTA */}
            {isP2aTask && p2aProjectId && (
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={() => {
                  onOpenChange(false);
                  setP2aWizardOpen(true);
                }}
              >
                <FileText className="h-4 w-4" />
                {p2aCtaLabel}
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            )}

            {isVcrDeliveryPlanTask && vcrForWizard && (
              <Button
                className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                onClick={() => setVcrWizardOpen(true)}
              >
                <ClipboardList className="h-4 w-4" />
                Setup VCR Delivery Plan
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            )}

            {/* Comment & Approve/Reject - only for review tasks */}
            {isReviewTask && (
              <>
                <Separator />

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Comments <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="Add any comments or notes about your decision..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <Separator />

                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-foreground">Decision</p>
                  <div className="flex items-center gap-3">
                    <Button
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAction('approve')}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      onClick={() => handleAction('reject')}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* CreatePSSRWizard - Lead Review Mode with Step 5 Final Review */}
      {pssrId && (
        <CreatePSSRWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          draftPssrId={pssrId}
          mode="lead-review"
          onSuccess={() => {
            setWizardOpen(false);
            onOpenChange(false);
          }}
        />
      )}

      {/* ORA Plan Wizard */}
      {isOraTask && oraProjectId && (
        <ORAActivityPlanWizard
          open={oraWizardOpen}
          onOpenChange={setOraWizardOpen}
          projectId={oraProjectId}
          onSuccess={() => {
            setOraWizardOpen(false);
            onOpenChange(false);
          }}
        />
      )}

      {/* ORA Gantt Overlay for completed/approved plans */}
      {isOraTask && isCompleted && oraPlanId && (
        <ORPGanttOverlay
          open={oraGanttOpen}
          onOpenChange={setOraGanttOpen}
          planId={oraPlanId}
          planStatus={planStatus || 'APPROVED'}
          overallProgress={0}
          completedCount={0}
          totalCount={0}
          projectCode={projectCode}
          isReadOnly
        />
      )}

      {/* ORA Plan Review Wizard */}
      {isOraReviewTask && oraPlanId && oraProjectId && (
        <ORAActivityPlanWizard
          open={oraReviewWizardOpen}
          onOpenChange={setOraReviewWizardOpen}
          projectId={oraProjectId}
          planId={oraPlanId}
          mode="review"
          onSuccess={() => {
            setOraReviewWizardOpen(false);
            onOpenChange(false);
          }}
        />
      )}

      {/* ORA Activity Task Sheet */}
      {isOraActivityTask && (
        <ORAActivityTaskSheet
          task={task}
          open={oraActivityOpen}
          onOpenChange={setOraActivityOpen}
        />
      )}

      {/* VCR Execution Plan Wizard */}
      {isVcrDeliveryPlanTask && vcrForWizard && (
        <VCRExecutionPlanWizard
          open={vcrWizardOpen}
          onOpenChange={setVcrWizardOpen}
          vcr={vcrForWizard}
          projectCode={task.metadata?.project_code}
        />
      )}

      {/* P2A Plan Creation Wizard */}
      {isP2aTask && p2aProjectId && (
        <P2APlanCreationWizard
          open={p2aWizardOpen}
          onOpenChange={setP2aWizardOpen}
          projectId={p2aProjectId}
          projectCode={resolvedP2aProjectCode}
          projectName={resolvedP2aProjectName}
          onSuccess={() => {
            setP2aWizardOpen(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
};
