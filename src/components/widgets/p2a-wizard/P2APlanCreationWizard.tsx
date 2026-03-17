import React, { useState, useEffect, useCallback } from 'react';
import { Key, Loader2, Trash2, AlertTriangle, Edit3, Eye, XCircle, RotateCcw, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WizardShell, WizardShellStep } from '../shared/WizardShell';
import { ProjectOverviewStep } from './steps/ProjectOverviewStep';
import { SystemsImportStep, WizardSystem } from './steps/SystemsImportStep';
import { VCRCreationStep, WizardVCR } from './steps/VCRCreationStep';
import { SystemMappingStep } from './steps/SystemMappingStep';
import { PhasesStep, WizardPhase } from './steps/PhasesStep';
import { WorkspacePreviewStep } from './steps/WorkspacePreviewStep';
import { ApprovalSetupStep, WizardApprover } from './steps/ApprovalSetupStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { useP2APlanWizard } from '@/hooks/useP2APlanWizard';
import { useP2APlanByProject } from '@/hooks/useP2APlanByProject';
import { useP2ARejectionContext } from '@/hooks/useP2ARejectionContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface P2APlanCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectCode: string;
  projectName?: string;
  plantName?: string;
  milestones?: Array<{ id: string; name: string; target_date?: string }>;
  onSuccess?: () => void;
  onOpenWorkspace?: () => void;
  reviewTaskId?: string;
  onApprove?: (comment: string) => void;
  onReject?: (comment: string) => void;
}

const WIZARD_STEPS: WizardShellStep[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'systems', label: 'Select Systems' },
  { id: 'vcrs', label: 'Create VCRs' },
  { id: 'mapping', label: 'Assign Systems' },
  { id: 'phases', label: 'Handover Phases' },
  { id: 'approvers', label: 'Selected Approvers' },
  { id: 'review', label: 'Review & Submit' },
];

