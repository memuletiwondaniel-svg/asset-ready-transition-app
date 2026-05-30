import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useHubs } from '@/hooks/useHubs';
import { useStations } from '@/hooks/useStations';
import { usePlants } from '@/hooks/usePlants';
import { useProjectLocations } from '@/hooks/useProjectLocations';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { useProjectIdAvailability } from '@/hooks/useProjectIdAvailability';
import { Attachment } from '@/components/ui/RichTextEditor';
import WizardStepProjectInfo from './wizard/WizardStepProjectInfo';
import WizardStepProjectScope from './wizard/WizardStepProjectScope';
import WizardStepProjectTeam from './wizard/WizardStepProjectTeam';
import WizardStepMilestonesDocuments from './wizard/WizardStepMilestonesDocuments';
import WizardStepProjectReview from './wizard/WizardStepProjectReview';

interface EditProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (project: any) => void;
  project: any;
}

interface FormData {
  project_id_prefix: 'DP' | 'ST' | 'MoC' | '';
  project_id_number: string;
  project_title: string;
  region_id: string;
  hub_id: string;
  plant_id: string;
  field_id: string;
  station_id: string;
}

interface TeamMember {
  user_id: string;
  role: string;
  is_lead: boolean;
  user_name?: string;
  user_email?: string;
  avatar_url?: string;
  position?: string;
}

interface Milestone {
  id: string;
  milestone_name: string;
  milestone_date: string;
  is_scorecard_project: boolean;
  milestone_type_id?: string;
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_path?: string;
  link_url?: string;
  link_type?: string;
  file_extension?: string;
  file_size?: number;
}

