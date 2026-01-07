import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronLeft, ChevronRight, Check, Loader2, X, FileText, Building2, MapPin, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { usePSSRReasons } from '@/hooks/usePSSRReasons';
import { usePlants } from '@/hooks/usePlants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreatePSSRWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (pssrId: string) => void;
}

interface WizardState {
  // Step 1: Project & Asset
  projectId: string;
  assetName: string;
  plantId: string;
  csLocation: string;
  
  // Step 2: PSSR Reason
  reasonId: string;
  
  // Step 3: Scope
  scopeDescription: string;
}

const STEPS = [
  { id: 1, title: 'Project & Asset', description: 'Select project and asset details' },
  { id: 2, title: 'PSSR Reason', description: 'Select the reason for this PSSR' },
  { id: 3, title: 'Scope & Details', description: 'Define the scope' },
  { id: 4, title: 'Review & Create', description: 'Review and create PSSR' },
];

const CreatePSSRWizard: React.FC<CreatePSSRWizardProps> = ({ open, onOpenChange, onSuccess }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { projects, isLoading: projectsLoading } = useProjects();
  const { data: reasons, isLoading: reasonsLoading } = usePSSRReasons();
  const { plants, isLoading: plantsLoading } = usePlants();
  
  const [wizardState, setWizardState] = useState<WizardState>({
    projectId: '',
    assetName: '',
    plantId: '',
    csLocation: '',
    reasonId: '',
    scopeDescription: '',
  });

  const selectedProject = projects?.find(p => p.id === wizardState.projectId);
  const selectedReason = reasons?.find(r => r.id === wizardState.reasonId);
  const selectedPlant = plants?.find(p => p.id === wizardState.plantId);

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardState({
      projectId: '',
      assetName: '',
      plantId: '',
      csLocation: '',
      reasonId: '',
      scopeDescription: '',
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!wizardState.projectId) {
          toast.error('Please select a project');
          return false;
        }
        if (!wizardState.assetName.trim()) {
          toast.error('Please enter an asset name');
          return false;
        }
        return true;
      case 2:
        if (!wizardState.reasonId) {
          toast.error('Please select a PSSR reason');
          return false;
        }
        return true;
      case 3:
        return true; // Scope is optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const generatePSSRId = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('pssrs')
      .select('*', { count: 'exact', head: true })
      .ilike('pssr_id', `PSSR-${year}-%`);
    
    const nextNumber = (count || 0) + 1;
    return `PSSR-${year}-${String(nextNumber).padStart(4, '0')}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const pssrId = await generatePSSRId();

      // Create the PSSR
      const { data: newPSSR, error: pssrError } = await supabase
        .from('pssrs')
        .insert({
          pssr_id: pssrId,
          project_id: wizardState.projectId,
          project_name: selectedProject?.project_title || '',
          asset: wizardState.assetName.trim(),
          plant: selectedPlant?.name || '',
          cs_location: wizardState.csLocation.trim() || null,
          reason: selectedReason?.name || '',
          scope_description: wizardState.scopeDescription.trim() || null,
          status: 'DRAFT',
          user_id: user.id,
        })
        .select()
        .single();

      if (pssrError) throw pssrError;

      // Fetch checklist items for this reason from configuration
      const { data: config } = await supabase
        .from('pssr_reason_configuration')
        .select('checklist_item_ids')
        .eq('reason_id', wizardState.reasonId)
        .maybeSingle();

      // Create checklist responses if we have items
      if (config?.checklist_item_ids && config.checklist_item_ids.length > 0) {
        const checklistResponses = config.checklist_item_ids.map((itemId: string) => ({
          pssr_id: newPSSR.id,
          checklist_item_id: itemId,
          status: 'pending',
          response: null,
        }));

        const { error: checklistError } = await supabase
          .from('pssr_checklist_responses')
          .insert(checklistResponses);

        if (checklistError) {
          console.error('Error creating checklist responses:', checklistError);
        }
      }

      // Fetch and create approvers based on reason configuration
      const { data: reasonConfig } = await supabase
        .from('pssr_reason_configuration')
        .select('pssr_approver_role_ids')
        .eq('reason_id', wizardState.reasonId)
        .maybeSingle();

      if (reasonConfig?.pssr_approver_role_ids && reasonConfig.pssr_approver_role_ids.length > 0) {
        // Get role names
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', reasonConfig.pssr_approver_role_ids);

        if (roles && roles.length > 0) {
          const approvers = roles.map((role, index) => ({
            pssr_id: newPSSR.id,
            approver_role: role.name,
            approver_name: 'Pending Assignment',
            approver_level: index + 1,
            status: 'pending',
          }));

          const { error: approverError } = await supabase
            .from('pssr_approvers')
            .insert(approvers);

          if (approverError) {
            console.error('Error creating approvers:', approverError);
          }
        }
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['pssrs'] });

      toast.success(`PSSR ${pssrId} created successfully!`);
      handleClose();
      onSuccess?.(newPSSR.id);
    } catch (error: any) {
      console.error('Failed to create PSSR:', error);
      toast.error(error.message || 'Failed to create PSSR');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Create New PSSR
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Step {currentStep} of {STEPS.length}</span>
              <span className="text-muted-foreground">{STEPS[currentStep - 1].title}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            
            {/* Step Indicators */}
            <div className="flex justify-between mt-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center flex-1 ${
                    step.id === currentStep 
                      ? 'text-primary' 
                      : step.id < currentStep 
                        ? 'text-primary/60' 
                        : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                      step.id === currentStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : step.id < currentStep
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/30 bg-muted/30'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-xs mt-1 text-center hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-6 px-1">
          {/* Step 1: Project & Asset */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="project" className="text-base font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Project *
                </Label>
                <Select
                  value={wizardState.projectId}
                  onValueChange={(value) => setWizardState(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_id_prefix}-{project.project_id_number} - {project.project_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="asset" className="text-base font-medium">Asset Name *</Label>
                <Input
                  id="asset"
                  value={wizardState.assetName}
                  onChange={(e) => setWizardState(prev => ({ ...prev, assetName: e.target.value }))}
                  placeholder="Enter asset name (e.g., Compressor K-101)"
                  maxLength={100}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="plant" className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Plant / Location
                </Label>
                <Select
                  value={wizardState.plantId}
                  onValueChange={(value) => setWizardState(prev => ({ ...prev, plantId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={plantsLoading ? "Loading..." : "Select plant (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {plants?.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="csLocation" className="text-base font-medium">CS Location</Label>
                <Input
                  id="csLocation"
                  value={wizardState.csLocation}
                  onChange={(e) => setWizardState(prev => ({ ...prev, csLocation: e.target.value }))}
                  placeholder="Enter CS location (optional)"
                  maxLength={100}
                />
              </div>
            </div>
          )}

          {/* Step 2: PSSR Reason */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Select PSSR Reason</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the reason for this PSSR. This will determine the checklist items and approval workflow.
              </p>
              
              {reasonsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <RadioGroup
                  value={wizardState.reasonId}
                  onValueChange={(value) => setWizardState(prev => ({ ...prev, reasonId: value }))}
                  className="space-y-3"
                >
                  {reasons?.map((reason) => (
                    <div
                      key={reason.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        wizardState.reasonId === reason.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <RadioGroupItem value={reason.id} id={reason.id} className="mt-1" />
                      <Label htmlFor={reason.id} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{reason.name}</span>
                          {reason.category && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {reason.category}
                            </span>
                          )}
                        </div>
                        {reason.sub_category && (
                          <p className="text-sm text-muted-foreground">
                            {reason.sub_category}
                          </p>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}

          {/* Step 3: Scope & Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="scope" className="text-base font-medium">Scope Description</Label>
                <Textarea
                  id="scope"
                  value={wizardState.scopeDescription}
                  onChange={(e) => setWizardState(prev => ({ ...prev, scopeDescription: e.target.value }))}
                  placeholder="Describe the scope of this PSSR (optional)..."
                  maxLength={1000}
                  rows={6}
                />
                <p className="text-sm text-muted-foreground">
                  {wizardState.scopeDescription.length}/1000 characters
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Review PSSR Details</h3>
                <p className="text-muted-foreground mt-1">
                  Please review the details before creating the PSSR
                </p>
              </div>

              <div className="bg-muted/20 rounded-lg p-6 border border-border/30 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Project:</span>
                    <p className="font-medium">
                      {selectedProject 
                        ? `${selectedProject.project_id_prefix}-${selectedProject.project_id_number} - ${selectedProject.project_title}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Asset:</span>
                    <p className="font-medium">{wizardState.assetName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plant:</span>
                    <p className="font-medium">{selectedPlant?.name || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CS Location:</span>
                    <p className="font-medium">{wizardState.csLocation || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">PSSR Reason:</span>
                    <p className="font-medium">{selectedReason?.name || '—'}</p>
                  </div>
                  {wizardState.scopeDescription && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Scope:</span>
                      <p className="font-medium">{wizardState.scopeDescription}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> The PSSR will be created as a Draft. You can edit the details and submit for review from the PSSR dashboard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handleBack}
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create PSSR
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePSSRWizard;
