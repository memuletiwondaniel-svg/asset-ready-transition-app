import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, Loader2, ArrowRight } from 'lucide-react';
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
  { id: 'context', label: 'Project Context' },
  { id: 'selection', label: 'Document Selection' },
  { id: 'review', label: 'Review & Confirm' },
];

export const CriticalDocsWizard: React.FC<CriticalDocsWizardProps> = ({
  open, onOpenChange, vcrId, projectCode, plantCode, handoverPlanId,
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1 state
  const [selectedProjectCode, setSelectedProjectCode] = useState('');
  const [selectedPlantCode, setSelectedPlantCode] = useState('');
  const [dmsPlatforms, setDmsPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    setCurrentStep(0);
    setSelections({});
    setDmsPlatforms([]);
    setSelectedProjectCode('');
    setSelectedPlantCode('');

    if (!projectCode) {
      console.log('[CriticalDocsWizard] No project context available — skipping auto-detection');
      return;
    }

    const resolveContext = async () => {
      try {
        const { data: dmsProject } = await (supabase as any)
          .from('dms_projects')
          .select('code, project_name')
          .eq('project_id', projectCode)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        const dmsProjectName = dmsProject?.project_name || '';

        if (dmsProject?.code) {
          setSelectedProjectCode(dmsProject.code);
          console.log(`[CriticalDocsWizard] Auto-resolved project ${projectCode} → DMS code ${dmsProject.code}`);
        }

        if (plantCode) {
          const { data: dmsPlant } = await (supabase as any)
            .from('dms_plants')
            .select('code')
            .eq('code', plantCode)
            .eq('is_active', true)
            .maybeSingle();

          if (dmsPlant?.code) {
            setSelectedPlantCode(dmsPlant.code);
            return;
          }
        }

        const match = projectCode.match(/^([A-Z]+)-(.+)$/i);
        if (match) {
          const [, prefix, number] = match;
          const { data: project } = await supabase
            .from('projects')
            .select('plant_id')
            .eq('project_id_prefix', prefix)
            .eq('project_id_number', number)
            .maybeSingle();

          if (project?.plant_id) {
            const { data: plant } = await (supabase as any)
              .from('plant')
              .select('name')
              .eq('id', project.plant_id)
              .maybeSingle();

            if (plant?.name) {
              const resolved = await resolveDmsPlant(plant.name, dmsProjectName);
              if (resolved) {
                setSelectedPlantCode(resolved.code);
                console.log(`[CriticalDocsWizard] Auto-resolved plant "${plant.name}" → DMS plant ${resolved.code} (${resolved.plant_name})`);
              }
            }
          }
        }
      } catch (err) {
        console.error('[CriticalDocsWizard] Auto-detection failed:', err);
      }
    };

    resolveContext();
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

  const handleProjectCodeChange = useCallback((code: string) => {
    setSelectedProjectCode(code);
    resolveProjectPlant(code);
  }, []);

  /**
   * Plant resolution strategy:
   * 1) Exact code match
   * 2) Keyword matching with generic terms removed
   * 3) Tie-break toward plant-level names (fewer unmatched words)
   * 4) Return null when confidence is too low
   */
  const resolveDmsPlant = async (plantName: string, dmsProjectName: string): Promise<{ code: string; plant_name: string } | null> => {
    const { data: dmsPlants } = await (supabase as any)
      .from('dms_plants')
      .select('code, plant_name')
      .eq('is_active', true)
      .order('display_order');

    if (!dmsPlants?.length) return null;

    const exactCodeMatch = dmsPlants.find((dp: any) => dp.code.toLowerCase() === plantName.toLowerCase());
    if (exactCodeMatch) return exactCodeMatch;

    const genericWords = new Set([
      'new', 'compression', 'station', 'project', 'facility', 'unit',
      'installation', 'pipeline', 'replacement', 'gas', 'lp', 'at', 'cs'
    ]);

    const rawContextWords = `${dmsProjectName} ${plantName}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word: string) => word.length >= 3);

    const contextWords = Array.from(new Set(rawContextWords.filter((word: string) => !genericWords.has(word))));
    if (!contextWords.length) return null;

    let bestCandidate: any = null;
    let bestScore = 0;
    let bestUnmatchedWords = Number.POSITIVE_INFINITY;

    for (const candidate of dmsPlants) {
      const candidateWords = (candidate.plant_name || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word: string) => word.length >= 3);

      const matchedWordCount = contextWords.filter((word: string) => candidateWords.includes(word)).length;
      const unmatchedWordCount = Math.max(candidateWords.length - matchedWordCount, 0);

      const isBetterCandidate =
        matchedWordCount > bestScore ||
        (matchedWordCount === bestScore && unmatchedWordCount < bestUnmatchedWords) ||
        (matchedWordCount === bestScore && unmatchedWordCount === bestUnmatchedWords && (candidate.plant_name || '').length < (bestCandidate?.plant_name || '').length);

      if (isBetterCandidate) {
        bestCandidate = candidate;
        bestScore = matchedWordCount;
        bestUnmatchedWords = unmatchedWordCount;
      }
    }

    const minimumScore = Math.min(2, contextWords.length);

    if (bestCandidate && bestScore >= minimumScore) {
      console.log(`[CriticalDocsWizard] Resolved plant: "${dmsProjectName}" + "${plantName}" → ${bestCandidate.code} (${bestCandidate.plant_name}) [score=${bestScore}, unmatched=${bestUnmatchedWords}]`);
      return bestCandidate;
    }

    console.warn(`[CriticalDocsWizard] No reliable DMS plant match for plant="${plantName}", project="${dmsProjectName}"`);
    return null;
  };

  const resolveProjectPlant = async (dmsProjectCode: string) => {
    try {
      setSelectedPlantCode('');

      const { data: dmsProject } = await (supabase as any)
        .from('dms_projects')
        .select('project_id, project_name')
        .eq('code', dmsProjectCode)
        .maybeSingle();

      if (!dmsProject?.project_id) return;

      const match = dmsProject.project_id.match(/^([A-Z]+)-(.+)$/i);
      if (!match) return;

      const [, prefix, number] = match;
      const { data: project } = await supabase
        .from('projects')
        .select('plant_id')
        .eq('project_id_prefix', prefix)
        .eq('project_id_number', number)
        .maybeSingle();

      if (!project?.plant_id) return;

      const { data: plant } = await (supabase as any)
        .from('plant')
        .select('name')
        .eq('id', project.plant_id)
        .maybeSingle();

      if (!plant?.name) return;

      const resolved = await resolveDmsPlant(plant.name, dmsProject.project_name || '');
      if (resolved) {
        setSelectedPlantCode(resolved.code);
      }
    } catch (err) {
      console.warn('[CriticalDocsWizard] Plant resolution failed:', err);
    }
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to save documents');
    } finally {
      setIsSaving(false);
    }
  }, [selections, vcrId, handoverPlanId, dmsPlatforms, queryClient, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[600px] sm:max-w-[600px] w-full h-auto max-h-[90vh] p-0 flex flex-col gap-0 z-[150] overflow-hidden"
        overlayClassName="z-[140]"
      >
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Critical Documents Wizard</DialogTitle>
            <DialogDescription>Identify critical documents for VCR delivery</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        {/* Modern Stepper Header */}
        <div className="px-6 pt-3 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-center max-w-sm mx-auto">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isComplete = idx < currentStep;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => idx < currentStep && setCurrentStep(idx)}
                    disabled={idx > currentStep}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 transition-all shrink-0',
                      isComplete && 'bg-primary border-primary text-primary-foreground',
                      isActive && 'border-primary bg-background text-primary',
                      !isActive && !isComplete && 'border-muted-foreground/30 bg-background text-muted-foreground/50'
                    )}>
                      {isComplete ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span className={cn(
                      'text-[11px] whitespace-nowrap',
                      isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={cn(
                      'flex-1 h-px mx-3 mb-5 transition-colors shrink-0 min-w-[40px]',
                      idx < currentStep ? 'bg-primary' : 'bg-border'
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="overflow-y-auto min-h-0 flex-shrink-1">
          {currentStep === 0 && (
            <ProjectContextStep
              projectCode={selectedProjectCode}
              onProjectCodeChange={handleProjectCodeChange}
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
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
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