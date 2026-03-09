import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Loader2, Check, AlertCircle, Save, Trash2, CheckCircle, XCircle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useQueryClient } from '@tanstack/react-query';
import { useORPPlans } from '@/hooks/useORPPlans';
import { generateLeafTasks } from '@/utils/generateLeafTasks';

interface ORAActivityPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** When provided, loads this specific plan (regardless of status) instead of searching for drafts */
  planId?: string;
  /** 'review' mode opens on Step 4, adjusts labels, hides delete draft */
  mode?: 'create' | 'review';
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
  open, onOpenChange, projectId, planId: externalPlanId, mode = 'create', onSuccess
}) => {
  const isReviewMode = mode === 'review';
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
  const [reviewComment, setReviewComment] = useState('');
  const [isApprovingOrRejecting, setIsApprovingOrRejecting] = useState(false);
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
    setReviewComment('');
  };

  // Check for existing draft on open (or load specific plan in review mode)
  useEffect(() => {
    if (!open) return;

    const loadPlan = async () => {
      // If an explicit planId is provided (review mode), load that plan and reconstruct state
      if (externalPlanId) {
        // Load plan + deliverables + approvals
        const [planRes, deliverablesRes, approvalsRes] = await Promise.all([
          (supabase as any).from('orp_plans').select('id, phase, wizard_state, status').eq('id', externalPlanId).single(),
          (supabase as any).from('orp_plan_deliverables')
            .select('id, deliverable_id, start_date, end_date, estimated_manhours, status')
            .eq('orp_plan_id', externalPlanId),
          supabase.from('orp_approvals')
            .select('approver_user_id, approver_role, status')
            .eq('orp_plan_id', externalPlanId),
        ]);

        const plan = planRes.data;
        if (!plan) return;

        setDraftPlanId(plan.id);

        // If wizard_state exists (e.g. draft), use it directly
        if (plan.wizard_state) {
          const ws = plan.wizard_state as any;
          setPhase(ws.phase || '');
          setProjectType(ws.projectType || '');
          setActivities(ws.activities || []);
          setApprovers(ws.approvers || []);
          if (isReviewMode) {
            setCurrentStep(4);
            setVisitedSteps(new Set([1, 2, 3, 4, 5, 6]));
          } else {
            setCurrentStep(ws.currentStep || 1);
            setVisitedSteps(new Set(ws.visitedSteps || [1]));
          }
          return;
        }

        // Reconstruct state from DB records (wizard_state was cleared on submission)
        // Reverse-map orp_phase to wizard phase
        const ORP_TO_PHASE: Record<string, string> = {
          'ASSESS_SELECT': 'ASSESS',
          'DEFINE': 'DEFINE',
          'EXECUTE': 'EXECUTE',
        };
        setPhase(ORP_TO_PHASE[plan.phase] || 'ASSESS');

        // Reconstruct activities from deliverables + catalog
        const deliverables = deliverablesRes.data || [];
        if (deliverables.length > 0) {
          const catalogIds = deliverables.map((d: any) => d.deliverable_id);
          // Fetch matching catalog entries
          const { data: catalogEntries } = await (supabase as any)
            .from('ora_activity_catalog')
            .select('*')
            .in('id', catalogIds);

          if (catalogEntries) {
            const reconstructed: WizardActivity[] = catalogEntries.map((cat: any) => {
              const del = deliverables.find((d: any) => d.deliverable_id === cat.id);
              return {
                id: cat.id,
                activityCode: cat.activity_code,
                activity: cat.activity,
                description: cat.description,
                phaseId: cat.phase_id,
                parentActivityId: cat.parent_activity_id,
                durationHigh: cat.duration_high,
                durationMed: cat.duration_med,
                durationLow: cat.duration_low,
                selected: true,
                durationDays: del?.estimated_manhours ? Math.round(del.estimated_manhours / 8) : cat.duration_med,
                startDate: del?.start_date || '',
                endDate: del?.end_date || '',
                predecessorIds: [],
              };
            });
            setActivities(reconstructed);
          }
        }

        // Reconstruct approvers
        const approvalRows = approvalsRes.data || [];
        if (approvalRows.length > 0) {
          const userIds = approvalRows.map((a: any) => a.approver_user_id).filter(Boolean);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, position, avatar_url')
            .in('user_id', userIds);

          const reconstructedApprovers: WizardApprover[] = approvalRows
            .filter((a: any) => a.approver_user_id)
            .map((a: any) => {
              const profile = profiles?.find((p: any) => p.user_id === a.approver_user_id);
              return {
                user_id: a.approver_user_id,
                full_name: profile?.full_name || 'Unknown',
                position: profile?.position || null,
                avatar_url: profile?.avatar_url || null,
                role_label: a.approver_role,
              };
            });
          setApprovers(reconstructedApprovers);
        }

        // In review mode, start on Schedule step with all steps visited
        if (isReviewMode) {
          setCurrentStep(4);
          setVisitedSteps(new Set([1, 2, 3, 4, 5, 6]));
        }
        return;
      }

      // Default: search for existing draft by project
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
    loadPlan();
  }, [open, projectId, externalPlanId, isReviewMode]);

  // Sync wizard step progress to user_tasks so Kanban cards show real-time %
  const TOTAL_ORA_STEPS = STEPS.length; // 6
  const syncOraWizardProgress = useCallback(async (step: number, isSubmitted = false) => {
    const percentage = isSubmitted ? 100 : Math.round(((step - 1) / TOTAL_ORA_STEPS) * 100);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Find the ORA creation task for this project
      const { data: tasks } = await supabase
        .from('user_tasks')
        .select('id, metadata')
        .eq('user_id', user.user.id)
        .eq('type', 'task')
        .limit(100);

      const oraTask = tasks?.find((t: any) => {
        const meta = t.metadata as Record<string, any>;
        return meta?.source === 'ora_workflow' && meta?.project_id === projectId && meta?.action === 'create_ora_plan';
      });

      if (oraTask) {
        await supabase
          .from('user_tasks')
          .update({
            metadata: {
              ...((oraTask.metadata as Record<string, any>) || {}),
              completion_percentage: percentage,
            } as any,
            status: isSubmitted ? 'completed' : percentage > 0 ? 'in_progress' : 'pending',
          })
          .eq('id', oraTask.id);

        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      }
    } catch (err) {
      console.error('Failed to sync ORA wizard progress:', err);
    }
  }, [projectId, queryClient]);

  // Silent auto-save of wizard state (no toast, no close) - skip in review mode
  const autoSaveWizardState = useCallback(async () => {
    if (isReviewMode) return; // Don't auto-save in review mode
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
        .update({ phase: orpPhase, wizard_state: wizardState })
        .eq('id', draftPlanId);
      if (error) throw error;
    } else {
      // Check for ANY existing active plan for this project (draft or otherwise)
      const { data: existingPlans } = await (supabase as any)
        .from('orp_plans')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .limit(1);

      if (existingPlans && existingPlans.length > 0) {
        // Reuse the existing plan — update its wizard_state
        const existingId = existingPlans[0].id;
        setDraftPlanId(existingId);
        const { error } = await (supabase as any)
          .from('orp_plans')
          .update({ phase: orpPhase, wizard_state: wizardState, status: 'DRAFT' })
          .eq('id', existingId);
        if (error) throw error;
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
      if (plan) setDraftPlanId(plan.id);
    }
  }, [phase, projectType, activities, approvers, currentStep, visitedSteps, draftPlanId, projectId]);

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      await autoSaveWizardState();
      syncOraWizardProgress(currentStep);
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

  // Review mode: save changes to wizard_state without re-inserting deliverables
  const handleReviewSave = async () => {
    if (!draftPlanId) return;
    try {
      setIsSaving(true);
      const wizardState = {
        phase,
        projectType,
        activities,
        approvers,
        currentStep: 4,
        visitedSteps: [1, 2, 3, 4, 5, 6],
      };
      const { error } = await (supabase as any)
        .from('orp_plans')
        .update({ wizard_state: wizardState })
        .eq('id', draftPlanId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
      toast({ title: 'Changes saved', description: 'Your edits to the ORA Plan have been saved.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Materialize wizard_state activities into ora_plan_activities table
  const materializeActivities = async (planIdToMaterialize: string) => {
    const { data: planData } = await (supabase as any)
      .from('orp_plans')
      .select('wizard_state, project_id')
      .eq('id', planIdToMaterialize)
      .single();

    if (!planData?.wizard_state) return;

    const ws = planData.wizard_state as any;
    const wsActivities = (ws.activities || []).filter((a: any) => a.selected);
    if (wsActivities.length === 0) return;

    // Check if already materialized
    const { data: existing } = await (supabase as any)
      .from('ora_plan_activities')
      .select('id')
      .eq('orp_plan_id', planIdToMaterialize)
      .limit(1);
    if (existing && existing.length > 0) return;

    // Sort parents before children
    const sorted = [...wsActivities].sort((a: any, b: any) => {
      const depthA = (a.activityCode || '').split('.').length;
      const depthB = (b.activityCode || '').split('.').length;
      return depthA - depthB;
    });

    const idMap = new Map<string, string>();
    for (const act of sorted) {
      const parentDbId = act.parentActivityId ? idMap.get(act.parentActivityId) || null : null;
      const { data: inserted } = await (supabase as any)
        .from('ora_plan_activities')
        .insert({
          orp_plan_id: planIdToMaterialize,
          name: act.activity || act.name || 'Unnamed',
          activity_code: act.activityCode || '',
          description: act.description || null,
          source_type: 'catalog',
          source_ref_id: act.id?.startsWith('custom-') ? null : act.id,
          source_ref_table: act.id?.startsWith('custom-') ? null : 'ora_activity_catalog',
          parent_id: parentDbId,
          start_date: act.startDate || null,
          end_date: act.endDate || null,
          duration_days: act.durationDays || act.durationMed || null,
          status: 'NOT_STARTED',
          completion_percentage: 0,
        })
        .select('id')
        .single();
      if (inserted) idMap.set(act.id, inserted.id);
    }

    // Add "Create P2A Plan" activity assigned to Sr. ORA Engineer
    const { data: projectTeam } = await supabase
      .from('project_team_members')
      .select('user_id, role')
      .eq('project_id', planData.project_id);

    const srOraEngr = (projectTeam || []).find((m: any) => {
      const role = (m.role || '').toLowerCase();
      return role.includes('snr ora') || role.includes('senior ora') || role.includes('sr. ora') || role.includes('sr ora');
    });

    await (supabase as any)
      .from('ora_plan_activities')
      .insert({
        orp_plan_id: planIdToMaterialize,
        name: 'Create P2A Plan',
        activity_code: 'P2A-01',
        description: 'Create the Project to Asset (P2A) handover plan.',
        source_type: 'system',
        start_date: new Date().toISOString().split('T')[0],
        status: 'NOT_STARTED',
        completion_percentage: 0,
        assigned_to: srOraEngr?.user_id || null,
      });

    // Generate all leaf-level tasks (idempotent, uses generateLeafTasks utility)
    await generateLeafTasks(planIdToMaterialize);
  };

  // Review mode: approve or reject the plan
  const handleReviewDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!draftPlanId) return;
    try {
      setIsApprovingOrRejecting(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Save any schedule edits first
      await handleReviewSave();

      // Update the approver's record in orp_approvals
      const { error: approvalError } = await supabase
        .from('orp_approvals')
        .update({
          status: decision,
          comments: reviewComment || null,
          approved_at: new Date().toISOString(),
        } as any)
        .eq('orp_plan_id', draftPlanId)
        .eq('approver_user_id', user.user.id);

      if (approvalError) throw approvalError;

      // Check if ALL approvers have approved → update plan status
      const { data: allApprovals } = await supabase
        .from('orp_approvals')
        .select('status')
        .eq('orp_plan_id', draftPlanId);

      const allApproved = allApprovals?.every((a: any) => a.status === 'APPROVED');
      const anyRejected = allApprovals?.some((a: any) => a.status === 'REJECTED');

      if (anyRejected) {
        await (supabase as any)
          .from('orp_plans')
          .update({ status: 'DRAFT' })
          .eq('id', draftPlanId);
      } else if (allApproved) {
        // Materialize activities from wizard_state into ora_plan_activities
        await materializeActivities(draftPlanId);

        await (supabase as any)
          .from('orp_plans')
          .update({ status: 'APPROVED' })
          .eq('id', draftPlanId);
      }

      // Mark the reviewer's task as completed
      await supabase
        .from('user_tasks')
        .update({ status: 'completed' } as any)
        .eq('user_id', user.user.id)
        .eq('type', 'ora_plan_review')
        .filter('metadata->>plan_id', 'eq', draftPlanId);

      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });

      toast({
        title: decision === 'APPROVED' ? 'Plan Approved' : 'Plan Rejected',
        description: decision === 'APPROVED'
          ? 'The ORA Plan has been approved.'
          : 'The ORA Plan has been rejected and returned to draft.',
      });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsApprovingOrRejecting(false);
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
        // Upgrade draft to PENDING_APPROVAL (preserve wizard_state for reviewers)
        const wizardState = {
          phase,
          projectType,
          activities,
          approvers,
          currentStep,
          visitedSteps: Array.from(visitedSteps),
        };
        const { error } = await (supabase as any)
          .from('orp_plans')
          .update({
            phase: orpPhase,
            status: 'PENDING_APPROVAL',
            wizard_state: wizardState,
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

      // Fetch project info for task descriptions
      const { data: projectInfo } = await supabase
        .from('projects')
        .select('project_id_prefix, project_id_number, project_title')
        .eq('id', projectId)
        .single();
      const projectCode = projectInfo
        ? `${projectInfo.project_id_prefix || ''}-${projectInfo.project_id_number || ''}`.trim()
        : '';
      const projectTitle = projectInfo?.project_title || '';
      const projectName = projectCode ? `${projectCode} - ${projectTitle}` : projectId;

      // Mark the Snr ORA Engr's creation task as completed
      const { error: taskCompleteError } = await supabase
        .from('user_tasks')
        .update({ status: 'completed' })
        .eq('user_id', user.user.id)
        .eq('type', 'task')
        .filter('metadata->>source', 'eq', 'ora_workflow')
        .filter('metadata->>project_id', 'eq', projectId);

      if (taskCompleteError) {
        console.warn('Could not complete creation task:', taskCompleteError.message);
      }

      // Write approvers to orp_approvals table
      if (approvers.length > 0 && planId) {
        // Clear any existing approvals for this plan to avoid duplicates on resubmit
        await supabase
          .from('orp_approvals')
          .delete()
          .eq('orp_plan_id', planId);

        const approvalRows = approvers.map(a => ({
          orp_plan_id: planId!,
          approver_role: a.role_label,
          approver_user_id: a.user_id,
          status: 'PENDING' as any,
        }));

        const { error: approvalError } = await supabase
          .from('orp_approvals')
          .insert(approvalRows);

        if (approvalError) {
          console.warn('Could not create approval records:', approvalError.message);
        }
      }

      // Create review tasks for ALL selected approvers using security-definer RPC
      // (Direct inserts are blocked by RLS when creating tasks for other users)
      for (const approver of approvers) {
        // Check if a pending review task already exists for this user + plan
        const { data: existingTask } = await supabase
          .from('user_tasks')
          .select('id')
          .eq('user_id', approver.user_id)
          .eq('type', 'ora_plan_review')
          .filter('metadata->>plan_id', 'eq', planId!)
          .not('status', 'in', '("completed","cancelled")')
          .limit(1);

        if (existingTask && existingTask.length > 0) continue; // Skip duplicates

        const { error: rpcError } = await supabase.rpc('create_user_task', {
          p_user_id: approver.user_id,
          p_title: `Review ORA Plan – ${projectName}`,
          p_description: `You have been assigned as ${approver.role_label} to review and approve the ORA Plan for project ${projectName}.`,
          p_type: 'ora_plan_review',
          p_status: 'pending',
          p_priority: 'High',
          p_metadata: {
            source: 'ora_workflow',
            project_id: projectId,
            plan_id: planId,
            project_code: projectCode,
            project_name: projectTitle,
            approver_role: approver.role_label,
            action: 'review_ora_plan',
          },
        });

        if (rpcError) {
          console.error(`Failed to create task for ${approver.full_name}:`, rpcError.message);
        }
      }

      // Invalidate caches so task disappears from tray immediately
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['orp-plans'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });

      await syncOraWizardProgress(STEPS.length, true);
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
      setActivities([]);
    }
    setVisitedSteps(prev => new Set([...prev, nextStep]));
    setCurrentStep(nextStep);
    autoSaveWizardState();
    syncOraWizardProgress(nextStep);
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
    autoSaveWizardState();
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
          "max-h-full sm:max-h-[85vh] overflow-hidden flex flex-col",
          (currentStep === 4 || isReviewMode) ? "sm:max-w-7xl sm:w-[98vw]" : "sm:max-w-2xl"
        )}>
        <DialogHeader className={cn("border-b pb-4", isReviewMode && "pb-2")}>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <CalendarCheck className="w-5 h-5 text-primary" />
            {isReviewMode ? 'Review ORA Plan' : 'Create ORA Plan'}
          </DialogTitle>

          {/* Progress Indicator - hidden in review mode */}
          {!isReviewMode && (
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
          )}
        </DialogHeader>

        {/* Phase context banner - shown from Step 2 onwards */}
        {!isReviewMode && currentStep >= 2 && phase && (
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
          {isReviewMode ? (
            <StepSchedule activities={activities} onActivitiesChange={setActivities} isReviewMode />
          ) : (
            <>
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
              {currentStep === 5 && <StepApprovers approvers={approvers} onApproversChange={setApprovers} projectId={projectId} />}
              {currentStep === 6 && <StepReview phase={phase} projectType={projectType} activities={activities} />}
            </>
          )}
        </div>

        {/* Review mode: Comments + Approve/Reject/Save */}
        {isReviewMode && (
          <div className="pt-4 border-t space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Comments <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="Add any comments or notes about your review..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="min-h-[48px] h-12 resize-none"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleReviewSave}
                  disabled={isSaving || isApprovingOrRejecting}
                  className="gap-1.5 text-muted-foreground"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReviewDecision('REJECTED')}
                  disabled={isApprovingOrRejecting || isSaving}
                  className="gap-2"
                >
                  {isApprovingOrRejecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() => handleReviewDecision('APPROVED')}
                  disabled={isApprovingOrRejecting || isSaving}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isApprovingOrRejecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - create mode only */}
        {!isReviewMode && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentStep > 1) {
                    handleBack();
                  } else {
                    handleClose();
                  }
                }}
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

              {currentStep < 6 ? (
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
        )}
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
