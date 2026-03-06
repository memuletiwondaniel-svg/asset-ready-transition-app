import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Loader2, Check, AlertCircle, Save, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { StepPhaseSelection } from './StepPhaseSelection';
import { StepProjectType } from './StepProjectType';
import { StepActivities } from './StepActivities';
import { StepSchedule } from './StepSchedule';
import { StepApprovers, type WizardApprover } from './StepApprovers';
import { StepReview } from './StepReview';
import { WizardActivity, catalogToWizardActivity } from './types';
import { useORAActivityCatalog, useORPPhases } from '@/hooks/useORAActivityCatalog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { useQueryClient } from '@tanstack/react-query';
import { useORPPlans } from '@/hooks/useORPPlans';

interface ORAActivityPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, title: 'Phase', description: 'Select ORP phase' },
  { id: 2, title: 'Type', description: 'Project complexity' },
  { id: 3, title: 'Activities', description: 'Select activities' },
  { id: 4, title: 'Schedule', description: 'Set dates' },
  { id: 5, title: 'Approvers', description: 'Select approvers' },
  { id: 6, title: 'Review', description: 'Review & create' },
];

// Map wizard phases to orp_phase enum values
const PHASE_TO_ORP: Record<string, string> = {
  'IDENTIFY': 'ASSESS_SELECT',
  'ASSESS': 'ASSESS_SELECT',
  'SELECT': 'ASSESS_SELECT',
  'DEFINE': 'DEFINE',
  'EXECUTE': 'EXECUTE',
};

