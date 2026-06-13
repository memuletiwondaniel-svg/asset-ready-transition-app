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
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [step9Ready, setStep9Ready] = useState(false);
  const [submitRequestId, setSubmitRequestId] = useState(0);
  const [approversRoster, setApproversRoster] = useState<VCRApprover[]>([]);
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
      case 7: return <ApproversStep vcrId={vcr.id} onApproversChange={setApproversRoster} />;
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
  const { data: rollup } = useVCRPlanRollup(vcr.id);
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
          prefix={titlePrefix}
          code={effectiveProjectCode}
          name={effectiveProjectName}
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0 pt-1">
        {isReview && (
          <Badge variant="outline" className="text-[10px] h-5 px-2 bg-blue-50 text-blue-700 border-blue-200">
            Review mode
          </Badge>
        )}
        <Badge variant="outline" className={cn("text-[10px] h-5 px-2", statusLabel.cls)}>
          {statusLabel.label}
        </Badge>
      </div>
    </div>
    </TooltipProvider>
  );

  // Review-mode custom footer: Close + Prev/Next + Decide (jumps to step 10).
  const isLastStep = currentStep === STEPS.length - 1;
  const reviewFooter = isReview ? (
    <div className="border-t bg-background px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-rm-safe data-rm-nav>
        Close
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleBack} disabled={currentStep === 0} data-rm-safe data-rm-nav>
          ← Prev
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={isLastStep} data-rm-safe data-rm-nav>
          Next →
        </Button>
        {!isLastStep && (
          <Button
            size="sm"
            onClick={() => goToStep(STEPS.length - 1)}
            className="gap-1.5"
            data-rm-safe
            data-rm-nav
          >
            Go to decision ▸
          </Button>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <VCRWizardModeContext.Provider value={{ mode: isReview ? 'review' : 'create', reviewPayload: reviewPayload ?? null }}>
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
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
      <div className={cn("p-3 sm:p-6 h-full min-h-0", isReview && "vcr-review-mode")}>
        {renderStep()}
      </div>
    </WizardShell>
    </VCRWizardModeContext.Provider>
  );
};
