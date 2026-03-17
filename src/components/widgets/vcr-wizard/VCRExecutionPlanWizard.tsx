import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/enhanced-auth/AuthProvider';
import { ProjectIdBadge } from '@/components/ui/project-id-badge';
import {
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  ScrollText,
  UserCheck,
} from 'lucide-react';
import { ProjectVCR } from '@/hooks/useProjectVCRs';

import { WizardShell, WizardShellStep } from '../shared/WizardShell';
import { VCRItemsStep } from './steps/VCRItemsStep';
import { TrainingStep } from './steps/TrainingStep';
import { ProceduresStep } from './steps/ProceduresStep';
import { CriticalDocumentsStep } from './steps/CriticalDocumentsStep';
import { OperationalRegistersStep } from './steps/OperationalRegistersStep';
import { LogsheetsStep } from './steps/LogsheetsStep';
import { InspectionTestPlanStep } from './steps/InspectionTestPlanStep';
import { ApproversStep } from './steps/ApproversStep';

interface VCRExecutionPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcr: ProjectVCR;
  projectCode?: string;
}

const STEPS: WizardShellStep[] = [
  { id: 'items', label: 'VCR Items', icon: ClipboardCheck, color: 'text-violet-500' },
  { id: 'training', label: 'Training', icon: GraduationCap, color: 'text-blue-500' },
  { id: 'procedures', label: 'Procedures', icon: BookOpen, color: 'text-emerald-500' },
  { id: 'critical-docs', label: 'Critical Documents', icon: FileText, color: 'text-amber-500' },
  { id: 'registers', label: 'Op. Registers', icon: ClipboardList, color: 'text-cyan-500' },
  { id: 'logsheets', label: 'Logsheets', icon: ScrollText, color: 'text-indigo-500' },
  { id: 'itp', label: 'Inspection Test Plan', icon: ClipboardList, color: 'text-orange-500' },
  { id: 'approvers', label: 'Approvers', icon: UserCheck, color: 'text-primary' },
];

export const VCRExecutionPlanWizard: React.FC<VCRExecutionPlanWizardProps> = ({
  open,
  onOpenChange,
  vcr,
  projectCode,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasPromotedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setVisitedSteps(new Set([0]));
      hasPromotedRef.current = false;
    }
  }, [open]);

  // Auto-promote associated task from "pending" → "in_progress"
  useEffect(() => {
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
  }, [open, user?.id, vcr.id, queryClient]);

  // Query step data counts for completion
  const { data: stepCounts = {} } = useQuery({
    queryKey: ['vcr-wizard-step-counts', vcr.id],
    queryFn: async () => {
      const [training, procedures, criticalDocs, registers, logsheets] = await Promise.all([
        (supabase as any).from('p2a_vcr_training').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_procedures').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_critical_docs').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_register_selections').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
        (supabase as any).from('p2a_vcr_logsheets').select('id', { count: 'exact', head: true }).eq('handover_point_id', vcr.id),
      ]);
      return {
        1: training.count || 0,
        2: procedures.count || 0,
        3: criticalDocs.count || 0,
        4: registers.count || 0,
        5: logsheets.count || 0,
      } as Record<number, number>;
    },
    enabled: open,
    refetchInterval: 5000,
  });

  const isStepComplete = (idx: number): boolean => {
    if (idx === 0 || idx === 6 || idx === 7) return visitedSteps.has(idx);
    return (stepCounts[idx] || 0) > 0;
  };

  const isStepWarning = (idx: number): boolean => {
    return visitedSteps.has(idx) && !isStepComplete(idx);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setVisitedSteps(prev => new Set([...prev, step]));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <VCRItemsStep vcrId={vcr.id} />;
      case 1: return <TrainingStep vcrId={vcr.id} />;
      case 2: return <ProceduresStep vcrId={vcr.id} />;
      case 3: return <CriticalDocumentsStep vcrId={vcr.id} />;
      case 4: return <OperationalRegistersStep vcrId={vcr.id} />;
      case 5: return <LogsheetsStep vcrId={vcr.id} />;
      case 6: return <InspectionTestPlanStep vcrId={vcr.id} projectCode={projectCode} />;
      case 7: return <ApproversStep vcrId={vcr.id} />;
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

  const vcrColor = getVCRColor(vcr.vcr_code);

  const headerContent = (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/40 to-indigo-500/40 rounded-xl blur-sm" />
          <div className="relative p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500">
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
        </div>
        {shortVcrId && (
          <Badge
            className="text-[10px] font-mono font-semibold border-0 px-1.5 py-0 shrink-0"
            style={{
              backgroundColor: vcrColor?.background,
              color: vcrColor?.border,
            }}
          >
            {shortVcrId}
          </Badge>
        )}
      </div>
      <h2 className="text-sm font-semibold line-clamp-2 leading-tight">{vcr.name}</h2>
      <p className="text-[10px] text-muted-foreground">Develop VCR Plan</p>
    </div>
  );

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="VCR Plan Wizard"
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={goToStep}
      isStepComplete={isStepComplete}
      isStepWarning={isStepWarning}
      header={headerContent}
      navigation={{
        onBack: handleBack,
        onNext: handleNext,
        onSaveAndExit: () => onOpenChange(false),
        canGoBack: currentStep > 0,
        saveAndExitLabel: 'Save & Exit',
        submitLabel: 'Done',
        onSubmit: currentStep === STEPS.length - 1 ? () => onOpenChange(false) : undefined,
      }}
    >
      <div className="p-3 sm:p-6">
        {renderStep()}
      </div>
    </WizardShell>
  );
};
