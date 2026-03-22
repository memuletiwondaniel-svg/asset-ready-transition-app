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
  projectCode?: string; // DP-xxx format from handover plans
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

  // Step 1 state — these hold dms_projects.code and dms_plants.code
  const [selectedProjectCode, setSelectedProjectCode] = useState('');
  const [selectedPlantCode, setSelectedPlantCode] = useState('');
  const [dmsPlatforms, setDmsPlatforms] = useState<string[]>([]);

  // Track whether values were auto-resolved
  const [projectAutoDetected, setProjectAutoDetected] = useState(false);
  const [plantAutoDetected, setPlantAutoDetected] = useState(false);

  // Resolve project code (DP-xxx) → dms_projects.code and plant on wizard open
  useEffect(() => {
    if (!open) return;

    // Reset state on open
    setCurrentStep(0);
    setSelections({});
    setDmsPlatforms([]);
    setProjectAutoDetected(false);
    setPlantAutoDetected(false);
    setSelectedProjectCode('');
    setSelectedPlantCode('');

    if (!projectCode) {
      console.log('[CriticalDocsWizard] No project context available — skipping auto-detection');
      return;
    }

    const resolveContext = async () => {
      try {
        // Step 1: Resolve DP-xxx → dms_projects.code and get project name for plant disambiguation
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
          setProjectAutoDetected(true);
          console.log(`[CriticalDocsWizard] Auto-resolved project ${projectCode} → DMS code ${dmsProject.code}`);
        } else {
          console.warn(`[CriticalDocsWizard] No DMS project found for project_id="${projectCode}"`);
        }

        // Step 2: If plant code was passed directly, validate it
        if (plantCode) {
          const { data: dmsPlant } = await (supabase as any)
            .from('dms_plants')
            .select('code')
            .eq('code', plantCode)
            .eq('is_active', true)
            .maybeSingle();

          if (dmsPlant?.code) {
            setSelectedPlantCode(dmsPlant.code);
            setPlantAutoDetected(true);
            console.log(`[CriticalDocsWizard] Auto-resolved plant code ${plantCode}`);
            return;
          }
        }

        // Step 3: Resolve plant via projects table → plant table → dms_plants
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
                setPlantAutoDetected(true);
                console.log(`[CriticalDocsWizard] Auto-resolved plant "${plant.name}" → DMS plant ${resolved.code} (${resolved.plant_name})`);
              } else {
                console.warn(`[CriticalDocsWizard] No unique DMS plant match for plant "${plant.name}" and project "${dmsProjectName}" — leaving empty`);
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

  // When user manually changes project code, clear plant auto-detection
  const handleProjectCodeChange = useCallback((code: string) => {
    setSelectedProjectCode(code);
    setProjectAutoDetected(false);
    // Auto-resolve plant when project changes
    resolveProjectPlant(code);
  }, []);

  // Shared plant resolution: uses DMS project name to disambiguate when plant.name is generic (e.g. "CS")
  const resolveDmsPlant = async (plantName: string, dmsProjectName: string): Promise<{ code: string; plant_name: string } | null> => {
    const { data: dmsPlants } = await (supabase as any)
      .from('dms_plants')
      .select('code, plant_name')
      .eq('is_active', true)
      .order('display_order');

    if (!dmsPlants?.length) return null;

    // 1. Exact code match (e.g. plant.name = "BNGL", dms_plants.code = "BNGL")
    const exactMatch = dmsPlants.find((dp: any) => dp.code.toLowerCase() === plantName.toLowerCase());
    if (exactMatch) return exactMatch;

    // 2. Filter all dms_plants whose name contains the plant category
    const candidates = dmsPlants.filter((dp: any) =>
      dp.plant_name?.toLowerCase().includes(plantName.toLowerCase())
    );

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // 3. Multiple candidates — use DMS project name to disambiguate
    // Extract meaningful words from project name (3+ chars) for matching
    if (dmsProjectName) {
      const projectWords = dmsProjectName.toLowerCase().split(/[\s\-\/,]+/).filter((w: string) => w.length >= 3);

      // Score each candidate by how many project name words appear in the plant name
      let bestScore = 0;
      let bestCandidate: any = null;

      for (const candidate of candidates) {
        const pName = candidate.plant_name?.toLowerCase() || '';
        let score = 0;
        for (const word of projectWords) {
          if (pName.includes(word)) score++;
        }
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate && bestScore > 0) {
        console.log(`[CriticalDocsWizard] Disambiguated plant using project name: "${dmsProjectName}" → ${bestCandidate.code} (${bestCandidate.plant_name}) [score=${bestScore}/${projectWords.length}]`);
        return bestCandidate;
      }
    }

    // 4. Try "Multi" prefix match as last resort (e.g. C000 Multi Compressor Stations)
    const multiMatch = candidates.find((dp: any) =>
      dp.plant_name?.toLowerCase().includes('multi')
    );
    if (multiMatch) return multiMatch;

    // 5. Cannot disambiguate — do NOT default to first match (that causes wrong data)
    console.warn(`[CriticalDocsWizard] ${candidates.length} DMS plants match "${plantName}" but cannot disambiguate. Candidates:`, candidates.map((c: any) => `${c.code}:${c.plant_name}`));
    return null;
  };

  const resolveProjectPlant = async (dmsProjectCode: string) => {
    try {
      setPlantAutoDetected(false);
      setSelectedPlantCode('');

      // Get dms_projects.project_id and project_name for this code
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
        setPlantAutoDetected(true);
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
        className="max-w-[600px] sm:max-w-[600px] w-full h-auto max-h-[85vh] p-0 flex flex-col gap-0 z-[150] overflow-hidden"
        overlayClassName="z-[140]"
      >
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Critical Documents Wizard</DialogTitle>
            <DialogDescription>Identify critical documents for VCR delivery</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        {/* Modern Stepper Header */}
        <div className="px-6 pt-4 pb-3 border-b bg-muted/20">
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
        <div className="flex-1 overflow-y-auto min-h-0">
          {currentStep === 0 && (
            <ProjectContextStep
              projectCode={selectedProjectCode}
              onProjectCodeChange={handleProjectCodeChange}
              plantCode={selectedPlantCode}
              onPlantCodeChange={(code) => {
                setSelectedPlantCode(code);
                setPlantAutoDetected(false);
              }}
              dmsPlatforms={dmsPlatforms}
              onDmsPlatformsChange={setDmsPlatforms}
              projectAutoDetected={projectAutoDetected}
              plantAutoDetected={plantAutoDetected}
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
