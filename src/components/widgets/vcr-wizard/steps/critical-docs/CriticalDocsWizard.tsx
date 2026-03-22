import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, Loader2, ArrowRight, FileSearch, ListChecks, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectContextStep } from './ProjectContextStep';
import { DocumentSelectionStep, type SystemDocSelections } from './DocumentSelectionStep';
import { ReviewConfirmStep } from './ReviewConfirmStep';

interface CriticalDocsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vcrId: string;
  projectCode?: string;
  plantCode?: string;
  handoverPlanId?: string;
}

const STEPS = [
  { id: 'context', label: 'Project Context', icon: FileSearch },
  { id: 'selection', label: 'Document Selection', icon: ListChecks },
  { id: 'review', label: 'Review & Confirm', icon: ClipboardCheck },
];

export const CriticalDocsWizard: React.FC<CriticalDocsWizardProps> = ({
  open, onOpenChange, vcrId, projectCode, plantCode, handoverPlanId,
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 state — sync from props when dialog opens
  const [selectedProjectCode, setSelectedProjectCode] = useState(projectCode || '');
  const [selectedPlantCode, setSelectedPlantCode] = useState(plantCode || '');
  const [dmsPlatforms, setDmsPlatforms] = useState<string[]>([]);

  // Sync props into state when wizard opens or props change
  useEffect(() => {
    if (open) {
      if (projectCode) setSelectedProjectCode(projectCode);
      if (plantCode) setSelectedPlantCode(plantCode);
    }
  }, [open, projectCode, plantCode]);

  // Step 2 state
  const [selections, setSelections] = useState<SystemDocSelections>({});

  const totalSelected = Object.values(selections).reduce(
    (sum, docIds) => sum + docIds.length, 0
  );

  const canProceed = () => {
    if (currentStep === 0) return !!selectedProjectCode && !!selectedPlantCode && dmsPlatforms.length > 0;
    if (currentStep === 1) return totalSelected > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleConfirm = useCallback(async () => {
    setIsSaving(true);
    try {
      if (handoverPlanId) {
        await (supabase as any)
          .from('p2a_handover_plans')
          .update({ dms_platforms: dmsPlatforms })
          .eq('id', handoverPlanId);
      }

      const inserts: any[] = [];
      for (const [systemId, docTypeIds] of Object.entries(selections)) {
        for (const docTypeId of docTypeIds) {
          inserts.push({
            handover_point_id: vcrId,
            system_id: systemId === '__all__' ? null : systemId,
            dms_document_type_id: docTypeId,
            status: 'not_started',
            rlmu_status: 'not_required',
          });
        }
      }

      if (inserts.length > 0) {
        const { error } = await (supabase as any)
          .from('p2a_vcr_critical_docs')
          .insert(inserts);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcrId] });
      toast.success(`${inserts.length} documents added successfully`);
      onOpenChange(false);
      setCurrentStep(0);
      setSelections({});
    } catch (e: any) {
      toast.error(e.message || 'Failed to save documents');
    } finally {
      setIsSaving(false);
    }
  }, [selections, vcrId, handoverPlanId, dmsPlatforms, queryClient, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-[95vw] w-full h-[88vh] max-h-[850px] p-0 flex flex-col gap-0 z-[150] overflow-hidden"
        overlayClassName="z-[140]"
      >
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Critical Documents Wizard</DialogTitle>
            <DialogDescription>Identify critical documents for VCR delivery</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        {/* Modern Stepper Header */}
        <div className="px-6 pt-5 pb-4 border-b bg-gradient-to-b from-muted/40 to-background">
          <div className="flex items-center justify-center max-w-xl mx-auto">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isComplete = idx < currentStep;
              const StepIcon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => idx < currentStep && setCurrentStep(idx)}
                    disabled={idx > currentStep}
                    className={cn(
                      'flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all text-sm group relative',
                      isActive && 'bg-primary text-primary-foreground font-semibold shadow-md',
                      isComplete && 'text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
                      !isActive && !isComplete && 'text-muted-foreground/50'
                    )}
                  >
                    <span className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0',
                      isActive && 'bg-primary-foreground/20',
                      isComplete && 'bg-emerald-100 dark:bg-emerald-900/40',
                      !isActive && !isComplete && 'bg-muted'
                    )}>
                      {isComplete ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <StepIcon className={cn('w-4 h-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground/50')} />
                      )}
                    </span>
                    <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={cn(
                      'w-8 sm:w-12 h-0.5 mx-1 rounded-full transition-colors shrink-0',
                      idx < currentStep ? 'bg-emerald-400' : 'bg-border'
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {currentStep === 0 && (
            <ProjectContextStep
              projectCode={selectedProjectCode}
              onProjectCodeChange={setSelectedProjectCode}
              plantCode={selectedPlantCode}
              onPlantCodeChange={setSelectedPlantCode}
              dmsPlatforms={dmsPlatforms}
              onDmsPlatformsChange={setDmsPlatforms}
            />
          )}
          {currentStep === 1 && (
            <DocumentSelectionStep
              vcrId={vcrId}
              selections={selections}
              onSelectionsChange={setSelections}
            />
          )}
          {currentStep === 2 && (
            <ReviewConfirmStep
              selections={selections}
              onSelectionsChange={setSelections}
              vcrId={vcrId}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {totalSelected > 0 && (
              <span className="font-medium text-foreground">{totalSelected} document{totalSelected !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button size="sm" onClick={handleNext} disabled={!canProceed()}>
                Continue
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleConfirm} disabled={isSaving || totalSelected === 0}>
                {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Confirm & Save
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
