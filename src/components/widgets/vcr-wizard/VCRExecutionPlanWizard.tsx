import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  ScrollText,
  UserCheck,
  Wrench,
  Package,
} from 'lucide-react';
import { ProjectVCR } from '@/hooks/useProjectVCRs';

// (palette + hash helpers removed — header pill no longer uses them after
//  the phase-aware status pill refactor.)

import { WizardShell, WizardShellStep } from '../shared/WizardShell';
import { WizardSubtitle } from '../shared/WizardSubtitle';
import { SystemsStep } from './steps/SystemsStep';
import { VCRItemsStep } from './steps/VCRItemsStep';
import { TrainingStep } from './steps/TrainingStep';
import { ProceduresStep } from './steps/ProceduresStep';
import { CriticalDocumentsStep } from './steps/CriticalDocumentsStep';
import { RegistersLogsheetsStep } from './steps/RegistersLogsheetsStep';
import { InspectionTestPlanStep } from './steps/InspectionTestPlanStep';
import { ApproversStep, VCRApprover } from './steps/ApproversStep';
import { MaintenanceSystemsStep } from './steps/MaintenanceSystemsStep';
import { VCRConfirmationStep } from './steps/VCRConfirmationStep';
import { Step8ReviewModeWrapper } from './Step8ReviewModeWrapper';
import { Layers, CheckCircle2, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVCRHydrocarbonStatus } from '@/hooks/useVCRHydrocarbonStatus';
import { useVCRPlanRollup, vcrPlanPillLabel } from '@/hooks/useVCRPlanApprovalTasks';
import { VCRWizardModeContext, type VCRReviewPayload } from './wizardModeContext';
import {
  VCRReviewDecisionStep,
  VCRReviewDecisionProvider,
  VCRReviewDecisionFooterButtons,
} from './VCRReviewDecisionStep';
import { Button } from '@/components/ui/button';
import { buildVcrSubmitApproverPayload } from '@/lib/buildVcrSubmitPayload';
import { toast } from 'sonner';

interface VCRExecutionPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcr: ProjectVCR;
  projectCode?: string;
  projectName?: string;
  /** When set, the wizard runs in read-only review mode for an approver. */
  reviewPayload?: VCRReviewPayload | null;
}

// Step order — Witness & Hold Points (formerly Inspection Test Plan)
// moved from position 7 to position 2 so users define inspection scope
// alongside Systems, before the support artefacts.
// Internal id 'itp' is intentionally preserved — UI label only changed.
const STEPS: WizardShellStep[] = [
  { id: 'systems',             label: 'Systems',                 icon: Layers,         color: 'text-orange-500' },
  { id: 'itp',                 label: 'Witness & Hold Points',   icon: Eye,            color: 'text-orange-500' },
  { id: 'training',            label: 'Training',                icon: GraduationCap,  color: 'text-blue-500' },
  { id: 'procedures',          label: 'Procedures',              icon: BookOpen,       color: 'text-emerald-500' },
  { id: 'critical-docs',       label: 'Critical Documents',      icon: FileText,       color: 'text-amber-500' },
  { id: 'registers-logsheets', label: 'Registers & Logsheets',   icon: ClipboardList,  color: 'text-cyan-500' },
  { id: 'cmms-spares',         label: 'Maintenance Systems',     icon: Wrench,         color: 'text-amber-500' },
  { id: 'approvers',           label: 'Approvers',               icon: UserCheck,      color: 'text-primary' },
  { id: 'checklist',           label: 'VCR Checklist',           icon: ClipboardCheck, color: 'text-violet-500' },
  { id: 'review',              label: 'Review and Submit',       icon: CheckCircle2,   color: 'text-emerald-500' },
];

const TOTAL_STEPS = STEPS.length; // 10
const DRAFT_COMPLETE_PROGRESS = 83;

