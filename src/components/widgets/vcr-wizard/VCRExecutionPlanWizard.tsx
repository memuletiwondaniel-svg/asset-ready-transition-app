import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { ProjectVCR } from '@/hooks/useProjectVCRs';

const ID_BADGE_PALETTE = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300' },
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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

  const idColors = shortVcrId
    ? ID_BADGE_PALETTE[hashCode(shortVcrId) % ID_BADGE_PALETTE.length]
    : ID_BADGE_PALETTE[0];

  const headerContent = (
    <div className="flex flex-col gap-2 min-w-0">
      {shortVcrId && (
        <Badge
          className={cn(
            "self-start text-[11px] font-mono font-semibold border-0 px-2.5 py-0.5",
            idColors.bg, idColors.text
          )}
        >
          {shortVcrId}
        </Badge>
      )}
      <h2 className="text-sm font-black line-clamp-2 leading-tight text-foreground">{vcr.name}</h2>
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
