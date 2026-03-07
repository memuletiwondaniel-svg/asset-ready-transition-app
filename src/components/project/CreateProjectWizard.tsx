import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Loader2, FolderPlus, Building2, Target, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useHubs } from '@/hooks/useHubs';
import { useStations } from '@/hooks/useStations';
import { useProjectLocations } from '@/hooks/useProjectLocations';
import { useLogActivity } from '@/hooks/useActivityLogs';
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

  // Form state
  const [formData, setFormData] = useState<FormData>({
    project_id_prefix: '',
    project_id_number: '',
    project_title: '',
    region_id: '',
    hub_id: '',
  });
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [scopeDescription, setScopeDescription] = useState('');
  const [scopeAttachments, setScopeAttachments] = useState<Attachment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

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
      project_id_prefix: '',
      project_id_number: '',
      project_title: '',
      region_id: '',
      hub_id: '',
    });
    setSelectedLocationIds([]);
    setScopeDescription('');
    setScopeAttachments([]);
    setTeamMembers([]);
    setMilestones([]);
    setDocuments([]);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.project_id_prefix) {
          toast.error('Please select a project ID prefix');
          return false;
        }
        if (!formData.project_id_number) {
          toast.error('Please enter a project ID number');
          return false;
        }
        if (!formData.project_title) {
          toast.error('Please enter a project title');
          return false;
        }
        return true;
      case 2:
        return true; // Scope is optional
      case 3:
        const validMembers = teamMembers.filter(m => m.user_id && m.user_id.trim() !== '');
        if (validMembers.length === 0) {
          toast.error('Please assign at least one team member');
          return false;
        }
        return true;
      case 4:
        return true; // Milestones and documents are optional
      default:
        return true;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.project_id_prefix && formData.project_id_number && formData.project_title);
      case 2:
        return true;
      case 3:
        return teamMembers.filter(m => m.user_id && m.user_id.trim() !== '').length > 0;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === currentStep) return;
    const canNavigate = visitedSteps.has(targetStep) || targetStep <= currentStep;
    if (!canNavigate) {
      if (!validateStep(currentStep)) return;
    }
    setVisitedSteps(prev => new Set([...prev, targetStep]));
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
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
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Save project locations
      if (selectedLocationIds.length > 0) {
        await saveLocations({ projectId: newProject.id, stationIds: selectedLocationIds });
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
      handleClose();
      onSuccess?.(newProject.id);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const regionName = getRegionName();
  const hubName = getHubName();

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <WizardStepProjectInfo
            formData={formData}
            selectedLocationIds={selectedLocationIds}
            onFormDataChange={handleFormDataChange}
            onLocationIdsChange={setSelectedLocationIds}
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
            selectedLocationIds={selectedLocationIds}
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-full sm:max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="border-b px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Create New Project
          </DialogTitle>

          {/* Progress Indicator - matching ORA wizard style */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Step {currentStep} of {STEPS.length}</span>
              <span className="text-muted-foreground">{STEPS[currentStep - 1].description}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            
            {/* Step Indicators - clickable like ORA wizard */}
            <div className="flex justify-between mt-2">
              {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isVisited = visitedSteps.has(step.id);
                const isComplete = step.id < currentStep || (isVisited && isStepComplete(step.id));
                const isClickable = isVisited || step.id <= currentStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      "flex flex-col items-center flex-1 transition-colors",
                      isClickable ? "cursor-pointer" : "cursor-default",
                      isActive
                        ? "text-primary"
                        : isComplete
                          ? "text-primary/60"
                          : "text-muted-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : isComplete
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/30 bg-muted/30"
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center hidden sm:block">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {/* Context banner - shown from step 2 onwards when project info is filled */}
        {currentStep >= 2 && formData.project_id_prefix && formData.project_id_number && (
          <div className="mx-3 sm:mx-6 mt-2 mb-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted/60 border border-border/50">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Project</p>
                <p className="font-semibold text-foreground/90 truncate">
                  {formData.project_id_prefix}{formData.project_id_number}
                  {formData.project_title ? ` – ${formData.project_title}` : ''}
                </p>
              </div>
              {regionName && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Portfolio</p>
                      <p className="font-semibold text-foreground/90">{regionName}</p>
                    </div>
                  </div>
                </>
              )}
              {hubName && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Hub</p>
                      <p className="font-semibold text-foreground/90">{hubName}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-3 sm:py-4 px-4 sm:px-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handleBack}
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
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectWizard;
