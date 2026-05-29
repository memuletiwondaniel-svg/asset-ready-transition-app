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
import { ChevronLeft, ChevronRight, Check, Loader2, FolderPlus, AlertCircle, Save } from 'lucide-react';
import { useProjectDraft, ProjectDraftPayload } from '@/hooks/useProjectDraft';

import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useHubs } from '@/hooks/useHubs';
import { useStations } from '@/hooks/useStations';
import { useProjectLocations } from '@/hooks/useProjectLocations';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { useProjectIdAvailability } from '@/hooks/useProjectIdAvailability';
import { Attachment } from '@/components/ui/RichTextEditor';
import WizardStepProjectInfo from './wizard/WizardStepProjectInfo';
import WizardStepProjectScope from './wizard/WizardStepProjectScope';
import WizardStepProjectTeam from './wizard/WizardStepProjectTeam';
import WizardStepMilestonesDocuments from './wizard/WizardStepMilestonesDocuments';
import WizardStepProjectReview from './wizard/WizardStepProjectReview';

interface CreateProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
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
  { id: 5, title: 'Review', description: 'Confirm & create' },
];

export const CreateProjectWizard: React.FC<CreateProjectWizardProps> = ({ 
  open, 
  onClose,
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const { regions } = useProjectRegions();
  const { data: hubs = [] } = useHubs();
  const { stations } = useStations();
  const { saveLocations } = useProjectLocations();
  const { mutate: logActivity } = useLogActivity();

  const [currentStep, setCurrentStep] = useState(1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const { draft, save: saveDraft, saving: savingDraft, clear: clearDraft, reload: reloadDraft } = useProjectDraft();


  // Form state
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

  // Live duplicate check for Project ID (used to block Next on step 1)
  const { conflict: idConflict } = useProjectIdAvailability(
    formData.project_id_prefix || 'DP',
    formData.project_id_number
  );

  // Track dirty state for discard-confirm
  const isDirty = useMemo(
    () =>
      !!(
        formData.project_id_number ||
        formData.project_title ||
        formData.region_id ||
        formData.hub_id ||
        formData.plant_id ||
        formData.field_id ||
        formData.station_id ||
        scopeDescription ||
        scopeAttachments.length ||
        teamMembers.length ||
        milestones.length ||
        documents.length
      ),
    [formData, scopeDescription, scopeAttachments, teamMembers, milestones, documents]
  );

  // Get region and hub names for auto-population
  const getRegionName = () => {
    const region = regions.find(r => r.id === formData.region_id);
    return region?.name || null;
  };

  const getHubName = () => {
    const hub = hubs.find(h => h.id === formData.hub_id);
    return hub?.name || null;
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setVisitedSteps(new Set([1]));
    setFormData({
      project_id_prefix: 'DP',
      project_id_number: '',
      project_title: '',
      region_id: '',
      hub_id: '',
      plant_id: '',
      field_id: '',
      station_id: '',
    });
    setScopeDescription('');
    setScopeAttachments([]);
    setTeamMembers([]);
    setMilestones([]);
    setDocuments([]);
  };

  // On open: if a saved draft exists, prompt to resume
  useEffect(() => {
    if (open && draft && !isDirty) {
      setShowResumePrompt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft]);

  const applyDraft = (d: ProjectDraftPayload) => {
    setFormData(d.formData);
    setScopeDescription(d.scopeDescription || '');
    setScopeAttachments(d.scopeAttachments || []);
    setTeamMembers(d.teamMembers || []);
    setMilestones(d.milestones || []);
    setDocuments(d.documents || []);
    setCurrentStep(d.currentStep || 1);
    setVisitedSteps(new Set(Array.from({ length: d.currentStep || 1 }, (_, i) => i + 1)));
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleSaveAndClose = async () => {
    await saveDraft({
      formData,
      scopeDescription,
      scopeAttachments,
      teamMembers,
      milestones,
      documents,
      currentStep,
    });
    await reloadDraft();
    resetWizard();
    onClose();
  };

  const requestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      handleClose();
    }
  };


  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.project_id_number) {
          toast.error('Please enter the project ID number');
          return false;
        }
        if (idConflict) {
          toast.error(`DP-${formData.project_id_number} already exists`);
          return false;
        }
        if (!formData.project_title) {
          toast.error('Please enter a project title');
          return false;
        }
        if (!formData.region_id) {
          toast.error('Please select a Portfolio');
          return false;
        }
        if (!formData.hub_id) {
          toast.error('Please select a Project Hub');
          return false;
        }
        if (!formData.plant_id) {
          toast.error('Please select a Plant');
          return false;
        }
        return true;
      case 2:
        if (!scopeDescription.trim() && scopeAttachments.length === 0) {
          toast.error('Please describe the project scope');
          return false;
        }
        return true;

      case 3: {
        const validMembers = teamMembers.filter(m => m.user_id && m.user_id.trim() !== '');
        if (validMembers.length === 0) {
          toast.error('Please assign at least one team member');
          return false;
        }
        const norm = (r: string) => (r || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
        const hasHubLead = validMembers.some(m => norm(m.role) === 'project hub lead');
        const hasOraEngr = validMembers.some(m => {
          const r = norm(m.role);
          return r === 'ora engr' || r === 'ora engineer' || r === 'snr ora engr' || r === 'senior ora engr' || r === 'senior ora engineer';
        });
        if (!hasHubLead) {
          toast.error('Project Hub Lead must be assigned');
          return false;
        }
        if (!hasOraEngr) {
          toast.error('ORA Engineer (or Snr. ORA Engr.) must be assigned');
          return false;
        }
        return true;
      }
      case 4:
        return true; // Milestones and documents are optional
      default:
        return true;
    }
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
        // Scope is optional — only "complete" if the user actually entered something
        return !!(scopeDescription.trim() || scopeAttachments.length > 0);
      case 3: {
        const valid = teamMembers.filter(m => m.user_id && m.user_id.trim() !== '');
        const norm = (r: string) => (r || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
        const hasHubLead = valid.some(m => norm(m.role) === 'project hub lead');
        const hasOraEngr = valid.some(m => {
          const r = norm(m.role);
          return r === 'ora engr' || r === 'ora engineer' || r === 'snr ora engr' || r === 'senior ora engr' || r === 'senior ora engineer';
        });
        return valid.length > 0 && hasHubLead && hasOraEngr;
      }
      case 4:
        // Milestones & docs are optional — only "complete" if the user added at least one
        return milestones.length > 0 || documents.length > 0;
      case 5:
        // Review is the final action, never shown as complete
        return false;
      default:
        return false;
    }

  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return;
    setVisitedSteps(prev => new Set([...prev, targetStep]));
    setCurrentStep(targetStep);
  };

  const incompleteSteps = useMemo(
    () => STEPS.slice(0, 4).filter(s => !isStepComplete(s.id)).map(s => s.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, teamMembers, idConflict]
  );

  const handleNext = () => {
    const nextStep = Math.min(currentStep + 1, STEPS.length);
    setVisitedSteps(prev => new Set([...prev, nextStep]));
    setCurrentStep(nextStep);
  };


  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFormDataChange = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    // Validate every step before final submission
    // Only steps with required fields gate the final submission (1: Project Info, 3: Team)
    const requiredSteps = [1, 2, 3];
    for (const id of requiredSteps) {
      if (!isStepComplete(id)) {
        const s = STEPS.find(x => x.id === id)!;
        toast.error(`Step ${s.id} (${s.title}) is incomplete`);
        setCurrentStep(s.id);
        setVisitedSteps(prev => new Set([...prev, s.id]));
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create the project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert([{
          project_id_prefix: formData.project_id_prefix as 'DP' | 'ST' | 'MoC',
          project_id_number: formData.project_id_number,
          project_title: formData.project_title,
          project_scope: scopeDescription || null,
          region_id: formData.region_id || null,
          hub_id: formData.hub_id || null,
          plant_id: formData.plant_id || null,
          station_id: formData.station_id || null,
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Save project location (single deepest station, if any)
      if (formData.station_id) {
        await saveLocations({ projectId: newProject.id, stationIds: [formData.station_id] });
      }

      // Save team members
      const validTeamMembers = teamMembers.filter(m => 
        m.user_id && m.user_id.trim() !== '' && m.user_id !== 'undefined'
      );
      if (validTeamMembers.length > 0) {
        const teamData = validTeamMembers.map(member => ({
          project_id: newProject.id,
          user_id: member.user_id,
          role: member.role,
          is_lead: member.is_lead || false
        }));
        
        const { error: teamError } = await supabase
          .from('project_team_members')
          .insert(teamData);
        
        if (teamError) {
          console.error('Error saving team members:', teamError);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['project-team-members', newProject.id] });

      // Save milestones
      const validMilestones = milestones.filter(m => 
        m.milestone_name && m.milestone_name.trim() !== '' && m.milestone_date
      );
      if (validMilestones.length > 0) {
        const milestoneData = validMilestones.map(m => ({
          project_id: newProject.id,
          milestone_name: m.milestone_name,
          milestone_date: m.milestone_date,
          is_scorecard_project: m.is_scorecard_project || false,
          created_by: user.id
        }));
        
        const { error: milestoneError } = await supabase
          .from('project_milestones')
          .insert(milestoneData);
        
        if (milestoneError) {
          console.error('Error saving milestones:', milestoneError);
        }
      }

      // Save documents
      const validDocuments = documents.filter(d =>
        d.document_name && d.document_name.trim() !== '' && (d.file_path || d.link_url)
      );
      if (validDocuments.length > 0) {
        const docData = validDocuments.map(d => ({
          project_id: newProject.id,
          document_name: d.document_name,
          document_type: d.document_type || 'General',
          file_path: d.file_path,
          link_url: d.link_url,
          link_type: d.link_type,
          file_extension: d.file_extension,
          file_size: d.file_size,
          uploaded_by: user.id
        }));
        
        const { error: docError } = await supabase
          .from('project_documents')
          .insert(docData);
        
        if (docError) {
          console.error('Error saving documents:', docError);
        }
      }

      // Log activity
      logActivity({
        activityType: 'project_created',
        description: `Created project: ${formData.project_id_prefix}${formData.project_id_number} - ${formData.project_title}`,
        metadata: {
          project_id: `${formData.project_id_prefix}${formData.project_id_number}`,
          project_title: formData.project_title
        }
      });

      queryClient.invalidateQueries({ queryKey: ['projects'] });

      toast.success(`Project ${formData.project_id_prefix}${formData.project_id_number} created successfully!`);
      await clearDraft();
      handleClose();
      onSuccess?.(newProject.id);

    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  

  const regionName = getRegionName();
  const hubName = getHubName();

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WizardStepProjectInfo
            formData={formData}
            onFormDataChange={handleFormDataChange}
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
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
            regionName={regionName}
            hubName={hubName}
            hubId={formData.hub_id || null}
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

  const subtitle = formData.project_id_number
    ? `${formData.project_id_prefix || 'DP'}-${formData.project_id_number}${
        formData.project_title ? ` · ${formData.project_title}` : ''
      }${regionName ? ` — ${regionName}` : ''}${hubName ? ` › ${hubName}` : ''}`
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
        <DialogContent className="sm:max-w-3xl h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="border-b px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
              <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Create New Project
            </DialogTitle>
            {currentStep > 1 && subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-1">{subtitle}</p>
            )}

            {/* Circular stepper — semantic state per step */}
            <nav aria-label="Wizard progress" className="mt-4">
              <ol className="flex items-start justify-between gap-1">
                {STEPS.map((step, idx) => {
                  const visited = visitedSteps.has(step.id);
                  const isActive = step.id === currentStep;
                  // "Complete" only counts if user has actually visited the step.
                  const isComplete = visited && !isActive && isStepComplete(step.id);
                  // Only required-field steps (1, 3) flag amber when visited & incomplete
                  const stepHasRequiredFields = step.id === 1 || step.id === 3;
                  const isAttention = visited && !isActive && !isComplete && stepHasRequiredFields;

                  const nextStep = STEPS[idx + 1];
                  const nextVisited = nextStep ? visitedSteps.has(nextStep.id) : false;
                  const nextComplete = nextStep ? isStepComplete(nextStep.id) && nextVisited : false;
                  const connectorComplete = isComplete && nextComplete;
                  const isLast = idx === STEPS.length - 1;

                  return (
                    <li key={step.id} className="flex-1 flex flex-col items-center min-w-0 relative">
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
                        aria-label={`Step ${step.id}: ${step.title}${isComplete ? ' (complete)' : isAttention ? ' (incomplete)' : ''}`}
                        className="flex flex-col items-center gap-1.5 group z-10 bg-background px-1 cursor-pointer"
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                            isActive && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background',
                            !isActive && isComplete && 'bg-background text-emerald-600 border-2 border-emerald-500',
                            !isActive && isAttention && 'bg-background text-amber-600 border-2 border-amber-500',
                            !isActive && !isComplete && !isAttention && 'bg-background text-muted-foreground border-2 border-border group-hover:border-muted-foreground/50'
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
                            !isActive && !isComplete && !isAttention && 'text-muted-foreground group-hover:text-foreground'
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

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto py-4 px-4 sm:px-6">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t">
            <Button variant="outline" onClick={currentStep === 1 ? requestClose : handleBack}>
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
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Step {currentStep} of {STEPS.length}
              </span>
              <Button
                variant="ghost"
                onClick={handleSaveAndClose}
                disabled={savingDraft || !isDirty}
                className="gap-1.5"
                title="Save your progress and finish later"
              >
                {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save & close
              </Button>
              {currentStep < STEPS.length ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Project
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showResumePrompt} onOpenChange={setShowResumePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume your saved draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have a previously saved project draft. Would you like to continue where you left off?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={async () => {
                setShowResumePrompt(false);
                await clearDraft();
              }}
            >
              Start fresh
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (draft) applyDraft(draft);
                setShowResumePrompt(false);
              }}
            >
              Resume draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this project?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you close now, all progress in this wizard will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardConfirm(false);
                handleClose();
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

export default CreateProjectWizard;
