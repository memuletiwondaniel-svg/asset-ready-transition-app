import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
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
  { id: 'context', label: 'Project Context', number: 1 },
  { id: 'selection', label: 'Document Selection', number: 2 },
  { id: 'review', label: 'Review & Confirm', number: 3 },
];

export const CriticalDocsWizard: React.FC<CriticalDocsWizardProps> = ({
  open, onOpenChange, vcrId, projectCode, plantCode, handoverPlanId,
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 state
  const [selectedProjectCode, setSelectedProjectCode] = useState(projectCode || '');
  const [selectedPlantCode, setSelectedPlantCode] = useState(plantCode || '');
  const [dmsPlatforms, setDmsPlatforms] = useState<string[]>([]);

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
      // Save DMS platforms to handover plan
      if (handoverPlanId) {
        await (supabase as any)
          .from('p2a_handover_plans')
          .update({ dms_platforms: dmsPlatforms })
          .eq('id', handoverPlanId);
      }

      // Bulk insert all selected documents
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
      // Reset
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
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] max-h-[800px] p-0 flex flex-col gap-0 z-[150] overflow-hidden">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Critical Documents Wizard</DialogTitle>
            <DialogDescription>Identify critical documents for VCR delivery</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        {/* Horizontal Stepper */}
        <div className="px-6 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-center gap-0">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isComplete = idx < currentStep;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => idx < currentStep && setCurrentStep(idx)}
                    disabled={idx > currentStep}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all text-sm',
                      isActive && 'bg-primary/10 text-primary font-semibold',
                      isComplete && 'text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
                      !isActive && !isComplete && 'text-muted-foreground/50'
                    )}
                  >
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shrink-0',
                      isActive && 'border-primary bg-primary text-primary-foreground',
                      isComplete && 'border-emerald-500 bg-emerald-500 text-white',
                      !isActive && !isComplete && 'border-muted-foreground/30'
                    )}>
                      {isComplete ? <Check className="w-3.5 h-3.5" /> : step.number}
                    </span>
                    <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className={cn(
                      'w-4 h-4 mx-1 shrink-0',
                      idx < currentStep ? 'text-emerald-400' : 'text-muted-foreground/30'
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
                Back
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button size="sm" onClick={handleNext} disabled={!canProceed()}>
                Continue
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
