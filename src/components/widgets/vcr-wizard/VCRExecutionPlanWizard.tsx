import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Package,
  FileText,
  Layers,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectVCR } from '@/hooks/useProjectVCRs';
import { VCRItemsStep } from './steps/VCRItemsStep';
import { TrainingStep } from './steps/TrainingStep';
import { ProceduresStep } from './steps/ProceduresStep';
import { DeliverablesStep } from './steps/DeliverablesStep';
import { OperationalRegistersStep } from './steps/OperationalRegistersStep';
import { SystemsStep } from './steps/SystemsStep';

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
  { id: 'deliverables', label: 'Deliverables', icon: Package, color: 'text-amber-500' },
  { id: 'registers', label: 'Log Sheets & Registers', icon: FileText, color: 'text-cyan-500' },
  { id: 'systems', label: 'Systems', icon: Layers, color: 'text-orange-500' },
];

export const VCRExecutionPlanWizard: React.FC<VCRExecutionPlanWizardProps> = ({
  open,
  onOpenChange,
  vcr,
  projectCode,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setVisitedSteps(new Set([0]));
    }
  }, [open]);

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
        return <DeliverablesStep vcrId={vcr.id} />;
      case 4:
        return <OperationalRegistersStep vcrId={vcr.id} />;
      case 5:
        return <SystemsStep vcrId={vcr.id} projectCode={projectCode} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[min(90vh,780px)] flex flex-col p-0 gap-0 [&>button]:hidden">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>VCR Execution Plan Wizard</DialogTitle>
            <DialogDescription>Configure the VCR execution plan step by step</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        <div className="flex h-full overflow-hidden">
          {/* Left Sidebar - Step Navigation */}
          <div className="w-56 shrink-0 bg-muted/30 border-r border-border/60 p-4 flex flex-col">
            <div className="mb-6">
              <h3 className="text-sm font-semibold truncate">{vcr.name}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Execution Plan Setup</p>
            </div>

            <div className="flex-1 space-y-1">
              {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                const isVisited = visitedSteps.has(idx);
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
                        : isVisited
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-muted text-muted-foreground'
                    )}>
                      {isVisited && !isActive ? <Check className="w-3 h-3" /> : idx + 1}
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
          <div className="flex-1 flex flex-col min-w-0">
            {/* Step Header */}
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
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
            <ScrollArea className="flex-1">
              <div className="p-6">
                {renderStep()}
              </div>
            </ScrollArea>

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
                        : visitedSteps.has(idx)
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
    case 3: return 'List Tier 1 & Tier 2 deliverables';
    case 4: return 'Define operational log sheets and registers to be developed';
    case 5: return 'Review and edit systems mapped to this VCR';
    default: return '';
  }
}