const STEPS = [
  { id: 1, title: 'Project Info', description: 'Basic details' },
  { id: 2, title: 'Scope', description: 'Define scope' },
  { id: 3, title: 'Team', description: 'Assign members' },
  { id: 4, title: 'Milestones', description: 'Timeline & docs' },
  { id: 5, title: 'Review', description: 'Confirm & save' },
];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  open,
  onClose,
  onSave,
  project,
}) => {
  const queryClient = useQueryClient();
  const { updateProjectAsync } = useProjects();
  const { regions } = useProjectRegions();
  const { data: hubs = [] } = useHubs();
  const { stations } = useStations();
  const { plants } = usePlants();
  const { saveLocations } = useProjectLocations(project?.id);
  const { mutate: logActivity } = useLogActivity();

  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    project_id_prefix: 'DP',
    project_id_number: '',
    project_title: '',
    region_id: '',
    hub_id: '',
    plant_id: '',
    field_id: '',
    station_id: '',
  });
  const [scopeDescription, setScopeDescription] = useState('');
  const [scopeAttachments, setScopeAttachments] = useState<Attachment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Live duplicate check — ignore the current project's own ID
  const { conflict: rawConflict } = useProjectIdAvailability(
    formData.project_id_prefix || 'DP',
    formData.project_id_number
  );
  const idConflict =
    rawConflict && rawConflict.id !== project?.id ? rawConflict : null;

  // Hydrate from project + related rows on open
  useEffect(() => {
    if (!open || !project) return;

    setCurrentStep(1);
    setIsDirty(false);

    setFormData({
      project_id_prefix: (project.project_id_prefix as any) || 'DP',
      project_id_number: project.project_id_number || '',
      project_title: project.project_title || '',
      region_id: project.region_id || '',
      hub_id: project.hub_id || '',
      plant_id: project.plant_id || '',
      field_id: project.field_id || '',
      station_id: project.station_id || '',
    });
    setScopeDescription(project.project_scope || '');
    setScopeAttachments([]);

    (async () => {
      setIsLoadingDetails(true);
      try {
        // Team members + profiles
        const { data: teamData } = await supabase
          .from('project_team_members')
          .select('*')
          .eq('project_id', project.id);

        if (teamData && teamData.length) {
          const userIds = teamData.map((m: any) => m.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, position')
            .in('user_id', userIds);

          setTeamMembers(
            teamData.map((m: any) => {
              const p = profilesData?.find((pp: any) => pp.user_id === m.user_id);
              return {
                user_id: m.user_id,
                role: m.role,
                is_lead: !!m.is_lead,
                user_name: p?.full_name || '',
                user_email: '',
                avatar_url: p?.avatar_url || '',
                position: p?.position || '',
              };
            })
          );
        } else {
          setTeamMembers([]);
        }

        // Milestones
        const { data: milestonesData } = await supabase
          .from('project_milestones')
          .select('*')
          .eq('project_id', project.id)
          .order('milestone_date', { ascending: true });

        setMilestones(
          (milestonesData || []).map((m: any) => ({
            id: m.id,
            milestone_name: m.milestone_name,
            milestone_date: m.milestone_date,
            is_scorecard_project: !!m.is_scorecard_project,
            milestone_type_id: m.milestone_type_id || undefined,
          }))
        );

        // Documents
        const { data: documentsData } = await supabase
          .from('project_documents')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });

        setDocuments(
          (documentsData || []).map((d: any) => ({
            id: d.id,
            document_name: d.document_name,
            document_type: d.document_type,
            file_path: d.file_path || undefined,
            link_url: d.link_url || undefined,
            link_type: d.link_type || undefined,
            file_extension: d.file_extension || undefined,
            file_size: d.file_size || undefined,
          }))
        );
      } catch (err) {
        console.error('[EditProjectModal] failed to load project details', err);
      } finally {
        setIsLoadingDetails(false);
      }
    })();
  }, [open, project]);

  // Mark dirty on any meaningful change after initial hydration
  useEffect(() => {
    if (!open) return;
    setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData,
    scopeDescription,
    scopeAttachments,
    teamMembers,
    milestones,
    documents,
  ]);
  // Reset dirty flag right after hydration completes
  useEffect(() => {
    if (open && !isLoadingDetails) {
      const t = setTimeout(() => setIsDirty(false), 0);
      return () => clearTimeout(t);
    }
  }, [open, isLoadingDetails]);

  const getRegionName = () =>
    regions.find((r) => r.id === formData.region_id)?.name || null;
  const getHubName = () =>
    hubs.find((h) => h.id === formData.hub_id)?.name || null;
  const plantName = useMemo(
    () => plants.find((p) => p.id === formData.plant_id)?.name ?? null,
    [plants, formData.plant_id]
  );

  const handleFormDataChange = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.project_id_number &&
          !idConflict &&
          formData.project_title &&
          formData.region_id &&
          formData.hub_id &&
          formData.plant_id
        );
      case 2:
        return !!(scopeDescription.trim() || scopeAttachments.length > 0);
      case 3: {
        const valid = teamMembers.filter(
          (m) => m.user_id && m.user_id.trim() !== ''
        );
        const norm = (r: string) =>
          (r || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
        const hasHubLead = valid.some(
          (m) => norm(m.role) === 'project hub lead'
        );
        const hasOraEngr = valid.some((m) => {
          const r = norm(m.role);
          return (
            r === 'ora engr' ||
            r === 'ora engineer' ||
            r === 'snr ora engr' ||
            r === 'senior ora engr' ||
            r === 'senior ora engineer'
          );
        });
        return valid.length > 0 && hasHubLead && hasOraEngr;
      }
      case 4:
        return milestones.length > 0 || documents.length > 0;
      case 5:
        return false;
      default:
        return false;
    }
  };

  const handleStepClick = (target: number) => {
    if (target === currentStep) return;
    setVisitedSteps((prev) => new Set([...prev, target]));
    setCurrentStep(target);
  };

  const handleNext = () => {
    const next = Math.min(currentStep + 1, STEPS.length);
    setVisitedSteps((prev) => new Set([...prev, next]));
    setCurrentStep(next);
  };
  const handleBack = () => setCurrentStep((p) => Math.max(p - 1, 1));

  const requestClose = () => {
    if (isDirty) setShowDiscardConfirm(true);
    else onClose();
  };

  const handleSubmit = async () => {
    const requiredSteps = [1, 2, 3];
    for (const id of requiredSteps) {
      if (!isStepComplete(id)) {
        const s = STEPS.find((x) => x.id === id)!;
        toast.error(`Step ${s.id} (${s.title}) is incomplete`);
        setCurrentStep(s.id);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Update project core fields
      const updatedProject = await updateProjectAsync({
        id: project.id,
        updates: {
          project_id_prefix: formData.project_id_prefix as 'DP' | 'ST' | 'MoC',
          project_id_number: formData.project_id_number,
          project_title: formData.project_title,
          project_scope: scopeDescription || null,
          region_id: formData.region_id || null,
          hub_id: formData.hub_id || null,
          plant_id: formData.plant_id || null,
          station_id: formData.station_id || null,
        },
      });

      // 2. Locations
      if (formData.station_id) {
        await saveLocations({
          projectId: project.id,
          stationIds: [formData.station_id],
        });
      } else {
        await saveLocations({ projectId: project.id, stationIds: [] });
      }

      // 3. Team — replace
      await supabase
        .from('project_team_members')
        .delete()
        .eq('project_id', project.id);
      const validTeam = teamMembers.filter(
        (m) => m.user_id && m.user_id.trim() !== '' && m.user_id !== 'undefined'
      );
      if (validTeam.length) {
        const { error } = await supabase.from('project_team_members').insert(
          validTeam.map((m) => ({
            project_id: project.id,
            user_id: m.user_id,
            role: m.role,
            is_lead: m.is_lead || false,
          }))
        );
        if (error) throw error;
      }
      queryClient.invalidateQueries({
        queryKey: ['project-team-members', project.id],
      });

      // 4. Milestones — replace
      await supabase
        .from('project_milestones')
        .delete()
        .eq('project_id', project.id);
      const validMilestones = milestones.filter(
        (m) => m.milestone_name?.trim() && m.milestone_date
      );
      if (validMilestones.length) {
        const { error } = await supabase.from('project_milestones').insert(
          validMilestones.map((m) => ({
            project_id: project.id,
            milestone_name: m.milestone_name,
            milestone_date: m.milestone_date,
            is_scorecard_project: m.is_scorecard_project || false,
            created_by: user.id,
          }))
        );
        if (error) throw error;
      }

      // 5. Documents — replace
      await supabase
        .from('project_documents')
        .delete()
        .eq('project_id', project.id);
      const validDocs = documents.filter(
        (d) => d.document_name?.trim() && (d.file_path || d.link_url)
      );
      if (validDocs.length) {
        const { error } = await supabase.from('project_documents').insert(
          validDocs.map((d) => ({
            project_id: project.id,
            document_name: d.document_name,
            document_type: d.document_type || 'General',
            file_path: d.file_path,
            link_url: d.link_url,
            link_type: d.link_type,
            file_extension: d.file_extension,
            file_size: d.file_size,
            uploaded_by: user.id,
          }))
        );
        if (error) throw error;
      }

      logActivity({
        activityType: 'project_updated',
        description: `Updated project: ${formData.project_id_prefix}${formData.project_id_number} - ${formData.project_title}`,
        metadata: {
          project_id: `${formData.project_id_prefix}${formData.project_id_number}`,
          project_title: formData.project_title,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['projects'] });

      toast.success('Project updated successfully');
      if (onSave) onSave(updatedProject);
      else onClose();
    } catch (err: any) {
      console.error('Failed to update project:', err);
      toast.error(err?.message || 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WizardStepProjectInfo
            formData={formData}
            onFormDataChange={handleFormDataChange}
            currentProjectId={project?.id}
          />
        );
      case 2:
        return (
          <WizardStepProjectScope
            scopeDescription={scopeDescription}
            scopeAttachments={scopeAttachments}
            onScopeChange={setScopeDescription}
            onAttachmentsChange={setScopeAttachments}
          />
        );
      case 3:
        return (
          <WizardStepProjectTeam
            teamMembers={teamMembers as any}
            setTeamMembers={setTeamMembers as any}
            regionName={getRegionName()}
            hubName={getHubName()}
            hubId={formData.hub_id || null}
            plantName={plantName}
          />
        );
      case 4:
        return (
          <WizardStepMilestonesDocuments
            milestones={milestones}
            setMilestones={setMilestones}
            documents={documents}
            setDocuments={setDocuments}
          />
        );
      case 5:
        return (
          <WizardStepProjectReview
            formData={formData}
            selectedLocationIds={formData.station_id ? [formData.station_id] : []}
            scopeDescription={scopeDescription}
            scopeAttachments={scopeAttachments}
            teamMembers={teamMembers}
            milestones={milestones}
            documents={documents}
            regions={regions}
            hubs={hubs}
            stations={stations}
          />
        );
      default:
        return null;
    }
  };

  const projectIdLabel = formData.project_id_number
    ? `${formData.project_id_prefix || 'DP'}-${formData.project_id_number}`
    : null;

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
        <DialogContent
          hideCloseButton
          className="sm:max-w-3xl h-[85vh] overflow-hidden flex flex-col p-0"
        >
          <DialogHeader className="border-b px-4 sm:px-6 pt-1 sm:pt-2 pb-4">
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              Edit Project
            </DialogTitle>
            <div className="flex items-center gap-2 mt-0.5 min-w-0 min-h-[20px]">
              {projectIdLabel && (
                <>
                  <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium font-mono shrink-0">
                    {projectIdLabel}
                  </span>
                  {formData.project_title && (
                    <span className="text-xs text-muted-foreground truncate">
                      {formData.project_title}
                    </span>
                  )}
                </>
              )}
            </div>

            <nav aria-label="Wizard progress" className="pt-1 pb-1">
              <ol className="flex items-start justify-between gap-1">
                {STEPS.map((step, idx) => {
                  const isActive = step.id === currentStep;
                  const isComplete = !isActive && isStepComplete(step.id);
                  const stepHasRequiredFields =
                    step.id === 1 || step.id === 2 || step.id === 3;
                  const isAttention =
                    !isActive && !isComplete && stepHasRequiredFields;

                  const nextStep = STEPS[idx + 1];
                  const nextComplete = nextStep
                    ? isStepComplete(nextStep.id)
                    : false;
                  const connectorComplete = isComplete && nextComplete;
                  const isLast = idx === STEPS.length - 1;

                  return (
                    <li
                      key={step.id}
                      className="flex-1 flex flex-col items-center min-w-0 relative"
                    >
                      {!isLast && (
                        <div
                          className={cn(
                            'absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors',
                            connectorComplete ? 'bg-emerald-500' : 'bg-border'
                          )}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleStepClick(step.id)}
                        aria-current={isActive ? 'step' : undefined}
                        className="flex flex-col items-center gap-1.5 group z-10 bg-background px-1 cursor-pointer"
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                            isActive &&
                              'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background',
                            !isActive &&
                              isComplete &&
                              'bg-background text-emerald-600 border-2 border-emerald-500',
                            !isActive &&
                              isAttention &&
                              'bg-background text-amber-600 border-2 border-amber-500',
                            !isActive &&
                              !isComplete &&
                              !isAttention &&
                              'bg-background text-muted-foreground border-2 border-border group-hover:border-muted-foreground/50'
                          )}
                        >
                          {!isActive && isComplete ? (
                            <Check className="h-4 w-4" />
                          ) : !isActive && isAttention ? (
                            <span className="text-sm leading-none">!</span>
                          ) : (
                            step.id
                          )}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-medium truncate max-w-[80px] transition-colors',
                            isActive && 'text-primary',
                            !isActive && isComplete && 'text-emerald-600',
                            !isActive && isAttention && 'text-amber-600',
                            !isActive &&
                              !isComplete &&
                              !isAttention &&
                              'text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          {step.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto scrollbar-overlay py-4 px-4 sm:px-6">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading project…
              </div>
            ) : (
              renderStepContent()
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? requestClose : handleBack}
            >
              {currentStep === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>

            <div className="flex items-center gap-3">
              {currentStep < STEPS.length && (
                <Button
                  variant="ghost"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save & Exit
                    </>
                  )}
                </Button>

              )}
              {currentStep < STEPS.length ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you close now, your edits will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardConfirm(false);
                onClose();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditProjectModal;
