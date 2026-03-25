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

  const totalSelected = (selections['__all__'] || []).length;

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
      return bestCandidate;
    }

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
      const selectedDocIds = selections['__all__'] || [];
      if (selectedDocIds.length === 0) return;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      const tenantId = user?.user_metadata?.tenant_id || null;

      // Fetch full doc type info for selected docs
      const { data: selectedDocTypes } = await supabase
        .from('dms_document_types')
        .select('id, code, document_name, tier, discipline_code, document_scope, is_mdr, is_vendor_document, package_tag, po_number, vendor_po_sequence')
        .in('id', selectedDocIds);

      if (!selectedDocTypes || selectedDocTypes.length === 0) throw new Error('Could not load document type data');

      // Update DMS platforms on handover plan
      if (handoverPlanId) {
        await (supabase as any)
          .from('p2a_handover_plans')
          .update({ dms_platforms: dmsPlatforms })
          .eq('id', handoverPlanId);
      }

      // 1. Save to vcr_document_requirements
      const vcrDocInserts = selectedDocTypes.map((doc: any) => ({
        vcr_id: vcrId,
        document_type_id: doc.id,
        document_scope: doc.document_scope || 'discipline',
        package_tag: doc.package_tag || null,
        discipline_code: doc.discipline_code || null,
        is_mdr: doc.is_mdr || false,
        po_number: doc.po_number || null,
        vendor_po_sequence: doc.vendor_po_sequence || null,
        status: 'required',
        identified_by: userId || null,
        tenant_id: tenantId,
      }));

      const { error: vcrDocError } = await (supabase as any)
        .from('vcr_document_requirements')
        .insert(vcrDocInserts);
      if (vcrDocError) throw vcrDocError;

      // 2. Also insert into p2a_vcr_critical_docs for backward compat
      const critDocInserts = selectedDocIds.map(docTypeId => ({
        handover_point_id: vcrId,
        system_id: null,
        dms_document_type_id: docTypeId,
        status: 'not_started',
        rlmu_status: 'not_required',
      }));

      if (critDocInserts.length > 0) {
        const { error: critError } = await (supabase as any)
          .from('p2a_vcr_critical_docs')
          .insert(critDocInserts);
        if (critError) console.warn('p2a_vcr_critical_docs insert warning:', critError.message);
      }

      // 3. Queue BOD/BDEP docs for Phase 9 ingestion
      const isScopeDocFn = (doc: any): boolean => {
        const name = (doc.document_name || '').toLowerCase();
        return name.includes('basis of design') || name.includes('bdep') || name.includes('feed') || (doc.code || '').toUpperCase().includes('BOD');
      };

      const scopeDocs = selectedDocTypes.filter((doc: any) => isScopeDocFn(doc));
      if (scopeDocs.length > 0) {
        // Resolve project_id from project code
        let resolvedProjectId: string | null = null;
        if (selectedProjectCode) {
          const { data: dmsProj } = await (supabase as any)
            .from('dms_projects')
            .select('project_id')
            .eq('code', selectedProjectCode)
            .maybeSingle();

          if (dmsProj?.project_id) {
            const projMatch = dmsProj.project_id.match(/^([A-Z]+)-(.+)$/i);
            if (projMatch) {
              const { data: proj } = await supabase
                .from('projects')
                .select('id')
                .eq('project_id_prefix', projMatch[1])
                .eq('project_id_number', projMatch[2])
                .maybeSingle();
              resolvedProjectId = proj?.id || null;
            }
          }
        }

        const ingestInserts = scopeDocs.map((doc: any) => {
          const name = (doc.document_name || '').toLowerCase();
          const isBod = name.includes('basis of design') || (doc.code || '').toUpperCase().includes('BOD');
          return {
            document_type_id: doc.id,
            project_id: resolvedProjectId,
            vcr_id: vcrId,
            priority: isBod ? 1 : 2,
            status: 'pending',
            tenant_id: tenantId,
          };
        });

        const { error: ingestError } = await (supabase as any)
          .from('document_ingest_queue')
          .insert(ingestInserts);
        if (ingestError) console.warn('document_ingest_queue insert warning:', ingestError.message);
      }

      // 4. Create task for Senior ORA Engineer
      const disciplineCount = new Set(selectedDocTypes.map((d: any) => d.discipline_code).filter(Boolean)).size;
      const packageCount = new Set(selectedDocTypes.map((d: any) => d.package_tag).filter(Boolean)).size;

      // Resolve project and find Sr. ORA Engineer
      let resolvedProjectIdForTask: string | null = null;
      if (selectedProjectCode) {
        const { data: dmsProj } = await (supabase as any)
          .from('dms_projects')
          .select('project_id')
          .eq('code', selectedProjectCode)
          .maybeSingle();

        if (dmsProj?.project_id) {
          const projMatch = dmsProj.project_id.match(/^([A-Z]+)-(.+)$/i);
          if (projMatch) {
            const { data: proj } = await supabase
              .from('projects')
              .select('id')
              .eq('project_id_prefix', projMatch[1])
              .eq('project_id_number', projMatch[2])
              .maybeSingle();
            resolvedProjectIdForTask = proj?.id || null;
          }
        }
      }

      if (resolvedProjectIdForTask) {
        const { data: projectTeam } = await supabase
          .from('project_team_members')
          .select('user_id, role')
          .eq('project_id', resolvedProjectIdForTask);

        const srOraEngr = (projectTeam || []).find((m: any) => {
          const role = (m.role || '').toLowerCase();
          return role.includes('snr ora') || role.includes('senior ora') || role.includes('sr. ora') || role.includes('sr ora');
        });

        if (srOraEngr?.user_id) {
          const vcrCode = (await (supabase as any)
            .from('p2a_handover_points')
            .select('code')
            .eq('id', vcrId)
            .maybeSingle()).data?.code || 'VCR';

          try {
            await supabase.rpc('create_user_task', {
              p_user_id: srOraEngr.user_id,
              p_title: `Document register confirmed for ${vcrCode} — ${selectedDocIds.length} documents identified across ${disciplineCount} disciplines and ${packageCount} packages. Next: verify document status in DMS.`,
              p_description: `${selectedDocIds.length} documents identified: ${selectedDocTypes.filter((d: any) => d.tier === 'Tier 1').length} Tier 1, ${selectedDocTypes.filter((d: any) => d.tier === 'Tier 2').length} Tier 2. ${scopeDocs.length} scope documents queued for knowledge ingestion.`,
              p_type: 'vcr_delivery_plan',
              p_priority: 'Medium',
              p_metadata: { vcr_id: vcrId, document_count: selectedDocIds.length } as any,
            });
          } catch (taskErr) {
            console.warn('[CriticalDocsWizard] Task creation warning:', taskErr);
          }
        }
      }

      // 5. Log activity
      try {
        await (supabase as any)
          .from('orp_activity_log')
          .insert({
            action: 'document_register_confirmed',
            description: `Document register confirmed for VCR ${vcrId}: ${selectedDocIds.length} documents identified`,
            entity_type: 'vcr_document_requirements',
            entity_id: vcrId,
            performed_by: userId,
            tenant_id: tenantId,
          });
      } catch (logErr) {
        console.warn('[CriticalDocsWizard] Activity log warning:', logErr);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vcr-critical-docs', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-wizard-step-counts', vcrId] });
      queryClient.invalidateQueries({ queryKey: ['vcr-document-requirements', vcrId] });

      toast.success(
        `${selectedDocIds.length} documents confirmed — ${selectedDocTypes.filter((d: any) => d.tier === 'Tier 1').length} Tier 1, ${selectedDocTypes.filter((d: any) => d.tier === 'Tier 2').length} Tier 2${scopeDocs.length > 0 ? `, ${scopeDocs.length} queued for knowledge ingestion` : ''}`
      );
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save documents');
    } finally {
      setIsSaving(false);
    }
  }, [selections, vcrId, handoverPlanId, dmsPlatforms, queryClient, onOpenChange, selectedProjectCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[600px] sm:max-w-[600px] w-full h-[80vh] max-h-[80vh] p-0 flex flex-col gap-0 z-[150] overflow-hidden"
        overlayClassName="z-[140]"
      >
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Critical Documents Wizard</DialogTitle>
            <DialogDescription>Identify critical documents for VCR delivery</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        {/* Stepper Header */}
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
                      {isComplete ? <Check className="w-3 h-3" /> : idx + 1}
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
        <div className="overflow-y-auto min-h-0 flex-1">
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
              projectCode={selectedProjectCode}
              plantCode={selectedPlantCode}
              dmsPlatforms={dmsPlatforms}
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