export const P2APlanCreationWizard: React.FC<P2APlanCreationWizardProps> = ({
  open,
  onOpenChange,
  projectId,
  projectCode,
  projectName,
  plantName,
  milestones = [],
  onSuccess,
  onOpenWorkspace,
  reviewTaskId,
  onApprove,
  onReject,
}) => {
  const isReviewMode = !!reviewTaskId;
  const [currentStep, setCurrentStep] = useState(0);
  const [useWizard, setUseWizard] = useState<boolean | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [requestChangeOpen, setRequestChangeOpen] = useState(false);
  const [reviewVisitedSteps, setReviewVisitedSteps] = useState<Set<number>>(new Set());
  const [reviewComment, setReviewComment] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const queryClient = useQueryClient();

  const { data: existingPlan } = useP2APlanByProject(projectId);

  const { data: rejectionInfo } = useP2ARejectionContext(
    existingPlan?.id,
    !isReviewMode ? existingPlan?.status : undefined
  );

  const isReadOnly = existingPlan ? ['ACTIVE', 'COMPLETED', 'APPROVED'].includes(existingPlan.status) : false;

  const {
    state,
    updateState,
    resetState,
    loadDraft,
    draftLoaded,
    saveDraft,
    submitForApproval,
    deleteDraft,
    isSaving,
    isSubmitting,
    isDeleting,
  } = useP2APlanWizard(projectId, projectCode);

  const TOTAL_CREATION_STEPS = WIZARD_STEPS.length;

  const syncWizardProgress = useCallback(async (step: number, isSubmitted = false) => {
    const percentage = isSubmitted ? 95 : Math.round(((step) / TOTAL_CREATION_STEPS) * 100);
    try {
      const { data: plans } = await (supabase as any)
        .from('orp_plans')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      if (plans?.[0]) {
        const orpPlanId = plans[0].id;
        let activity: any = null;
        const { data: activities } = await (supabase as any)
          .from('ora_plan_activities')
          .select('id, task_id, activity_code, name')
          .eq('orp_plan_id', orpPlanId);

        if (activities?.length) {
          activity = activities.find((a: any) => a.activity_code === 'EXE-10')
            || activities.find((a: any) => a.activity_code === 'P2A-01')
            || activities.find((a: any) => a.name?.toLowerCase().includes('p2a plan'))
            || activities.find((a: any) => a.name?.toLowerCase().includes('p2a'));
        }

        if (activity) {
          const activityUpdate: Record<string, any> = {
            completion_percentage: percentage,
            status: isSubmitted ? 'IN_PROGRESS' : percentage > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          };
          await (supabase as any)
            .from('ora_plan_activities')
            .update(activityUpdate)
            .eq('id', activity.id);

          if (activity.task_id) {
            const { data: taskRow } = await supabase
              .from('user_tasks')
              .select('metadata')
              .eq('id', activity.task_id)
              .single();

            await supabase
              .from('user_tasks')
              .update({
                metadata: {
                  ...((taskRow?.metadata as Record<string, any>) || {}),
                  completion_percentage: percentage,
                  plan_status: isSubmitted ? 'ACTIVE' : undefined,
                } as any,
                status: isSubmitted ? 'completed' : percentage > 0 ? 'in_progress' : 'pending',
              })
              .eq('id', activity.task_id);
          }
        }
      }

      const { data: allTasks } = await supabase
        .from('user_tasks')
        .select('id, metadata')
        .limit(100);

      const p2aTask = allTasks?.find((t: any) => {
        const meta = t.metadata as Record<string, any>;
        return meta?.action === 'create_p2a_plan' && meta?.project_id === projectId;
      });

      if (p2aTask) {
        await supabase
          .from('user_tasks')
          .update({
            metadata: {
              ...((p2aTask.metadata as Record<string, any>) || {}),
              completion_percentage: percentage,
              plan_status: isSubmitted ? 'ACTIVE' : undefined,
            } as any,
            status: isSubmitted ? 'completed' : percentage > 0 ? 'in_progress' : 'pending',
          })
          .eq('id', p2aTask.id);
      }

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists'] });
    } catch (err) {
      console.error('Failed to sync wizard progress:', err);
    }
  }, [projectId, queryClient, TOTAL_CREATION_STEPS]);

  const syncReviewProgress = useCallback(async (visitedCount: number) => {
    if (!reviewTaskId) return;
    const REVIEW_STEPS = 6;
    const percentage = Math.min(Math.round((visitedCount / REVIEW_STEPS) * 85), 85);
    try {
      const { data: taskRow } = await supabase
        .from('user_tasks')
        .select('metadata')
        .eq('id', reviewTaskId)
        .single();

      await supabase
        .from('user_tasks')
        .update({
          metadata: {
            ...((taskRow?.metadata as Record<string, any>) || {}),
            completion_percentage: percentage,
          } as any,
          status: percentage > 0 ? 'in_progress' : 'pending',
        })
        .eq('id', reviewTaskId);

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
    } catch (err) {
      console.error('Failed to sync review progress:', err);
    }
  }, [reviewTaskId, queryClient]);

  // Track step visits in review mode
  useEffect(() => {
    if (isReviewMode && currentStep > 0) {
      setReviewVisitedSteps(prev => {
        const next = new Set(prev);
        if (!next.has(currentStep)) {
          next.add(currentStep);
          syncReviewProgress(next.size);
        }
        return next;
      });
    }
  }, [currentStep, isReviewMode, syncReviewProgress]);

  useEffect(() => {
    if (open) setBannerDismissed(false);
  }, [open]);

  useEffect(() => {
    if (open && existingPlan && !draftLoaded && !isLoadingDraft) {
      setIsLoadingDraft(true);
      loadDraft()
        .then((hasDraft) => {
          if (hasDraft) {
            setUseWizard(true);
            if (isReviewMode) {
              setCurrentStep(1);
            } else if (['ACTIVE', 'COMPLETED', 'APPROVED'].includes(existingPlan.status)) {
              setCurrentStep(WIZARD_STEPS.length - 1);
            } else {
              setCurrentStep(1);
            }
          }
        })
        .catch((err) => {
          console.error('Failed to load draft:', err);
        })
        .finally(() => {
          setIsLoadingDraft(false);
        });
    }
  }, [open, existingPlan, draftLoaded, isLoadingDraft, loadDraft, isReviewMode]);

  const handleClose = () => {
    resetState();
    setCurrentStep(0);
    setUseWizard(null);
    setCompletedSteps(new Set());
    setReviewVisitedSteps(new Set());
    setReviewComment('');
    setSubmissionComment('');
    setIsApproving(false);
    onOpenChange(false);
  };

  const handleReviewApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    try {
      if (reviewTaskId) {
        const { data: taskRow } = await supabase
          .from('user_tasks')
          .select('metadata')
          .eq('id', reviewTaskId)
          .single();
        await supabase
          .from('user_tasks')
          .update({
            metadata: {
              ...((taskRow?.metadata as Record<string, any>) || {}),
              completion_percentage: 100,
              review_comment: reviewComment || undefined,
            } as any,
          })
          .eq('id', reviewTaskId);
      }
      onApprove(reviewComment);
      handleClose();
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReviewReject = async () => {
    if (!onReject) return;
    setIsApproving(true);
    try {
      if (reviewTaskId) {
        const { data: taskRow } = await supabase
          .from('user_tasks')
          .select('metadata')
          .eq('id', reviewTaskId)
          .single();
        await supabase
          .from('user_tasks')
          .update({
            metadata: {
              ...((taskRow?.metadata as Record<string, any>) || {}),
              completion_percentage: 100,
              rejection_comment: reviewComment || undefined,
            } as any,
          })
          .eq('id', reviewTaskId);
      }
      onReject(reviewComment);
      toast.success('Plan rejected. The author has been notified and can revise the plan.');
      handleClose();
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Step completion uses 0-indexed steps now
  // Steps: 0=Overview, 1=Systems, 2=VCRs, 3=Mapping, 4=Phases, 5=Approvers, 6=Review
  const isStepComplete = (idx: number): boolean => {
    switch (idx) {
      case 0: return useWizard === true;
      case 1: return state.systems.length > 0;
      case 2: return state.vcrs.length > 0;
      case 3: return Object.values(state.mappings).some(arr => arr.length > 0);
      case 4: return state.phases.length > 0;
      case 5: return state.approvers.length > 0;
      case 6: return currentStep > idx;
      default: return false;
    }
  };

  const isStepWarning = (idx: number): boolean => {
    // A step is "warning" if the user has been past it but it's not complete
    if (idx === 0) return false;
    const hasBeenPast = currentStep > idx;
    return hasBeenPast && !isStepComplete(idx);
  };

  const recalculateCompletedSteps = () => {
    const newCompleted = new Set<number>();
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
      if (isStepComplete(i)) {
        newCompleted.add(i);
      }
    }
    setCompletedSteps(newCompleted);
  };

  useEffect(() => {
    if (draftLoaded && useWizard) {
      recalculateCompletedSteps();
      if (!isReadOnly) {
        let highestComplete = 0;
        for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
          if (isStepComplete(i)) {
            highestComplete = i + 1;
          } else {
            break;
          }
        }
        syncWizardProgress(Math.min(highestComplete, WIZARD_STEPS.length - 1));
      }
    }
  }, [draftLoaded, useWizard, isReadOnly]);

  const handleChooseWizard = () => {
    setUseWizard(true);
    setCurrentStep(1);
  };

  const handleChooseWorkspace = async () => {
    try {
      await saveDraft();
    } catch (error) {
      // Continue even if save fails
    }
    handleClose();
    onOpenWorkspace?.();
  };

  const handleBack = () => {
    recalculateCompletedSteps();
    if (currentStep === 1 && useWizard) {
      setUseWizard(null);
      setCurrentStep(0);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 0));
    }
  };

  const handleNext = async () => {
    recalculateCompletedSteps();
    const nextStep = Math.min(currentStep + 1, WIZARD_STEPS.length - 1);
    if (!isReadOnly) {
      try {
        await saveDraft();
        syncWizardProgress(nextStep);
      } catch (error) {
        // Continue navigation
      }
    }
    setCurrentStep(nextStep);
  };

  const handleSave = async () => {
    try {
      await saveDraft();
      syncWizardProgress(currentStep);
      toast.success('Changes saved successfully.');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSaveAndExit = async () => {
    try {
      await saveDraft();
      syncWizardProgress(currentStep);
      handleClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteDraft = async () => {
    try {
      await deleteDraft();
      handleClose();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSubmit = async () => {
    try {
      await submitForApproval(submissionComment || undefined);
      await syncWizardProgress(WIZARD_STEPS.length - 1, true);
      handleClose();
      onSuccess?.();
      toast.success('P2A Plan submitted for approval!');
    } catch (error) {
      // Error handled in hook
    }
  };

  const canProceed = () => true;

  const renderStepContent = () => {
    if (isLoadingDraft) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading your saved draft...</p>
          </div>
        </div>
      );
    }

    if (currentStep === 0 || useWizard === null) {
      return (
        <ProjectOverviewStep
          projectId={projectId}
          projectCode={projectCode}
          projectName={projectName}
          plantName={plantName}
          milestones={milestones}
          onChooseWizard={handleChooseWizard}
          onChooseWorkspace={handleChooseWorkspace}
        />
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <SystemsImportStep
            systems={state.systems}
            onSystemsChange={(systems) => updateState('systems', systems)}
            projectCode={projectCode}
          />
        );
      case 2:
        return (
          <VCRCreationStep
            vcrs={state.vcrs}
            projectCode={projectCode}
            onVCRsChange={(vcrs) => updateState('vcrs', vcrs)}
          />
        );
      case 3:
        return (
          <SystemMappingStep
            systems={state.systems}
            vcrs={state.vcrs}
            mappings={state.mappings}
            onMappingsChange={(mappings) => updateState('mappings', mappings)}
          />
        );
      case 4:
        return (
          <PhasesStep
            vcrs={state.vcrs}
            phases={state.phases}
            systems={state.systems}
            vcrPhaseAssignments={state.vcrPhaseAssignments}
            mappings={state.mappings}
            milestones={milestones}
            onPhasesChange={(phases) => updateState('phases', phases)}
            onVCRPhaseAssignmentsChange={(assignments) => updateState('vcrPhaseAssignments', assignments)}
            onVCRsChange={(vcrs) => updateState('vcrs', vcrs)}
            onMappingsChange={(mappings) => updateState('mappings', mappings)}
            onOpenFullWorkspace={handleChooseWorkspace}
          />
        );
      case 5:
        return (
          <ApprovalSetupStep
            approvers={state.approvers}
            projectId={projectId}
            plantName={plantName}
            onApproversChange={(approvers) => updateState('approvers', approvers)}
          />
        );
      case 6:
        return (
          <WorkspacePreviewStep
            systems={state.systems}
            vcrs={state.vcrs}
            phases={state.phases}
            mappings={state.mappings}
            vcrPhaseAssignments={state.vcrPhaseAssignments}
            approvers={state.approvers}
          />
        );
      default:
        return null;
    }
  };

  // Whether to show full wizard layout (not overview)
  const showWizardLayout = useWizard && currentStep > 0 && !isLoadingDraft;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  // Header content
  const headerContent = (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="relative shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-xl blur-sm" />
        <div className="relative p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
          <Key className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold truncate">
          {isReviewMode
            ? 'Review P2A Plan'
            : existingPlan && ['ACTIVE'].includes(existingPlan.status)
              ? 'P2A Plan — Pending Approval'
              : existingPlan && ['COMPLETED', 'APPROVED'].includes(existingPlan.status)
                ? 'P2A Plan — Approved'
                : 'Develop P2A Plan'}
        </h2>
        <p className="text-[10px] text-muted-foreground">
          {projectName && projectName !== projectCode
            ? `${projectCode}: ${projectName}`
            : projectCode}
        </p>
      </div>
    </div>
  );

  // Header actions (delete draft)
  const headerActions = (
    <>
      {existingPlan && existingPlan.status === 'DRAFT' && useWizard && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="z-[150]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Draft Plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the P2A Plan draft including all systems, VCRs, phases, and approvers. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDraft}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Draft
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );

  // Banners
  const bannerContent = showWizardLayout ? (
    <>
      {/* Review mode banner */}
      {isReviewMode && (
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 border-b bg-primary/5 dark:bg-primary/10 text-primary shrink-0">
          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <p className="text-[11px] sm:text-xs flex-1">
            You are reviewing this plan as an approver. Navigate through each section to review, then approve or reject on the final step.
            <span className="ml-1 sm:ml-2 font-medium">
              ({reviewVisitedSteps.size}/6 sections reviewed)
            </span>
          </p>
        </div>
      )}

      {/* Draft context banner — rejection or revert */}
      {!isReviewMode && rejectionInfo && !bannerDismissed && (
        rejectionInfo.type === 'reverted' ? (
          <div className="group/banner relative flex items-start gap-2 sm:gap-3 px-3 sm:px-5 py-1.5 sm:py-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 shrink-0" style={{ borderLeft: '3px solid hsl(38, 92%, 50%)' }}>
            <RotateCcw className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 text-[11px] sm:text-xs space-y-0.5">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Plan reverted to Draft by {rejectionInfo.rejector_name || rejectionInfo.role_name}
                {rejectionInfo.approved_at && (
                  <span className="font-normal text-amber-600/80 dark:text-amber-400/70 ml-1">
                    on {new Date(rejectionInfo.approved_at).toLocaleDateString()}
                  </span>
                )}
              </p>
              {rejectionInfo.comments && (
                <p className="text-amber-700/80 dark:text-amber-300/70 italic">"{rejectionInfo.comments}"</p>
              )}
              <p className="text-amber-600/70 dark:text-amber-400/60">You can continue editing and resubmit when ready.</p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="absolute top-1.5 right-1.5 p-0.5 rounded-sm opacity-0 group-hover/banner:opacity-100 transition-opacity text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="group/banner relative flex items-start gap-2 sm:gap-3 px-3 sm:px-5 py-1.5 sm:py-2 border-b bg-destructive/5 dark:bg-destructive/10 text-destructive shrink-0">
            <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] sm:text-xs space-y-0.5">
              <p className="font-medium">
                Plan was rejected by {rejectionInfo.rejector_name || rejectionInfo.role_name}
                {rejectionInfo.approved_at && (
                  <span className="font-normal text-muted-foreground ml-1">
                    on {new Date(rejectionInfo.approved_at).toLocaleDateString()}
                  </span>
                )}
              </p>
              {rejectionInfo.comments && rejectionInfo.comments !== 'Rejected by approver' && (
                <p className="text-foreground/80 italic">"{rejectionInfo.comments}"</p>
              )}
              <p className="text-muted-foreground">Please address the feedback and resubmit for approval.</p>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="absolute top-1.5 right-1.5 p-0.5 rounded-sm opacity-0 group-hover/banner:opacity-100 transition-opacity text-destructive/50 hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      )}

      {/* Read-only banner */}
      {!isReviewMode && isReadOnly && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 border-b bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <p className="text-[11px] sm:text-xs flex-1">
              {existingPlan?.status === 'ACTIVE'
                ? 'This plan has been submitted and is pending approval. Changes are not allowed until the review is complete.'
                : 'This plan has been approved. Any modifications will require resubmitting for re-approval.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-[11px] sm:text-xs gap-1.5 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-7 sm:h-8"
            onClick={() => setRequestChangeOpen(true)}
          >
            <Edit3 className="h-3 w-3" />
            Request Change
          </Button>
        </div>
      )}
    </>
  ) : null;

  // Pinned footer content (notes)
  const pinnedFooter = showWizardLayout ? (
    <>
      {/* Notes for Approvers — author mode, last step */}
      {!isReviewMode && !isReadOnly && isLastStep && (
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-t bg-muted/30 shrink-0">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <label className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes for Approvers
            </label>
            <span className="text-[10px] text-muted-foreground ml-auto">(optional)</span>
          </div>
          <div className="relative">
            <textarea
              placeholder="Add any context, instructions, or key decisions for the approval team..."
              value={submissionComment}
              onChange={(e) => setSubmissionComment(e.target.value.slice(0, 500))}
              className="w-full min-h-[40px] max-h-[56px] rounded-md border border-input bg-background px-2.5 py-1.5 pr-14 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
            />
            <span className={cn(
              "absolute bottom-1.5 right-2.5 text-[10px] tabular-nums pointer-events-none",
              submissionComment.length >= 500 ? "text-destructive" : "text-muted-foreground/60"
            )}>
              {submissionComment.length}/500
            </span>
          </div>
        </div>
      )}

      {/* Review comment — reviewer mode, last step */}
      {isReviewMode && isLastStep && (
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-t bg-muted/30 shrink-0">
          <label className="text-[11px] sm:text-xs font-medium text-foreground mb-1 sm:mb-1.5 block">
            Review Comments <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            placeholder="Add comments about your review decision..."
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            className="w-full min-h-[40px] sm:min-h-[48px] max-h-[60px] sm:max-h-[72px] rounded-md border border-input bg-background px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
    </>
  ) : null;

  // Navigation props
  const navigationProps = showWizardLayout ? {
    onBack: handleBack,
    onNext: handleNext,
    onSave: isReadOnly && !isReviewMode ? undefined : (!isReviewMode ? handleSave : undefined),
    onSaveAndExit: isReviewMode ? () => onOpenChange(false) : (isReadOnly ? () => onOpenChange(false) : handleSaveAndExit),
    onSubmit: !isReviewMode && isLastStep && !isReadOnly && (!existingPlan || existingPlan.status === 'DRAFT') ? handleSubmit : undefined,
    onApprove: isReviewMode ? handleReviewApprove : undefined,
    onReject: isReviewMode ? handleReviewReject : undefined,
    isSubmitting: isSubmitting || isApproving,
    isSaving,
    canProceed: canProceed(),
    canGoBack: currentStep > 0,
    submitLabel: 'Submit for Approval',
    saveAndExitLabel: isReadOnly || isReviewMode ? 'Close' : undefined,
    isReviewMode,
  } : undefined;

  return (
    <>
      <WizardShell
        open={open}
        onOpenChange={onOpenChange}
        dialogTitle={isReviewMode ? 'Review P2A Plan' : 'Develop P2A Plan'}
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={(idx) => {
          recalculateCompletedSteps();
          setCurrentStep(idx);
        }}
        isStepComplete={isStepComplete}
        isStepWarning={isStepWarning}
        header={headerContent}
        headerActions={headerActions}
        banners={bannerContent}
        pinnedFooterContent={pinnedFooter}
        navigation={navigationProps}
      >
        <div className="flex-1">
          {renderStepContent()}
        </div>
      </WizardShell>

      {/* Request Change confirmation dialog */}
      <AlertDialog open={requestChangeOpen} onOpenChange={setRequestChangeOpen}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <AlertDialogTitle>Request Changes?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Making changes to this plan will revert it to <strong>Draft</strong> status and void all current approvals.
              You will need to resubmit the plan for a new approval cycle, and all approvers will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={async () => {
                try {
                  if (existingPlan) {
                    await (supabase as any)
                      .from('p2a_handover_plans')
                      .update({ status: 'DRAFT' })
                      .eq('id', existingPlan.id);
                    await (supabase as any)
                      .from('p2a_handover_approvers')
                      .update({ status: 'PENDING', approved_at: null })
                      .eq('plan_id', existingPlan.id);
                  }
                  queryClient.invalidateQueries({ queryKey: ['p2a-plan-by-project'] });
                  queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
                  queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists-sheet'] });
                  toast.success('Plan reverted to draft. You can now make changes.');
                  setRequestChangeOpen(false);
                } catch (err) {
                  toast.error('Failed to revert plan status.');
                }
              }}
            >
              Revert to Draft & Edit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
