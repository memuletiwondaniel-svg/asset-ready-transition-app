import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, AlertTriangle, Edit3, Eye, XCircle, RotateCcw, MessageSquare, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

// Guided wizard steps (Overview is the landing page, NOT a step)
const WIZARD_STEPS: WizardShellStep[] = [
  { id: 'systems', label: 'Select Systems' },
  { id: 'vcrs', label: 'Create VCRs' },
  { id: 'mapping', label: 'Assign Systems (Preliminary)' },
  { id: 'phases', label: 'Handover Phases' },
  { id: 'approvers', label: 'Select Approvers' },
  { id: 'review', label: 'Review and Submit' },
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
  const [selectedApproach, setSelectedApproach] = useState<'wizard' | 'workspace' | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [requestChangeOpen, setRequestChangeOpen] = useState(false);
  const [reviewVisitedSteps, setReviewVisitedSteps] = useState<Set<number>>(new Set());
  const [reviewComment, setReviewComment] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
    saveDraftSilent,
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

  // Debounced autosave: silently persist state changes while user works inside the Guided Wizard
  useEffect(() => {
    if (!open || !useWizard || isReadOnly || isReviewMode || isLoadingDraft) return;
    if (!draftLoaded && (state.systems.length === 0 && state.vcrs.length === 0 && state.phases.length === 0 && state.approvers.length === 0)) {
      return;
    }
    const t = setTimeout(() => { void saveDraftSilent(); }, 1500);
    return () => clearTimeout(t);
  }, [open, useWizard, isReadOnly, isReviewMode, isLoadingDraft, draftLoaded, state, saveDraftSilent]);


  useEffect(() => {
    if (open && existingPlan && !draftLoaded && !isLoadingDraft) {
      setIsLoadingDraft(true);
      loadDraft()
        .then((hasDraft) => {
          if (hasDraft) {
            setUseWizard(true);
            setSelectedApproach('wizard');
            if (isReviewMode) {
              setCurrentStep(0);
            } else if (['ACTIVE', 'COMPLETED', 'APPROVED'].includes(existingPlan.status)) {
              setCurrentStep(WIZARD_STEPS.length - 1);
            } else {
              setCurrentStep(0);
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
    setSelectedApproach(null);
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

  // Steps (0-indexed): 0=Systems, 1=VCRs, 2=Mapping, 3=Phases, 4=Approvers, 5=Review
  const isStepComplete = (idx: number): boolean => {
    switch (idx) {
      case 0: return state.systems.length > 0;
      case 1: return state.vcrs.length > 0;
      case 2: return true; // Preliminary mapping — optional, never blocks or warns
      case 3: return state.phases.length > 0;
      case 4: return state.approvers.length > 0;
      case 5: return currentStep > idx;
      default: return false;
    }
  };

  const isStepWarning = (idx: number): boolean => {
    const hasBeenPast = currentStep > idx;
    return hasBeenPast && !isStepComplete(idx);
  };

  const recalculateCompletedSteps = () => {
    const newCompleted = new Set<number>();
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
      if (isStepComplete(i)) newCompleted.add(i);
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
    setCurrentStep(0);
    // Eagerly create the DRAFT row so the project card shows "Continue P2A Plan" + delete on next visit
    if (!isReadOnly && !isReviewMode) {
      void saveDraftSilent();
    }
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

  // Landing-page Next: act on the currently selected approach
  const handleLandingNext = () => {
    if (selectedApproach === 'wizard') {
      handleChooseWizard();
    } else if (selectedApproach === 'workspace') {
      handleChooseWorkspace();
    }
  };

  const handleBack = () => {
    recalculateCompletedSteps();
    if (currentStep === 0 && useWizard) {
      // Return to landing
      setUseWizard(null);
      setSelectedApproach(null);
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

    if (!useWizard) {
      return (
        <ProjectOverviewStep
          projectId={projectId}
          projectCode={projectCode}
          projectName={projectName}
          plantName={plantName}
          milestones={milestones}
          selectedApproach={selectedApproach}
          onSelectApproach={setSelectedApproach}
        />
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <SystemsImportStep
            systems={state.systems}
            onSystemsChange={(systems) => updateState('systems', systems)}
            projectCode={projectCode}
          />
        );
      case 1:
        return (
          <VCRCreationStep
            vcrs={state.vcrs}
            projectCode={projectCode}
            onVCRsChange={(vcrs) => updateState('vcrs', vcrs)}
          />
        );
      case 2:
        return (
          <SystemMappingStep
            systems={state.systems}
            vcrs={state.vcrs}
            mappings={state.mappings}
            onMappingsChange={(mappings) => updateState('mappings', mappings)}
          />
        );
      case 3:
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
      case 4:
        return (
          <ApprovalSetupStep
            approvers={state.approvers}
            projectId={projectId}
            plantName={plantName}
            onApproversChange={(approvers) => updateState('approvers', approvers)}
          />
        );
      case 5:
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

  // Wizard layout is shown once user has chosen the Guided Wizard
  const isLanding = !useWizard;
  const showWizardLayout = useWizard === true && !isLoadingDraft;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  // Status chip for header
  const statusChip = (() => {
    if (isReviewMode) return { label: 'In Review', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
    if (existingPlan?.status === 'ACTIVE') return { label: 'Pending Approval', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
    if (existingPlan && ['COMPLETED', 'APPROVED'].includes(existingPlan.status)) return { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
    return { label: 'Draft', cls: 'bg-muted text-muted-foreground border-border' };
  })();

  const headerTitle = isReviewMode ? 'Review P2A Plan' : 'Develop P2A Plan';

  // Compact header used as fallback (mobile / when topHeader not rendered)
  const headerContent = (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-medium", statusChip.cls)}>
          {statusChip.label}
        </Badge>
      </div>
      <h2 className="text-[14px] font-bold leading-tight text-foreground line-clamp-2">
        {headerTitle}
      </h2>
    </div>
  );

  // Full-width banner header — title first, subtitle (project code · name) below in clean modern style
  const prettyProjectName = projectName && projectName !== projectCode
    ? projectName.replace(/\b\w+/g, (w) =>
        /^[A-Z0-9-]+$/.test(w) && w.length <= 4
          ? w
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
    : '';

  const topHeaderContent = (
    <div className="flex items-center justify-between gap-4 min-w-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg sm:text-xl font-semibold leading-none text-foreground tracking-tight">
            {headerTitle}
          </h2>
          <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-medium", statusChip.cls)}>
            {statusChip.label}
          </Badge>
        </div>
        <p className="text-[12px] leading-snug mt-2 truncate flex items-center gap-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium text-[10px] tracking-wide uppercase border border-border/60">{projectCode}</span>
          {prettyProjectName ? <span className="text-muted-foreground">{prettyProjectName}</span> : null}
        </p>

      </div>
    </div>
  );

  // Header actions — muted trash (red on hover) that deletes the P2A plan
  const headerActions = (
    <>
      {showWizardLayout && !isReviewMode && !isReadOnly && (
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete P2A Plan"
                  className="h-8 w-8 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete</TooltipContent>
          </Tooltip>
          <AlertDialogContent className="z-[150]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete P2A Plan?</AlertDialogTitle>
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
                Delete Plan
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
  // On landing: Next button only appears AFTER an approach is selected.
  const landingNavigation = isLanding && selectedApproach
    ? {
        onBack: () => onOpenChange(false),
        onNext: handleLandingNext,
        onSaveAndExit: () => onOpenChange(false),
        canGoBack: false,
        canProceed: true,
        saveAndExitLabel: 'Close',
      }
    : undefined;

  const wizardNavigation = showWizardLayout ? {
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
    canGoBack: true,
    submitLabel: 'Submit for Approval',
    saveAndExitLabel: isReadOnly || isReviewMode ? 'Close' : 'Save and Close',
    isReviewMode,
  } : undefined;

  const navigationProps = wizardNavigation ?? landingNavigation;

  return (
    <>
      <WizardShell
        open={open}
        onOpenChange={onOpenChange}
        dialogTitle={isReviewMode ? 'Review P2A Plan' : 'Develop P2A Plan'}
        steps={isLanding ? [] : WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={(idx) => {
          recalculateCompletedSteps();
          setCurrentStep(idx);
        }}
        isStepComplete={isStepComplete}
        isStepWarning={isStepWarning}
        header={headerContent}
        topHeader={topHeaderContent}
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
