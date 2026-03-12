import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Key, Loader2, Trash2, AlertTriangle, Edit3, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardProgress, WizardStep } from './WizardProgress';
import { WizardNavigation } from './WizardNavigation';
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
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  /** When set, wizard operates in review mode for an approver task */
  reviewTaskId?: string;
  /** Callback when reviewer approves */
  onApprove?: (comment: string) => void;
  /** Callback when reviewer rejects */
  onReject?: (comment: string) => void;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Overview', description: 'Project info and approach' },
  { id: 2, title: 'Select\nSystems', description: 'Import or create systems' },
  { id: 3, title: 'Create\nVCRs', description: 'Define Verification Certificate of Readiness' },
  { id: 4, title: 'Assign Systems', description: 'Map systems to VCRs' },
  { id: 5, title: 'Handover Phases', description: 'Define phases & assign VCRs' },
  { id: 6, title: 'Selected\nApprovers', description: 'Choose who approves the plan' },
  { id: 7, title: 'Review &\nSubmit', description: 'Review the plan layout' },
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
  const [currentStep, setCurrentStep] = useState(1);
  const [useWizard, setUseWizard] = useState<boolean | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [requestChangeOpen, setRequestChangeOpen] = useState(false);
  const [reviewVisitedSteps, setReviewVisitedSteps] = useState<Set<number>>(new Set());
  const [reviewComment, setReviewComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: existingPlan } = useP2APlanByProject(projectId);

  // Fetch rejection info from approvers table
  const { data: rejectionInfo } = useQuery({
    queryKey: ['p2a-rejection-info', existingPlan?.id],
    queryFn: async () => {
      if (!existingPlan?.id) return null;
      const { data } = await (supabase as any)
        .from('p2a_handover_approvers')
        .select('role_name, comments, approved_at')
        .eq('handover_id', existingPlan.id)
        .eq('status', 'REJECTED')
        .order('approved_at', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!existingPlan?.id && existingPlan?.status === 'DRAFT' && !isReviewMode,
    staleTime: 30_000,
  });
  
  // Read-only when plan is submitted (ACTIVE) or fully approved (COMPLETED/APPROVED)
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

  // Total wizard steps (excluding overview which is step 1 / entry point)
  const TOTAL_CREATION_STEPS = WIZARD_STEPS.length; // 7

  /**
   * Sync wizard step progress to ora_plan_activities and user_tasks.
   * Maps wizard steps: step 1=0%, step 2=14%, ... step 7=86%, submitted=100%
   */
  const syncWizardProgress = useCallback(async (step: number, isSubmitted = false) => {
    // Submitted = 95% (pending approval); 100% only after final approval
    const percentage = isSubmitted ? 95 : Math.round(((step - 1) / TOTAL_CREATION_STEPS) * 100);
    
    try {
      // Find ORP plan for this project
      const { data: plans } = await (supabase as any)
        .from('orp_plans')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      if (plans?.[0]) {
        const orpPlanId = plans[0].id;

        // Find the P2A activity - search by multiple strategies:
        // 1. activity_code 'P2A-01' (legacy), 2. name containing 'P2A', 3. name 'Develop P2A Plan'
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
          // Update ora_plan_activities
          const activityUpdate: Record<string, any> = {
            completion_percentage: percentage,
            // Submitted = still IN_PROGRESS (95%), only COMPLETED at 100% after approval
            status: isSubmitted ? 'IN_PROGRESS' : percentage > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          };
          await (supabase as any)
            .from('ora_plan_activities')
            .update(activityUpdate)
            .eq('id', activity.id);

          // Update linked user_task via task_id if available
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
                // Task moves to completed on submission (no further user action needed)
                status: isSubmitted ? 'completed' : percentage > 0 ? 'in_progress' : 'pending',
              })
              .eq('id', activity.task_id);
          }
        }
      }

      // Also update standalone P2A tasks (create_p2a_plan action tasks)
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
            // Task moves to completed on submission (no further user action needed)
            status: isSubmitted ? 'completed' : percentage > 0 ? 'in_progress' : 'pending',
          })
          .eq('id', p2aTask.id);
      }

      // Invalidate caches so Kanban/Gantt reflect changes
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-orp-activities'] });
      queryClient.invalidateQueries({ queryKey: ['ora-plan-activities'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plan'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists'] });
    } catch (err) {
      console.error('Failed to sync wizard progress:', err);
    }
  }, [projectId, queryClient]);

  /**
   * Sync review progress to the reviewer's user_task.
   * Each of the 6 wizard steps (2-7) = ~14%, capped at 85%. Approval = 100%.
   */
  const syncReviewProgress = useCallback(async (visitedCount: number) => {
    if (!reviewTaskId) return;
    const REVIEW_STEPS = 6; // steps 2-7
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

  // Track step visits in review mode and sync progress
  useEffect(() => {
    if (isReviewMode && currentStep > 1) {
      setReviewVisitedSteps(prev => {
        const next = new Set(prev);
        if (!next.has(currentStep)) {
          next.add(currentStep);
          // Fire async progress sync (don't block)
          syncReviewProgress(next.size);
        }
        return next;
      });
    }
  }, [currentStep, isReviewMode, syncReviewProgress]);

  // When the wizard opens and a draft plan exists, auto-load and resume
  useEffect(() => {
    if (open && existingPlan && !draftLoaded && !isLoadingDraft) {
      setIsLoadingDraft(true);
      loadDraft()
        .then((hasDraft) => {
          if (hasDraft) {
            setUseWizard(true);
            // Review mode: start at step 2 (first content step)
            if (isReviewMode) {
              setCurrentStep(2);
            } else if (['ACTIVE', 'COMPLETED', 'APPROVED'].includes(existingPlan.status)) {
              setCurrentStep(WIZARD_STEPS.length); // Step 7 (Review)
            } else {
              setCurrentStep(2);
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
    setCurrentStep(1);
    setUseWizard(null);
    setCompletedSteps(new Set());
    setReviewVisitedSteps(new Set());
    setReviewComment('');
    setIsApproving(false);
    onOpenChange(false);
  };

  const handleReviewApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    try {
      // Set review task to 100%
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

        // Store the rejection comment in the task metadata so the cascade can use it
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

  const isStepComplete = (displayStep: number): boolean => {
    const hasVisitedPast = (currentStep - 1) > displayStep;
    switch (displayStep) {
      case 1: return state.systems.length > 0;
      case 2: return state.vcrs.length > 0;
      case 3: return Object.values(state.mappings).some(arr => arr.length > 0);
      case 4: return state.phases.length > 0;
      case 5: return state.approvers.length > 0;
      case 6: return hasVisitedPast;
      default: return false;
    }
  };

  const recalculateCompletedSteps = () => {
    const newCompleted = new Set<number>();
    for (let i = 1; i <= WIZARD_STEPS.length - 1; i++) {
      // A step is only complete if its own validation passes AND all prior steps are complete
      const priorStepsComplete = i === 1 || Array.from({ length: i - 1 }, (_, k) => k + 1).every(s => isStepComplete(s));
      if (isStepComplete(i) && priorStepsComplete) {
        newCompleted.add(i);
      }
    }
    setCompletedSteps(newCompleted);
  };

  useEffect(() => {
    if (draftLoaded && useWizard) {
      recalculateCompletedSteps();
      // Only sync progress for editable (non-read-only) plans.
      // For submitted/approved plans, syncing would overwrite 'completed' status
      // with 'in_progress', causing the Kanban card to jump out of Done.
      if (!isReadOnly) {
        // Determine highest completed step to reflect accurate progress
        let highestComplete = 1; // At minimum step 1 (systems) if draft exists
        for (let i = 1; i <= WIZARD_STEPS.length - 1; i++) {
          if (isStepComplete(i)) {
            highestComplete = i + 1; // Next step is where the user would resume
          } else {
            break;
          }
        }
        syncWizardProgress(Math.min(highestComplete, WIZARD_STEPS.length));
      }
    }
  }, [draftLoaded, useWizard, isReadOnly]);

  const handleChooseWizard = () => {
    setUseWizard(true);
    setCurrentStep(2);
  };

  const handleChooseWorkspace = async () => {
    try {
      await saveDraft();
    } catch (error) {
      // Continue even if save fails — user can still view workspace
    }
    handleClose();
    onOpenWorkspace?.();
  };

  const handleBack = () => {
    recalculateCompletedSteps();
    if (currentStep === 2 && useWizard) {
      setUseWizard(null);
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  // Auto-save when clicking Next (skip save in read-only mode)
  const handleNext = async () => {
    recalculateCompletedSteps();
    const nextStep = Math.min(currentStep + 1, WIZARD_STEPS.length);
    if (!isReadOnly) {
      try {
        await saveDraft();
        syncWizardProgress(nextStep);
      } catch (error) {
        // Continue navigation even if save fails silently
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
      await submitForApproval();
      await syncWizardProgress(WIZARD_STEPS.length, true);
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

    if (currentStep === 1 || useWizard === null) {
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
      case 2:
        return (
          <SystemsImportStep
            systems={state.systems}
            onSystemsChange={(systems) => updateState('systems', systems)}
            projectCode={projectCode}
          />
        );
      case 3:
        return (
          <VCRCreationStep
            vcrs={state.vcrs}
            projectCode={projectCode}
            onVCRsChange={(vcrs) => updateState('vcrs', vcrs)}
          />
        );
      case 4:
        return (
          <SystemMappingStep
            systems={state.systems}
            vcrs={state.vcrs}
            mappings={state.mappings}
            onMappingsChange={(mappings) => updateState('mappings', mappings)}
          />
        );
      case 5:
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
      case 6:
        return (
          <ApprovalSetupStep
            approvers={state.approvers}
            projectId={projectId}
            plantName={plantName}
            onApproversChange={(approvers) => updateState('approvers', approvers)}
          />
        );
      case 7:
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl w-[95vw] p-0 gap-0 h-[min(88vh,800px)] flex flex-col overflow-hidden [&>button]:hidden z-[100]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 to-amber-500/40 rounded-xl blur-sm" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                <Key className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isReviewMode
                  ? 'Review P2A Plan'
                  : existingPlan && ['ACTIVE'].includes(existingPlan.status)
                    ? 'P2A Plan — Pending Approval'
                    : existingPlan && ['COMPLETED', 'APPROVED'].includes(existingPlan.status)
                      ? 'P2A Plan — Approved'
                      : 'Develop P2A Plan'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {projectName && projectName !== projectCode 
                  ? `${projectCode}: ${projectName}` 
                  : projectCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Delete draft button - only for existing drafts */}
            {existingPlan && existingPlan.status === 'DRAFT' && useWizard && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
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
          </div>
        </div>

        {/* Progress Indicator */}
        {useWizard && currentStep > 1 && !isLoadingDraft && (
          <WizardProgress
            steps={WIZARD_STEPS.slice(1)}
            currentStep={currentStep - 1}
            completedSteps={completedSteps}
            onStepClick={(step) => {
              recalculateCompletedSteps();
              setCurrentStep(step + 1);
            }}
          />
        )}

        {/* Review mode banner */}
        {isReviewMode && useWizard && currentStep > 1 && !isLoadingDraft && (
          <div className="flex items-center gap-3 px-5 py-2.5 border-b bg-primary/5 dark:bg-primary/10 text-primary">
            <Eye className="h-4 w-4 shrink-0" />
            <p className="text-xs flex-1">
              You are reviewing this plan as an approver. Navigate through each section to review, then approve or reject on the final step.
              <span className="ml-2 font-medium">
                ({reviewVisitedSteps.size}/6 sections reviewed)
              </span>
            </p>
          </div>
        )}

        {/* Read-only banner (non-review mode) */}
        {!isReviewMode && isReadOnly && useWizard && currentStep > 1 && !isLoadingDraft && (
          <div className="flex items-center gap-3 px-5 py-2.5 border-b bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-xs flex-1">
              {existingPlan?.status === 'ACTIVE'
                ? 'This plan has been submitted and is pending approval. Changes are not allowed until the review is complete.'
                : 'This plan has been approved. Any modifications will require resubmitting for re-approval.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs gap-1.5 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              onClick={() => setRequestChangeOpen(true)}
            >
              <Edit3 className="h-3 w-3" />
              Request Change
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {renderStepContent()}
        </div>

        {/* Review comment box — pinned above final actions on last step */}
        {isReviewMode && useWizard && currentStep === WIZARD_STEPS.length && !isLoadingDraft && (
          <div className="px-5 py-2.5 border-t bg-muted/30 shrink-0">
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Review Comments <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Add comments about your review decision..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full min-h-[48px] max-h-[72px] rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Navigation */}
        {useWizard && currentStep > 1 && !isLoadingDraft && (
          <WizardNavigation
            currentStep={currentStep - 1}
            totalSteps={WIZARD_STEPS.length - 1}
            onBack={handleBack}
            onNext={handleNext}
            onSave={isReadOnly && !isReviewMode ? undefined : (!isReviewMode ? handleSave : undefined)}
            onSaveAndExit={isReviewMode ? () => onOpenChange(false) : (isReadOnly ? () => onOpenChange(false) : handleSaveAndExit)}
            onSubmit={!isReviewMode && currentStep === WIZARD_STEPS.length && !isReadOnly && (!existingPlan || existingPlan.status === 'DRAFT') ? handleSubmit : undefined}
            onApprove={isReviewMode ? handleReviewApprove : undefined}
            onReject={isReviewMode ? handleReviewReject : undefined}
            isSubmitting={isSubmitting || isApproving}
            isSaving={isSaving}
            canProceed={canProceed()}
            submitLabel="Submit for Approval"
            saveAndExitLabel={isReadOnly || isReviewMode ? 'Close' : undefined}
            isReviewMode={isReviewMode}
          />
        )}

        {/* Request Change confirmation dialog */}
        <AlertDialog open={requestChangeOpen} onOpenChange={setRequestChangeOpen}>
          <AlertDialogContent>
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
                    // Revert plan status to DRAFT
                    if (existingPlan) {
                      await (supabase as any)
                        .from('p2a_handover_plans')
                        .update({ status: 'DRAFT' })
                        .eq('id', existingPlan.id);
                      // Reset approvals
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
      </DialogContent>
    </Dialog>
  );
};
