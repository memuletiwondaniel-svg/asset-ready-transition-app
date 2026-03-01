import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EnhancedCombobox } from '@/components/ui/enhanced-combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Image, FileText, Users, Calendar, FolderOpen, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { useStations } from '@/hooks/useStations';
import { useHubs } from '@/hooks/useHubs';
import { useProjectRegions } from '@/hooks/useProjectRegions';
import { useProjectLocations } from '@/hooks/useProjectLocations';
import { useProjectHierarchy } from '@/hooks/useProjectHierarchy';
import { useToast } from '@/hooks/use-toast';
import { ProjectTeamSection } from './ProjectTeamSection';
import { ProjectMilestonesSection } from './ProjectMilestonesSection';
import { EnhancedProjectDocumentsSection } from './EnhancedProjectDocumentsSection';
import { supabase } from '@/integrations/supabase/client';
import { useLogActivity } from '@/hooks/useActivityLogs';
import { cn } from '@/lib/utils';

interface AddProjectWizardProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = 'basics' | 'team' | 'milestones' | 'documents' | 'review';

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'basics', label: 'Project Info', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'milestones', label: 'Milestones', icon: Calendar },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'review', label: 'Review', icon: Check },
];

export const AddProjectWizard: React.FC<AddProjectWizardProps> = ({ open, onClose }) => {
  const { isCreating } = useProjects();
  const { stations } = useStations();
  const { data: hubs = [], createHub } = useHubs();
  const { regions } = useProjectRegions();
  const { regions: hierarchyRegions } = useProjectHierarchy();
  const { saveLocations } = useProjectLocations();
  const { toast } = useToast();
  const { mutate: logActivity } = useLogActivity();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    project_id_prefix: '' as 'DP' | 'ST' | 'MoC' | '',
    project_id_number: '',
    project_title: '',
    region_id: '',
    hub_id: '',
    project_scope: '',
    project_scope_image_url: '',
  });

  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, project_scope_image_url: event.target?.result as string }));
      };
      reader.readAsDataURL(imageFile);
    }
  }, []);

  const prefixOptions = [
    { value: 'DP', label: 'DP' },
    { value: 'ST', label: 'ST' },
    { value: 'MoC', label: 'MoC' }
  ];

  const filteredHubs = useMemo(() => {
    if (!formData.region_id) return hubs;
    const selectedRegion = hierarchyRegions.find(r => r.id === formData.region_id);
    if (!selectedRegion) return hubs;
    const hubIdsInRegion = selectedRegion.hubs.map(h => h.id);
    return hubs.filter(hub => hubIdsInRegion.includes(hub.id));
  }, [formData.region_id, hierarchyRegions, hubs]);

  const validateBasics = () => {
    if (!formData.project_id_prefix || !formData.project_id_number || !formData.project_title) {
      toast({
        title: "Required Fields",
        description: "Please fill in Project ID and Title",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validateTeam = () => {
    const validTeamMembers = teamMembers.filter(member => 
      member.user_id && member.user_id.trim() !== '' && member.user_id !== 'undefined'
    );
    if (validTeamMembers.length === 0) {
      toast({
        title: "Team Required",
        description: "Please assign at least one team member",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    const stepIndex = currentStepIndex;
    if (stepIndex === 0 && !validateBasics()) return;
    if (stepIndex === 1 && !validateTeam()) return;
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleStepClick = (stepId: WizardStep) => {
    const targetIndex = STEPS.findIndex(s => s.id === stepId);
    // Only allow going back or to completed steps
    if (targetIndex <= currentStepIndex) {
      setCurrentStep(stepId);
    }
  };

  const handleClose = () => {
    setFormData({
      project_id_prefix: '',
      project_id_number: '',
      project_title: '',
      region_id: '',
      hub_id: '',
      project_scope: '',
      project_scope_image_url: '',
    });
    setSelectedLocationIds([]);
    setTeamMembers([]);
    setMilestones([]);
    setDocuments([]);
    setCurrentStep('basics');
    onClose();
  };

  const handleSubmit = async () => {
    if (!validateBasics() || !validateTeam()) return;
    
    setIsSubmitting(true);

    const projectData = {
      project_id_prefix: formData.project_id_prefix as 'DP' | 'ST' | 'MoC',
      project_id_number: formData.project_id_number,
      project_title: formData.project_title,
      project_scope: formData.project_scope,
      project_scope_image_url: formData.project_scope_image_url,
      region_id: formData.region_id || undefined,
      hub_id: formData.hub_id || undefined,
    };

    try {
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (projectError) throw projectError;

      if (selectedLocationIds.length > 0) {
        await saveLocations({ projectId: newProject.id, stationIds: selectedLocationIds });
      }

      if (teamMembers.length > 0) {
        const validTeamMembers = teamMembers.filter(member => 
          member.user_id && member.user_id.trim() !== '' && member.user_id !== 'undefined'
        );
        if (validTeamMembers.length > 0) {
          const teamData = validTeamMembers.map(member => ({
            project_id: newProject.id,
            user_id: member.user_id,
            role: member.role,
            is_lead: member.is_lead || false
          }));
          const { error: teamError } = await supabase.from('project_team_members').insert(teamData);
          if (teamError) throw teamError;
        }

        // Auto-create "Create ORA Activity Plan" task for Snr ORA Engr
        const ORA_ROLE_VARIANTS = ['Snr ORA Engr', 'Snr ORA Engr.', 'Snr. ORA Engr.', 'Snr. ORA Engr', 'Senior ORA Engr.', 'Senior ORA Engineer'];
        const oraEngrMember = validTeamMembers.find(m => ORA_ROLE_VARIANTS.includes(m.role));
        if (oraEngrMember) {
          const { error: taskError } = await supabase
            .from('user_tasks')
            .insert({
              user_id: oraEngrMember.user_id,
              title: `Create ORA Activity Plan`,
              description: `Create the ORA Activity Plan for project ${formData.project_id_prefix}${formData.project_id_number} - ${formData.project_title}`,
              type: 'ora_plan_creation',
              status: 'pending',
              priority: 'high',
              metadata: {
                source: 'ora_workflow',
                project_id: newProject.id,
                project_name: `${formData.project_id_prefix}${formData.project_id_number} - ${formData.project_title}`,
                action: 'create_ora_plan',
              }
            });
          if (taskError) {
            console.error('Error creating ORA plan task:', taskError);
          }
        }
      }
      
      // Invalidate team members query so widgets refresh
      queryClient.invalidateQueries({ queryKey: ['project-team-members', newProject.id] });

      if (milestones.length > 0) {
        const validMilestones = milestones.filter(m => m.milestone_name?.trim() && m.milestone_date);
        if (validMilestones.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const milestoneData = validMilestones.map(m => ({
            project_id: newProject.id,
            milestone_name: m.milestone_name,
            milestone_date: m.milestone_date,
            is_scorecard_project: m.is_scorecard_project || false,
            created_by: user?.id || ''
          }));
          const { error: milestoneError } = await supabase.from('project_milestones').insert(milestoneData);
          if (milestoneError) throw milestoneError;
        }
      }

      if (documents.length > 0) {
        const validDocuments = documents.filter(d => d.document_name?.trim() && (d.file_path || d.link_url));
        if (validDocuments.length > 0) {
          const { data: { user } } = await supabase.auth.getUser();
          const docData = validDocuments.map(d => ({
            project_id: newProject.id,
            document_name: d.document_name,
            document_type: d.document_type || 'General',
            file_path: d.file_path,
            link_url: d.link_url,
            link_type: d.link_type,
            file_extension: d.file_extension,
            file_size: d.file_size,
            uploaded_by: user?.id || ''
          }));
          const { error: docError } = await supabase.from('project_documents').insert(docData);
          if (docError) throw docError;
        }
      }

      logActivity({
        activityType: 'project_created',
        description: `Created project: ${formData.project_id_prefix}${formData.project_id_number} - ${formData.project_title}`,
        metadata: {
          project_id: `${formData.project_id_prefix}${formData.project_id_number}`,
          project_title: formData.project_title
        }
      });

      toast({
        title: "Success",
        description: "Project created successfully!",
      });

      handleClose();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-6">
            {/* Project ID */}
            <div className="space-y-2">
              <Label htmlFor="project_id">Project ID *</Label>
              <div className="flex gap-2">
                <EnhancedCombobox
                  options={prefixOptions}
                  value={formData.project_id_prefix}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, project_id_prefix: value as 'DP' | 'ST' | 'MoC' }))}
                  placeholder="Prefix"
                  allowCreate={false}
                  showSearch={false}
                  className="w-32"
                />
                <Input
                  value={formData.project_id_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_id_number: e.target.value }))}
                  placeholder="Enter project number"
                  className="flex-1"
                />
              </div>
              {formData.project_id_prefix && formData.project_id_number && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {formData.project_id_prefix}{formData.project_id_number}
                </Badge>
              )}
            </div>

            {/* Project Title */}
            <div className="space-y-2">
              <Label htmlFor="project_title">Project Title *</Label>
              <Input
                id="project_title"
                value={formData.project_title}
                onChange={(e) => setFormData(prev => ({ ...prev, project_title: e.target.value }))}
                placeholder="Enter project title"
              />
            </div>

            {/* Portfolio, Hub, and Locations */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Portfolio</Label>
                <EnhancedCombobox
                  options={regions.map(region => ({ value: region.id, label: region.name }))}
                  value={formData.region_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, region_id: value, hub_id: '' }))}
                  placeholder="Select portfolio"
                  emptyText="No portfolios found"
                  allowCreate={false}
                  showSearch={false}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Project Hub</Label>
                <EnhancedCombobox
                  options={filteredHubs.map(hub => ({ value: hub.id, label: hub.name }))}
                  value={formData.hub_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hub_id: value }))}
                  onCreateNew={async (name) => { await createHub(name); }}
                  placeholder="Select or create hub"
                  emptyText="No hubs found"
                  createText="Create hub"
                  showSearch={false}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Locations</Label>
                <MultiSelectCombobox
                  options={stations.map(station => ({ value: station.id, label: station.name, description: station.hierarchyLabel || undefined }))}
                  selectedValues={selectedLocationIds}
                  onValueChange={setSelectedLocationIds}
                  placeholder="Select locations"
                  emptyText="No locations found"
                  className="w-full"
                />
              </div>
            </div>

            {/* Project Scope - Combined text and image */}
            <div className="space-y-2">
              <Label>Project Scope</Label>
              <div
                className={cn(
                  "border rounded-lg transition-colors",
                  isDragOver ? "border-primary bg-primary/5" : "border-input"
                )}
                onDrop={handleImageDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              >
                <Textarea
                  value={formData.project_scope}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_scope: e.target.value }))}
                  onPaste={(e) => {
                    const items = e.clipboardData.items;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith('image/')) {
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setFormData(prev => ({ ...prev, project_scope_image_url: event.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                        break;
                      }
                    }
                  }}
                  placeholder="Describe the project scope... (Ctrl+V to paste images)"
                  rows={4}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {formData.project_scope_image_url ? (
                  <div className="relative p-3 border-t">
                    <img src={formData.project_scope_image_url} alt="Project Scope" className="w-full max-h-48 object-contain rounded-lg" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, project_scope_image_url: '' }))}
                      className="absolute top-5 right-5 bg-destructive/10 hover:bg-destructive/20 text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="p-3 border-t text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => document.getElementById('project_scope_image')?.click()}
                  >
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Image className="h-4 w-4" />
                      <span>Drop image here, paste (Ctrl+V), or click to browse</span>
                    </div>
                  </div>
                )}
              </div>
              <Input
                id="project_scope_image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setFormData(prev => ({ ...prev, project_scope_image_url: event.target?.result as string }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </div>
          </div>
        );

      case 'team':
        return (
          <ProjectTeamSection 
            teamMembers={teamMembers}
            setTeamMembers={setTeamMembers}
          />
        );

      case 'milestones':
        return (
          <ProjectMilestonesSection 
            milestones={milestones}
            setMilestones={setMilestones}
          />
        );

      case 'documents':
        return (
          <EnhancedProjectDocumentsSection 
            documents={documents}
            setDocuments={setDocuments}
          />
        );

      case 'review':
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Project ID</Label>
                    <p className="font-medium">{formData.project_id_prefix}{formData.project_id_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Title</Label>
                    <p className="font-medium">{formData.project_title}</p>
                  </div>
                </div>
                {formData.project_scope && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Scope</Label>
                    <p className="text-sm">{formData.project_scope}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{teamMembers.filter(m => m.user_id).length}</p>
                    <p className="text-xs text-muted-foreground">Team Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{milestones.filter(m => m.milestone_name).length}</p>
                    <p className="text-xs text-muted-foreground">Milestones</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{documents.filter(d => d.document_name).length}</p>
                    <p className="text-xs text-muted-foreground">Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose} modal={true}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Add New Project
          </DialogTitle>
          {/* Progress Bar */}
          <div className="pt-4">
            <Progress value={progress} className="h-1.5" />
          </div>
          {/* Step Indicators */}
          <div className="flex justify-between pt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  disabled={index > currentStepIndex}
                  className={cn(
                    "flex flex-col items-center gap-1.5 transition-colors",
                    index <= currentStepIndex ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/20 text-primary ring-2 ring-primary",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isCurrent && "text-primary",
                    !isCurrent && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between gap-3 px-6 py-4 border-t flex-shrink-0 bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={currentStepIndex === 0 ? handleClose : handleBack}
            disabled={isSubmitting}
          >
            {currentStepIndex === 0 ? 'Cancel' : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </Button>
          
          {currentStep === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isCreating}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
