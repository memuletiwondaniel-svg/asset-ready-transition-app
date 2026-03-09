import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardList,
  ScrollText,
  Check,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProjectVCR } from '@/hooks/useProjectVCRs';
import { getVCRColor } from '@/components/p2a-workspace/utils/vcrColors';
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

const STEPS = [
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
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setVisitedSteps(new Set([0]));
    }
  }, [open]);

  // Query step data counts to determine real completion
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
        1: training.count || 0,       // Training
        2: procedures.count || 0,     // Procedures
        3: criticalDocs.count || 0,   // Critical Documents
        4: registers.count || 0,      // Op. Registers
        5: logsheets.count || 0,      // Logsheets
      } as Record<number, number>;
    },
    enabled: open,
    refetchInterval: 5000,
  });

  // Steps 0 (VCR Items), 6 (ITP), 7 (Approvers) are always complete when visited
  const isStepComplete = (idx: number): boolean => {
    if (idx === 0 || idx === 6 || idx === 7) return visitedSteps.has(idx);
    return (stepCounts[idx] || 0) > 0;
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
      case 0:
        return <VCRItemsStep vcrId={vcr.id} />;
      case 1:
        return <TrainingStep vcrId={vcr.id} />;
      case 2:
        return <ProceduresStep vcrId={vcr.id} />;
      case 3:
        return <CriticalDocumentsStep vcrId={vcr.id} />;
      case 4:
        return <OperationalRegistersStep vcrId={vcr.id} />;
      case 5:
        return <LogsheetsStep vcrId={vcr.id} />;
      case 6:
        return <InspectionTestPlanStep vcrId={vcr.id} projectCode={projectCode} />;
      case 7:
        return <ApproversStep vcrId={vcr.id} />;
      default:
        return null;
    }
  };

  // Generate short VCR ID (e.g., VCR-01)
  const shortVcrId = (() => {
    const code = vcr.vcr_code;
    if (!code) return '';
    const match = code.match(/^VCR-[A-Z0-9]+-0*(\d+)$/);
    if (match) return `VCR-${match[1].padStart(2, '0')}`;
    return code.replace(/^VCR-[A-Z0-9]+-/, 'VCR-');
  })();

  const vcrColor = getVCRColor(vcr.vcr_code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[min(90vh,780px)] flex flex-col p-0 gap-0 [&>button]:hidden">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>VCR Execution Plan Wizard</DialogTitle>
            <DialogDescription>Configure the VCR execution plan step by step</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        <div className="flex h-full overflow-hidden gap-2">
          {/* Left Sidebar - Step Navigation */}
          <div className="w-56 shrink-0 bg-muted/30 border-r border-border/60 p-4 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-0.5">
                {shortVcrId && (
                  <Badge
                    className="text-[10px] font-mono font-semibold border-0 px-1.5 py-0"
                    style={{
                      backgroundColor: vcrColor?.background,
                      color: vcrColor?.border,
                    }}
                  >
                    {shortVcrId}
                  </Badge>
                )}
                <h3 className="text-sm font-semibold truncate">{vcr.name}</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Setup VCR Delivery Plan</p>
            </div>

            <div className="flex-1 space-y-1">
              {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                const isVisited = visitedSteps.has(idx);
                const isComplete = isStepComplete(idx);
                const Icon = step.icon;

                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(idx)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isVisited
                          ? 'hover:bg-muted/60 text-foreground'
                          : 'hover:bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-medium',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : isComplete
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-muted text-muted-foreground'
                    )}>
                      {isComplete && !isActive ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    <span className="truncate text-xs font-medium">{step.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Connector lines between steps */}
            <div className="mt-auto pt-4 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground">
                Step {currentStep + 1} of {STEPS.length}
              </p>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Step Header */}
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {React.createElement(STEPS[currentStep].icon, {
                  className: cn('w-5 h-5', STEPS[currentStep].color),
                })}
                <div>
                  <h2 className="text-base font-semibold">{STEPS[currentStep].label}</h2>
                  <p className="text-xs text-muted-foreground">
                    {getStepDescription(currentStep)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
                Close
              </Button>
            </div>

            {/* Step Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-6">
                {renderStep()}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-3 border-t border-border/60 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors cursor-pointer',
                      idx === currentStep
                        ? 'bg-primary'
                        : isStepComplete(idx)
                          ? 'bg-emerald-500'
                          : 'bg-muted-foreground/20'
                    )}
                    onClick={() => goToStep(idx)}
                  />
                ))}
              </div>
              {currentStep < STEPS.length - 1 ? (
                <Button size="sm" onClick={handleNext} className="gap-1.5">
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
                  Done
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getStepDescription(step: number): string {
  switch (step) {
    case 0: return 'Review, edit, add or remove VCR checklist items and assign parties';
    case 1: return 'Define training requirements for the handover';
    case 2: return 'List all procedures that need to be developed';
    case 3: return 'Select Tier 1 & Tier 2 critical documents required for this VCR';
    case 4: return 'Select operational registers to be developed or updated';
    case 5: return 'Add logsheets to be newly developed or updated';
    case 6: return 'Define witness and hold points for each system';
    case 7: return 'Review and confirm the default approvers for this VCR';
    default: return '';
  }
}