export const ORAActivityPlanWizard: React.FC<ORAActivityPlanWizardProps> = ({
  open, onOpenChange, projectId, onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [phase, setPhase] = useState('');
  const [projectType, setProjectType] = useState('');
  const [activities, setActivities] = useState<WizardActivity[]>([]);
  const [approvers, setApprovers] = useState<WizardApprover[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftPlanId, setDraftPlanId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { deletePlan, isDeletingPlan } = useORPPlans();

  // Load ORP phases to resolve phase_id from phase code
  const { phases: orpPhases } = useORPPhases();

  // Load all catalog activities
  const { activities: catalogActivities, isLoading: catalogLoading } = useORAActivityCatalog();

  // When moving to step 3, load catalog activities filtered by selected phase
  useEffect(() => {
    if (currentStep === 3 && catalogActivities.length > 0 && activities.length === 0) {
      // Find the orp_phase record matching the selected phase
      const selectedPhase = orpPhases.find(p => 
        p.code?.toUpperCase() === phase || p.label?.toUpperCase() === phase
      );

      let filtered = catalogActivities;
      if (selectedPhase) {
        // Include activities for this phase (and activities with no phase)
        filtered = catalogActivities.filter(a => 
          a.phase_id === selectedPhase.id || !a.phase_id
        );
      }

      // Map to wizard activities with duration based on project type
      const mapped = filtered.map(a => {
        const wa = catalogToWizardActivity(a);
        // Auto-set duration based on project type
        if (projectType === 'TYPE_A') {
          wa.durationDays = a.duration_high || a.duration_med || null;
        } else if (projectType === 'TYPE_B') {
          wa.durationDays = a.duration_med || null;
        } else if (projectType === 'TYPE_C') {
          wa.durationDays = a.duration_low || a.duration_med || null;
        }
        return wa;
      });
      setActivities(mapped);
    }
  }, [currentStep, catalogActivities, orpPhases, phase, projectType]);

  const resetForm = () => {
    setCurrentStep(1);
    setVisitedSteps(new Set([1]));
    setPhase('');
    setProjectType('');
    setActivities([]);
    setApprovers([]);
    setDraftPlanId(null);
  };

  // Check for existing draft on open
  useEffect(() => {
    if (!open) return;
    const loadDraft = async () => {
      const { data: drafts } = await (supabase as any)
        .from('orp_plans')
        .select('id, wizard_state')
        .eq('project_id', projectId)
        .eq('status', 'DRAFT')
        .eq('is_active', true)
        .limit(1);

      if (drafts && drafts.length > 0) {
        const draft = drafts[0];
        setDraftPlanId(draft.id);
        const ws = draft.wizard_state as any;
        if (ws) {
          setPhase(ws.phase || '');
          setProjectType(ws.projectType || '');
          setActivities(ws.activities || []);
          setApprovers(ws.approvers || []);
          setCurrentStep(ws.currentStep || 1);
          const visited = new Set<number>(ws.visitedSteps || [1]);
          setVisitedSteps(visited);
        }
      }
    };
    loadDraft();
  }, [open, projectId]);

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const orpPhase = PHASE_TO_ORP[phase] || 'ASSESS_SELECT';
      const wizardState = {
        phase,
        projectType,
        activities,
        approvers,
        currentStep,
        visitedSteps: Array.from(visitedSteps),
      };

      if (draftPlanId) {
        const { error } = await (supabase as any)
          .from('orp_plans')
          .update({
            phase: orpPhase,
            wizard_state: wizardState,
          })
          .eq('id', draftPlanId);
        if (error) throw error;
      } else {
        // Check no active plan exists
        const { data: existingPlans } = await supabase
          .from('orp_plans')
          .select('id')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .limit(1);

        if (existingPlans && existingPlans.length > 0) {
          toast({ title: 'Plan already exists', description: 'This project already has an active ORA Plan.', variant: 'destructive' });
          setIsSaving(false);
          return;
        }

        const { data: plan, error } = await (supabase as any)
          .from('orp_plans')
          .insert({
            project_id: projectId,
            phase: orpPhase,
            created_by: user.user.id,
            ora_engineer_id: user.user.id,
            status: 'DRAFT',
            wizard_state: wizardState,
          })
          .select()
          .single();
        if (error) throw error;
        setDraftPlanId(plan.id);
      }

      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      toast({ title: 'Draft saved', description: 'Your progress has been saved. You can resume anytime.' });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const orpPhase = PHASE_TO_ORP[phase] || 'ASSESS_SELECT';
      let planId = draftPlanId;

      if (draftPlanId) {
        // Upgrade draft to PENDING_APPROVAL
        const { error } = await (supabase as any)
          .from('orp_plans')
          .update({
            phase: orpPhase,
            status: 'PENDING_APPROVAL',
            wizard_state: null,
          })
          .eq('id', draftPlanId);
        if (error) throw error;
      } else {
        // Guard: check if an active plan already exists
        const { data: existingPlans } = await supabase
          .from('orp_plans')
          .select('id')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .limit(1);

        if (existingPlans && existingPlans.length > 0) {
          toast({ title: 'Plan already exists', description: 'This project already has an active ORA Plan.', variant: 'destructive' });
          setIsCreating(false);
          return;
        }

        const { data: plan, error: planError } = await supabase
          .from('orp_plans')
          .insert({
            project_id: projectId,
            phase: orpPhase as any,
            created_by: user.user.id,
            ora_engineer_id: user.user.id,
            status: 'PENDING_APPROVAL' as any,
          })
          .select()
          .single();

        if (planError) throw planError;
        planId = plan.id;
      }

      const selectedActivities = activities.filter(a => a.selected);

      const catalogDeliverables = selectedActivities
        .filter(a => !a.id.startsWith('custom-'))
        .map(a => ({
          orp_plan_id: planId!,
          deliverable_id: a.id,
          start_date: a.startDate || null,
          end_date: a.endDate || null,
          estimated_manhours: a.durationDays ? a.durationDays * 8 : (a.durationMed ? a.durationMed * 8 : null),
          status: 'NOT_STARTED' as any,
        }));

      if (catalogDeliverables.length > 0) {
        const { error: delError } = await supabase
          .from('orp_plan_deliverables')
          .insert(catalogDeliverables);

        if (delError) {
          console.warn('Some deliverables could not be linked:', delError.message);
        }
      }

      // Mark the Snr ORA Engr's creation task as completed
      const { error: taskCompleteError } = await supabase
        .from('user_tasks')
        .update({ status: 'completed' })
        .eq('user_id', user.user.id)
        .eq('type', 'ora_plan_creation')
        .match({ 'metadata->>project_id': projectId } as any);

      if (taskCompleteError) {
        console.warn('Could not complete creation task:', taskCompleteError.message);
      }

      // Find ORA Lead from project team to create review task
      const { data: teamMembers } = await supabase
        .from('project_team_members')
        .select('user_id, role')
        .eq('project_id', projectId);

      // Also try to find ORA Lead from profiles
      const ORA_LEAD_ROLES = ['ORA Lead'];
      const oraLeadMember = teamMembers?.find(m => ORA_LEAD_ROLES.includes(m.role));

      if (oraLeadMember) {
        // Create review task for ORA Lead
        await supabase
          .from('user_tasks')
          .insert({
            user_id: oraLeadMember.user_id,
            title: 'Review ORA Plan',
            description: `Review and approve the ORA Plan for project`,
            type: 'ora_plan_review',
            status: 'pending',
            priority: 'high',
            metadata: {
              source: 'ora_workflow',
              project_id: projectId,
              plan_id: planId,
              action: 'review_ora_plan',
            }
          });
      }

      toast({ title: 'Submitted', description: 'ORA Plan submitted for approval' });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: return !!phase;
      case 2: return !!projectType;
      case 3: return activities.some(a => a.selected);
      case 5: return approvers.length > 0;
      default: return true;
    }
  };

  const isStepComplete = (step: number): boolean => validateStep(step);

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return;
    const canNavigate = visitedSteps.has(targetStep) || targetStep <= currentStep;
    if (!canNavigate) {
      if (!validateStep(currentStep)) return;
    }
    setVisitedSteps(prev => new Set([...prev, targetStep]));
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    const nextStep = Math.min(currentStep + 1, STEPS.length);
    if (currentStep === 2 && activities.length === 0) {
      // Reset so they reload in step 3
      setActivities([]);
    }
    setVisitedSteps(prev => new Set([...prev, nextStep]));
    setCurrentStep(nextStep);
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className={cn(
        "max-h-[85vh] overflow-hidden flex flex-col",
        currentStep === 4 ? "max-w-7xl w-[98vw]" : "max-w-2xl"
      )}>
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Create ORA Plan
          </DialogTitle>

          {/* Progress Indicator - PSSR pattern */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Step {currentStep} of {STEPS.length}</span>
              <span className="text-muted-foreground">{STEPS[currentStep - 1].title}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            
            {/* Step Indicators */}
            <div className="flex justify-between mt-2">
              {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isVisited = visitedSteps.has(step.id);
                const isComplete = step.id < currentStep || (isVisited && isStepComplete(step.id));
                const isClickable = isVisited || step.id <= currentStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      "flex flex-col items-center flex-1 transition-colors",
                      isClickable ? "cursor-pointer" : "cursor-default",
                      isActive
                        ? "text-primary"
                        : isComplete
                          ? "text-primary/60"
                          : "text-muted-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : isComplete
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/30 bg-muted/30"
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center hidden sm:block">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {/* Phase context banner - shown from Step 2 onwards */}
        {currentStep >= 2 && phase && (
          <div className="mx-1 mb-0 px-4 py-2.5 rounded-lg bg-muted/60 border border-border/50">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Phase</p>
                <p className="text-sm font-semibold text-foreground/90">{phase}</p>
              </div>
              {projectType && currentStep >= 3 && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Type</p>
                    <p className="text-sm font-semibold text-foreground/90">{projectType.replace('_', ' ')}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-auto py-2">
          {currentStep === 1 && <StepPhaseSelection phase={phase} onPhaseChange={setPhase} />}
          {currentStep === 2 && <StepProjectType projectType={projectType} onProjectTypeChange={setProjectType} />}
          {currentStep === 3 && (
            catalogLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading activities...</span>
              </div>
            ) : (
              <StepActivities activities={activities} phase={phase} onActivitiesChange={setActivities} />
            )
          )}
          {currentStep === 4 && <StepSchedule activities={activities} onActivitiesChange={setActivities} />}
          {currentStep === 5 && <StepReview phase={phase} projectType={projectType} activities={activities} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => currentStep > 1 ? handleBack() : handleClose()}
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>

            {draftPlanId && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                Delete Draft
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="gap-1.5 text-muted-foreground"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save & Exit</>
              )}
            </Button>

            {currentStep < 5 ? (
              <Button onClick={handleNext} disabled={!validateStep(currentStep)}>
                Next
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  'Submit for Approval'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Delete Draft ORA Plan?
          </AlertDialogTitle>
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
              if (draftPlanId) {
                deletePlan(draftPlanId);
                setDeleteDialogOpen(false);
                handleClose();
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
};