export const VCRExecutionPlanWizard: React.FC<VCRExecutionPlanWizardProps> = ({
  open,
  onOpenChange,
  vcr,
  projectCode,
  projectName,
  reviewPayload,
}) => {
  const isReview = !!reviewPayload;
  const { data: rollup } = useVCRPlanRollup(vcr.id);
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [step9Ready, setStep9Ready] = useState(false);
  const [submitRequestId, setSubmitRequestId] = useState(0);
  const [approversRoster, setApproversRoster] = useState<VCRApprover[]>([]);
  const rosterSeedSigRef = useRef<string | null>(null);
  const [rosterDirty, setRosterDirty] = useState(false);
  const handleRosterChange = useCallback((next: VCRApprover[]) => {
    setApproversRoster(next);
    const sig = JSON.stringify(next.map(a => ({ r: a.role_key || a.role_name, u: a.user_id || null })));
    if (rosterSeedSigRef.current === null) {
      rosterSeedSigRef.current = sig;
      return;
    }
    if (sig !== rosterSeedSigRef.current) setRosterDirty(true);
  }, []);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasPromotedRef = useRef(false);

  // Resolve project code/name from the parent P2A plan when not supplied by caller.
  const { data: resolvedProject } = useQuery({
    queryKey: ['vcr-wizard-project-context', vcr.id],
    enabled: open && (!projectCode || !projectName),
    queryFn: async () => {
      const client = supabase as any;
      const { data: hp } = await client
        .from('p2a_handover_points')
        .select('handover_plan_id')
        .eq('id', vcr.id)
        .maybeSingle();
      if (!hp?.handover_plan_id) return null;
      const { data: plan } = await client
        .from('p2a_handover_plans')
        .select('project_id')
        .eq('id', hp.handover_plan_id)
        .maybeSingle();
      if (!plan?.project_id) return null;
      const { data: project } = await client
        .from('projects')
        .select('project_id_prefix, project_id_number, project_title')
        .eq('id', plan.project_id)
        .maybeSingle();
      if (!project) return null;
      const code = [project.project_id_prefix, project.project_id_number]
        .filter(Boolean).join('-');
      return { project_code: code, project_title: project.project_title };
    },
  });

  const effectiveProjectCode = projectCode || resolvedProject?.project_code || '';
  const effectiveProjectName = projectName || resolvedProject?.project_title || '';

  // ── Progress sync (mirrors P2A pattern) — DISABLED in review mode ──
  const syncVCRProgress = useCallback(async (progress: number) => {
    if (isReview) return; // review = read-only, no telemetry writes
    if (!user?.id) return;
    const clampedProgress = Math.min(progress, DRAFT_COMPLETE_PROGRESS);
    const activityStatus = clampedProgress >= DRAFT_COMPLETE_PROGRESS ? 'IN_PROGRESS' : 'IN_PROGRESS';

    try {
      // 1. Update ora_plan_activities row for this VCR delivery plan
      await (supabase as any)
        .from('ora_plan_activities')
        .update({
          completion_percentage: clampedProgress,
          status: activityStatus,
        })
        .eq('source_type', 'vcr_delivery_plan')
        .eq('source_ref_id', vcr.id);

      // 2. Update user_tasks row for this VCR delivery plan
      const { data: tasks } = await (supabase as any)
        .from('user_tasks')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('type', 'vcr_delivery_plan')
        .filter('metadata->>vcr_id', 'eq', vcr.id)
        .limit(1);

      if (tasks?.[0]) {
        const existingMeta = (tasks[0].metadata || {}) as Record<string, any>;
        await (supabase as any)
          .from('user_tasks')
          .update({
            progress_percentage: clampedProgress,
            metadata: { ...existingMeta, completion_percentage: clampedProgress },
          })
          .eq('id', tasks[0].id);
      }

      // 3. Invalidate caches so Kanban & Gantt reflect changes
      queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-orp-plans'] });
    } catch (err) {
      console.error('[VCR Progress Sync] Failed:', err);
    }
  }, [isReview, user?.id, vcr.id, queryClient]);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setVisitedSteps(new Set([0]));
      hasPromotedRef.current = false;
    }
  }, [open]);

  // Body-level review class so portal'd Sheets / Dialogs inherit the
  // read-only CSS too (steps that open detail sheets render outside the
  // wizard's DOM subtree). Cleans up on close / mode change.
  // Sub-mode: ora_edit only when the viewer is the Phase-1 actionable
  // approver (= ORA Lead by construction in the rollup gate). Reads phase +
  // my_actionable_row_id only — never role_label.
  const subMode: 'ora_edit' | 'review_only' | null = (() => {
    if (!isReview || !reviewPayload) return null;
    if (
      rollup?.phase === 1 &&
      rollup?.my_actionable_row_id &&
      rollup.my_actionable_row_id === reviewPayload.approverRowId
    ) {
      return 'ora_edit';
    }
    return 'review_only';
  })();

  // Body-level class so portal'd Sheets / Dialogs inherit the right mode.
  // ora_edit swaps OUT vcr-review-mode and IN vcr-ora-edit-mode, so the
  // read-only CSS rules go inert and authoring affordances reappear.
  useEffect(() => {
    if (!open || !isReview) return;
    const cls = subMode === 'ora_edit' ? 'vcr-ora-edit-mode' : 'vcr-review-mode';
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [open, isReview, subMode]);

  // Auto-promote associated task from "pending" → "in_progress" (skip in review)
  useEffect(() => {
    if (isReview) return;
    if (!open || !user?.id || hasPromotedRef.current) return;
    hasPromotedRef.current = true;

    (async () => {
      const { data: tasks } = await (supabase as any)
        .from('user_tasks')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('type', 'vcr_delivery_plan')
        .eq('status', 'pending')
        .filter('metadata->>vcr_id', 'eq', vcr.id)
        .limit(1);

      if (tasks?.[0]) {
        await (supabase as any)
          .from('user_tasks')
          .update({ status: 'in_progress' })
          .eq('id', tasks[0].id);
        queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
      }
    })();
  }, [isReview, open, user?.id, vcr.id, queryClient]);

  // Query step data counts for completion. Current order:
  // 0:Systems 1:W&HP(itp) 2:Training 3:Procedures 4:Critical Docs
  // 5:Registers+Logsheets 6:CMMS+Spares 7:Approvers 8:VCR Checklist 9:Review
  const { data: stepCounts = {} } = useQuery({
    queryKey: ['vcr-wizard-step-counts', vcr.id],
    queryFn: async () => {
      const [systems, itp, training, procedures, criticalDocs, registers, logsheets, maintenance] = await Promise.all([
        (supabase as any).from('p2a_handover_point_systems').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_itp_activities').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_training').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_procedures').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_critical_docs').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_register_selections').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_logsheets').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_maintenance_deliverables').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id).eq('is_applicable', true),
      ]);
      return {
        0: systems.count || 0,
        1: itp.count || 0,
        2: training.count || 0,
        3: procedures.count || 0,
        4: criticalDocs.count || 0,
        5: (registers.count || 0) + (logsheets.count || 0),
        6: maintenance.count || 0,
      } as Record<number, number>;
    },
    enabled: open,
    refetchInterval: 5000,
  });

  const isStepComplete = (idx: number): boolean => {
    // Review mode: indicators are reviewer-coverage only — green once visited,
    // neutral otherwise. Non-gating (decision footer governs progress).
    if (isReview) {
      return visitedSteps.has(idx);
    }
    // Visit-based completion for steps without count data:
    // Approvers (7), VCR Checklist (8), Review (9).
    if (idx === 7 || idx === 8 || idx === 9) {
      return visitedSteps.has(idx) && idx !== currentStep;
    }
    return (stepCounts[idx] || 0) > 0;
  };

  const isStepOptional = (idx: number): boolean => {
    // Witness & Hold Points (1) and Registers & Logsheets (5) are optional — never show amber warning when empty.
    return idx === 1 || idx === 5;
  };

  const isStepWarning = (idx: number): boolean => {
    // Review mode never shows amber "skipped mandatory" — coverage is informational.
    if (isReview) return false;
    return visitedSteps.has(idx) && !isStepComplete(idx) && !isStepOptional(idx);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setVisitedSteps(prev => new Set([...prev, step]));
    // Sync progress based on furthest step reached
    const progress = Math.round(((step + 1) / TOTAL_STEPS) * DRAFT_COMPLETE_PROGRESS);
    syncVCRProgress(progress);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const handleSaveAndExit = () => {
    // Sync current progress before closing
    const progress = Math.round(((currentStep + 1) / TOTAL_STEPS) * DRAFT_COMPLETE_PROGRESS);
    syncVCRProgress(progress);
    onOpenChange(false);
  };

  const handleDone = () => {
    // Mark as draft complete (83%)
    syncVCRProgress(DRAFT_COMPLETE_PROGRESS);
    onOpenChange(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <SystemsStep vcrId={vcr.id} projectCode={effectiveProjectCode} />;
      case 1: return <InspectionTestPlanStep vcrId={vcr.id} projectCode={effectiveProjectCode} />;
      case 2: return <TrainingStep vcrId={vcr.id} />;
      case 3: return <ProceduresStep vcrId={vcr.id} />;
      case 4: return <CriticalDocumentsStep vcrId={vcr.id} projectCode={effectiveProjectCode} />;
      case 5: return <RegistersLogsheetsStep vcrId={vcr.id} />;
      case 6: return <MaintenanceSystemsStep vcrId={vcr.id} />;
      case 7: return <Step8ReviewModeWrapper vcrId={vcr.id} onApproversChange={handleRosterChange} />;
      case 8: return <VCRItemsStep vcrId={vcr.id} />;
      case 9:
        return isReview && reviewPayload ? (
          <VCRReviewDecisionStep
            payload={reviewPayload}
            onDecided={() => onOpenChange(false)}
          />
        ) : (
          <VCRConfirmationStep vcrId={vcr.id} vcrName={vcr.name} vcrCode={vcr.vcr_code} onNavigateToStep={goToStep} onReadyChange={setStep9Ready} submitRequestId={submitRequestId} approversRoster={approversRoster} onSubmitSuccess={() => onOpenChange(false)} />
        );
      default: return null;
    }
  };

  // Generate short VCR ID
  const shortVcrId = (() => {
    const code = vcr.vcr_code;
    if (!code) return '';
    const match = code.match(/^VCR-[A-Z0-9]+-0*(\d+)$/);
    if (match) return `VCR-${match[1].padStart(2, '0')}`;
    return code.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
  })();

  // Phase-aware status pill — driven by useVCRPlanRollup so a submitted plan
  // no longer reads "Draft". Fix applies in BOTH create and review modes
  // (the old vcr.status fallback was buggy in both).
  // (rollup hoisted to top of component for subMode derivation)
  const pill = rollup ? vcrPlanPillLabel(rollup) : null;
  const pillToneCls: Record<string, string> = {
    muted: 'bg-muted text-muted-foreground border-border',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    destructive: 'bg-red-600 text-white border-red-700',
  };
  const statusLabel = pill
    ? { label: pill.label, cls: pillToneCls[pill.tone] }
    : { label: 'Loading…', cls: 'bg-muted text-muted-foreground border-border' };

  const { data: hcStatus } = useVCRHydrocarbonStatus(vcr.id);
  const stripeMeta = (() => {
    if (!hcStatus || hcStatus.status === 'UNKNOWN') {
      return {
        cls: 'bg-muted-foreground/40',
        tooltip: 'HC status not yet determined — add systems to set.',
      };
    }
    if (hcStatus.status === 'HC') {
      return {
        cls: 'bg-amber-500',
        tooltip: `Hydrocarbon VCR (${hcStatus.systemCount} linked system${hcStatus.systemCount === 1 ? '' : 's'} include hydrocarbon service)`,
      };
    }
    return {
      cls: 'bg-blue-500',
      tooltip: `Non-hydrocarbon VCR (${hcStatus.systemCount} linked system${hcStatus.systemCount === 1 ? '' : 's'}, none flagged hydrocarbon)`,
    };
  })();

  const titlePrefix = isReview ? 'Review VCR Plan' : 'Create VCR Plan';
  // U5: in review mode drop the subtitle prefix — the title + the single
  // status pill already convey "this is a plan under review".
  const subtitlePrefix = isReview ? undefined : titlePrefix;

  const topHeaderContent = (
    <TooltipProvider delayDuration={150}>
    <div className="flex items-stretch gap-3 py-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("self-stretch w-1.5 rounded-sm cursor-help shrink-0", stripeMeta.cls)}
            aria-label={stripeMeta.tooltip}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {stripeMeta.tooltip}
        </TooltipContent>
      </Tooltip>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
          {shortVcrId ? `${shortVcrId}: ` : ''}{vcr.name}
        </h1>
        <WizardSubtitle
          prefix={subtitlePrefix}
          code={effectiveProjectCode}
          name={effectiveProjectName}
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0 pt-1">
        <Badge variant="outline" className={cn("text-[10px] h-5 px-2", statusLabel.cls)}>
          {statusLabel.label}
        </Badge>
      </div>
    </div>
    </TooltipProvider>
  );

  // ─── ORA-edit "Save changes" (review-mode only, subMode === 'ora_edit') ──
  // Persists the current roster + (server-derived) active checklist via the
  // SAME submit_vcr_plan RPC used by the create flow. Phase-1 is safe — no
  // prerequisite approvals exist, so the reconcile guard does not trip.
  const [isSavingOra, setIsSavingOra] = useState(false);
  // Internal persist — also used by the approve-before-baseline pre-hook
  // (Step 3c). `silent=true` skips the success toast when called as a
  // pre-approve step so the user only sees the final "Plan approved" toast.
  const persistOraRoster = useCallback(async (silent = false): Promise<boolean> => {
    const approverPayload = buildVcrSubmitApproverPayload(approversRoster);
    if (approverPayload.length === 0) {
      toast.error('At least one approver with an assigned user is required.');
      return false;
    }
    setIsSavingOra(true);
    try {
      const { error } = await (supabase as any).rpc('submit_vcr_plan', {
        p_handover_point_id: vcr.id,
        p_approvers: approverPayload,
      });
      if (error) throw error;
      if (!silent) toast.success('Changes saved');
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-roster', vcr.id] });
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-approver-roster-extended', vcr.id] });
      queryClient.invalidateQueries({ queryKey: ['vcr-plan-rollup', vcr.id] });
      queryClient.invalidateQueries({ queryKey: ['vcr-review-readiness', vcr.id] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcr.id] });
      // U8 freshness — VCR card lifecycle pill must reflect "In approval"
      // after roster persistence without requiring a hard refresh.
      queryClient.invalidateQueries({ queryKey: ['project-vcrs'] });
      return true;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Cannot remove approvers with recorded decisions')) {
        toast.error('Cannot remove an approver who already decided. Restore them to continue.');
      } else {
        toast.error(`Save failed: ${msg}`);
      }
      return false;
    } finally {
      setIsSavingOra(false);
    }
  }, [approversRoster, queryClient, vcr.id]);

  const handleOraSaveChanges = useCallback(async () => {
    if (isSavingOra) return; // single-flight
    await persistOraRoster(false);
  }, [isSavingOra, persistOraRoster]);

  // Approve-before-baseline pre-hook (Step 3c). Phase-1 ORA-edit only.
  // B1 — skip submit_vcr_plan when the roster wasn't actually edited. The DB
  // roster is canonical and the baseline snapshot reads live state, so an
  // unedited approval should bypass the (empty-payload) submit entirely.
  const preApprovePersist = useCallback(async (): Promise<boolean> => {
    if (subMode !== 'ora_edit') return true;
    if (!rosterDirty) return true;
    return await persistOraRoster(true);
  }, [subMode, rosterDirty, persistOraRoster]);

  // U14 — autosave the roster on close when an ORA-Lead has edited it.
  // Content edits already auto-persist via their step components; this keeps
  // the roster consistent without a "discard or save" modal (which couldn't
  // truthfully discard the already-saved content edits anyway).
  const handleReviewClose = useCallback(async () => {
    if (isReview && subMode === 'ora_edit' && rosterDirty) {
      try {
        await persistOraRoster(true);
      } catch {
        // persistOraRoster surfaces its own toast; still allow close.
      }
    }
    onOpenChange(false);
  }, [isReview, subMode, rosterDirty, persistOraRoster, onOpenChange]);

  const handleShellOpenChange = useCallback(
    (next: boolean) => {
      if (!next && isReview) {
        void handleReviewClose();
        return;
      }
      onOpenChange(next);
    },
    [isReview, handleReviewClose, onOpenChange],
  );

  // U15/U16/U17 — review footer split into LEFT (nav: Close, Prev) and
  // RIGHT (decision/forward: Next/Go-to-decision OR Approve / Request Changes).
  // Secondary buttons muted at rest, brighten on hover. Approve = solid primary.
  const isLastStep = currentStep === STEPS.length - 1;
  const mutedBtn =
    'text-muted-foreground hover:text-foreground hover:bg-accent/60';
  const reviewFooter = isReview ? (
    <div className="border-t bg-background px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
      {/* LEFT — navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReviewClose}
          className={mutedBtn}
          data-rm-safe
          data-rm-nav
        >
          Close
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0}
          className={mutedBtn}
          data-rm-safe
          data-rm-nav
        >
          ← Prev
        </Button>
      </div>
      {/* RIGHT — forward / decision */}
      <div className="flex items-center gap-2">
        {!isLastStep ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className={mutedBtn}
              data-rm-safe
              data-rm-nav
            >
              Next →
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToStep(STEPS.length - 1)}
              className={cn('gap-1.5', mutedBtn)}
              data-rm-safe
              data-rm-nav
            >
              Go to decision ▸
            </Button>
          </>
        ) : (
          <VCRReviewDecisionFooterButtons />
        )}
      </div>
    </div>
  ) : undefined;

  const wizard = (
    <WizardShell
      open={open}
      onOpenChange={handleShellOpenChange}
      dialogTitle={titlePrefix}
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={goToStep}
      isStepComplete={isStepComplete}
      isStepWarning={isStepWarning}
      isStepOptional={isStepOptional}
      header={null}
      topHeader={topHeaderContent}
      customFooter={reviewFooter}
      navigation={isReview ? undefined : {
        onBack: handleBack,
        onNext: handleNext,
        onSaveAndExit: handleSaveAndExit,
        canGoBack: currentStep > 0,
        saveAndExitLabel: 'Save & Exit',
        submitLabel: currentStep === 9 ? 'Submit for approval' : 'Done',
        onSubmit: currentStep === 9 ? () => setSubmitRequestId(n => n + 1) : undefined,
        canProceed: currentStep === 9 ? step9Ready : true,
      }}
    >
      <div
        className={cn(
          'p-3 sm:p-6 h-full min-h-0',
          // Carrier mirrors the body-class swap (Step 1) so in-wizard content
          // becomes interactive when ora_edit is active; review_only keeps
          // the read-only CSS; create mode adds no carrier class.
          subMode === 'ora_edit' && 'vcr-ora-edit-mode',
          subMode === 'review_only' && 'vcr-review-mode',
        )}
      >
        {renderStep()}
      </div>
    </WizardShell>
  );

  return (
    <VCRWizardModeContext.Provider value={{ mode: isReview ? 'review' : 'create', subMode, reviewPayload: reviewPayload ?? null }}>
      {isReview && reviewPayload ? (
        <VCRReviewDecisionProvider
          payload={reviewPayload}
          onDecided={() => onOpenChange(false)}
          preApprovePersist={preApprovePersist}
        >
          {wizard}
        </VCRReviewDecisionProvider>
      ) : (
        wizard
      )}
    </VCRWizardModeContext.Provider>
  );
};
