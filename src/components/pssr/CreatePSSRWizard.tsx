import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Check, Loader2, X, FileText, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useActivePSSRReasonCategories, usePSSRReasonsByCategory } from '@/hooks/usePSSRReasonCategories';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';
import { usePSSRTieInScopes } from '@/hooks/usePSSRAtiScopes';
import { Project } from '@/hooks/useProjects';
import WizardStepCategory from './wizard/WizardStepCategory';
import WizardStepSpecificReason from './wizard/WizardStepSpecificReason';
import WizardStepLocation from './wizard/WizardStepLocation';

interface CreatePSSRWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (pssrId: string) => void;
}

type LocationMode = 'project' | 'asset';

interface WizardState {
  // Step 1: Category
  categoryId: string;
  // Step 2: Specific Reason
  reasonId: string;
  additionalDetails: string;
  selectedAtiScopeIds: string[];
  
  // Step 3: Location/Context
  locationMode: LocationMode;
  // Project-based
  projectId: string;
  selectedProject: Project | null;
  // Asset-based
  plantId: string;
  fieldId: string;
  stationId: string;
  
  // Step 4: Scope
  scopeDescription: string;
  equipmentName: string;
}

const STEPS = [
  { id: 1, title: 'Category', description: 'Select PSSR category' },
  { id: 2, title: 'Reason', description: 'Select specific reason' },
  { id: 3, title: 'Location', description: 'Select project or asset location' },
  { id: 4, title: 'Scope & Details', description: 'Define the scope' },
  { id: 5, title: 'Review', description: 'Review and create PSSR' },
];

const CreatePSSRWizard: React.FC<CreatePSSRWizardProps> = ({ open, onOpenChange, onSuccess }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: categories } = useActivePSSRReasonCategories();
  const { data: atiScopes } = usePSSRTieInScopes();
  const { plants } = usePlants();
  const { fields } = useFields();
  const { stations } = useStations();
  
  const [wizardState, setWizardState] = useState<WizardState>({
    categoryId: '',
    reasonId: '',
    additionalDetails: '',
    selectedAtiScopeIds: [],
    locationMode: 'project',
    projectId: '',
    selectedProject: null,
    plantId: '',
    fieldId: '',
    stationId: '',
    scopeDescription: '',
    equipmentName: '',
  });

  // Fetch reasons for selected category
  const { data: reasons } = usePSSRReasonsByCategory(wizardState.categoryId || null);

  const selectedCategory = categories?.find(c => c.id === wizardState.categoryId);
  const selectedReason = reasons?.find(r => r.id === wizardState.reasonId);
  const selectedPlant = plants?.find(p => p.id === wizardState.plantId);
  const selectedField = fields?.find(f => f.id === wizardState.fieldId);
  const selectedStation = stations?.find(s => s.id === wizardState.stationId);

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardState({
      categoryId: '',
      reasonId: '',
      additionalDetails: '',
      selectedAtiScopeIds: [],
      locationMode: 'project',
      projectId: '',
      selectedProject: null,
      plantId: '',
      fieldId: '',
      stationId: '',
      scopeDescription: '',
      equipmentName: '',
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Category only
        if (!wizardState.categoryId) {
          toast.error('Please select a PSSR category');
          return false;
        }
        return true;
      case 2: // Specific Reason
        if (!wizardState.reasonId) {
          toast.error('Please select a specific reason');
          return false;
        }
        // Validate ATI scopes if required
        if (selectedReason?.requires_ati_scopes && wizardState.selectedAtiScopeIds.length === 0) {
          toast.error('Please select at least one ATI scope');
          return false;
        }
        return true;
      case 3: // Location
        // Determine required fields based on category and mode
        const categoryCode = selectedCategory?.code;
        const isProjectOnlyCategory = categoryCode === 'PROJECT_STARTUP' || categoryCode === 'BFM_PROJECTS' || categoryCode === 'PE_PROJECTS';
        const isAssetOnlyCategory = categoryCode === 'INCIDENCE' || categoryCode === 'OPS_MTCE';
        
        // For project-only categories or project mode selection
        if (isProjectOnlyCategory || (!isAssetOnlyCategory && wizardState.locationMode === 'project')) {
          if (!wizardState.projectId) {
            toast.error('Please select a project');
            return false;
          }
        }
        // For asset-only categories or asset mode selection
        if (isAssetOnlyCategory || (!isProjectOnlyCategory && wizardState.locationMode === 'asset')) {
          if (!wizardState.plantId) {
            toast.error('Please select a plant');
            return false;
          }
        }
        return true;
      case 4: // Scope & Details
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

      // Determine location mode
      const categoryCode = selectedCategory?.code;
      const isProjectMode = categoryCode === 'PROJECT_STARTUP' || categoryCode === 'BFM_PROJECTS' || categoryCode === 'PE_PROJECTS' || wizardState.locationMode === 'project';

      // Determine plant and location values
      let plantValue = '';
      let csLocationValue = '';
      let projectIdValue: string | null = null;
      let projectNameValue = '';

      if (isProjectMode && wizardState.selectedProject) {
        projectIdValue = wizardState.projectId;
        projectNameValue = wizardState.selectedProject.project_title;
        plantValue = wizardState.selectedProject.plant_name || '';
        csLocationValue = wizardState.selectedProject.station_name || '';
      } else {
        plantValue = selectedPlant?.name || '';
        csLocationValue = selectedStation?.name || '';
      }

      // Create the PSSR
      const { data: newPSSR, error: pssrError } = await supabase
        .from('pssrs')
        .insert({
          pssr_id: pssrId,
          reason: selectedReason?.name || '',
          scope: wizardState.scopeDescription.trim() || null,
          asset: wizardState.equipmentName.trim() || 'N/A',
          status: 'DRAFT',
          user_id: user.id,
          project_id: projectIdValue,
          project_name: projectNameValue || null,
          plant: plantValue || null,
          cs_location: csLocationValue || null,
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

      // Save selected ATI scopes if any
      if (wizardState.selectedAtiScopeIds.length > 0) {
        const atiScopeRecords = wizardState.selectedAtiScopeIds.map(scopeId => ({
          pssr_id: newPSSR.id,
          ati_scope_id: scopeId,
        }));

        const { error: atiError } = await supabase
          .from('pssr_selected_ati_scopes')
          .insert(atiScopeRecords);

        if (atiError) {
          console.error('Error saving ATI scopes:', atiError);
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

  // Get display values for review step
  const getLocationDisplay = () => {
    const categoryCode = selectedCategory?.code;
    const isProjectMode = categoryCode === 'PROJECT_STARTUP' || categoryCode === 'BFM_PROJECTS' || categoryCode === 'PE_PROJECTS' || wizardState.locationMode === 'project';
    
    if (isProjectMode && wizardState.selectedProject) {
      return {
        type: 'Project',
        primary: `${wizardState.selectedProject.project_id_prefix}-${wizardState.selectedProject.project_id_number}`,
        secondary: wizardState.selectedProject.project_title,
        details: [
          wizardState.selectedProject.hub_name && `Hub: ${wizardState.selectedProject.hub_name}`,
          wizardState.selectedProject.plant_name && `Plant: ${wizardState.selectedProject.plant_name}`,
        ].filter(Boolean),
      };
    }
    
    return {
      type: 'Asset Location',
      primary: selectedPlant?.name || '',
      secondary: [selectedField?.name, selectedStation?.name].filter(Boolean).join(' → '),
      details: [],
    };
  };

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
          {/* Step 1: Category */}
          {currentStep === 1 && (
            <WizardStepCategory
              categoryId={wizardState.categoryId}
              onCategoryChange={(id) => setWizardState(prev => ({ 
                ...prev, 
                categoryId: id,
                reasonId: '',
                selectedAtiScopeIds: []
              }))}
            />
          )}

          {/* Step 2: Specific Reason */}
          {currentStep === 2 && (
            <WizardStepSpecificReason
              categoryId={wizardState.categoryId}
              reasonId={wizardState.reasonId}
              additionalDetails={wizardState.additionalDetails}
              selectedAtiScopeIds={wizardState.selectedAtiScopeIds}
              onReasonChange={(id) => setWizardState(prev => ({ ...prev, reasonId: id }))}
              onAdditionalDetailsChange={(details) => setWizardState(prev => ({ ...prev, additionalDetails: details }))}
              onAtiScopeChange={(scopeIds) => setWizardState(prev => ({ ...prev, selectedAtiScopeIds: scopeIds }))}
            />
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <WizardStepLocation
              categoryCode={selectedCategory?.code}
              projectId={wizardState.projectId}
              selectedProject={wizardState.selectedProject}
              onProjectChange={(id, project) => setWizardState(prev => ({ 
                ...prev, 
                projectId: id, 
                selectedProject: project 
              }))}
              plantId={wizardState.plantId}
              fieldId={wizardState.fieldId}
              stationId={wizardState.stationId}
              onPlantChange={(id) => setWizardState(prev => ({ ...prev, plantId: id }))}
              onFieldChange={(id) => setWizardState(prev => ({ ...prev, fieldId: id }))}
              onStationChange={(id) => setWizardState(prev => ({ ...prev, stationId: id }))}
              locationMode={wizardState.locationMode}
              onLocationModeChange={(mode) => setWizardState(prev => ({ ...prev, locationMode: mode }))}
            />
          )}

          {/* Step 4: Scope & Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="equipment" className="text-base font-medium">
                  Equipment / Asset Name
                </Label>
                <Input
                  id="equipment"
                  value={wizardState.equipmentName}
                  onChange={(e) => setWizardState(prev => ({ ...prev, equipmentName: e.target.value }))}
                  placeholder="Enter equipment or asset name (e.g., Compressor K-101)"
                  maxLength={100}
                />
              </div>

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

          {/* Step 5: Review & Create */}
          {currentStep === 5 && (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-medium">{selectedCategory?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="font-medium">{selectedReason?.name || '—'}</p>
                  </div>
                  
                  {wizardState.additionalDetails && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Additional Details:</span>
                      <p className="font-medium">{wizardState.additionalDetails}</p>
                    </div>
                  )}

                  {wizardState.selectedAtiScopeIds.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" /> ATI Scopes:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {wizardState.selectedAtiScopeIds.map(scopeId => {
                          const scope = atiScopes?.find(s => s.id === scopeId);
                          return scope ? (
                            <span key={scopeId} className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                              {scope.code}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="col-span-2 pt-2 border-t">
                    <span className="text-muted-foreground">Location ({getLocationDisplay().type}):</span>
                    <p className="font-medium">{getLocationDisplay().primary}</p>
                    {getLocationDisplay().secondary && (
                      <p className="text-sm text-muted-foreground">{getLocationDisplay().secondary}</p>
                    )}
                    {getLocationDisplay().details.map((detail, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{detail}</p>
                    ))}
                  </div>

                  {wizardState.equipmentName && (
                    <div>
                      <span className="text-muted-foreground">Equipment:</span>
                      <p className="font-medium">{wizardState.equipmentName}</p>
                    </div>
                  )}

                  {wizardState.scopeDescription && (
                    <div className="col-span-2 pt-2 border-t">
                      <span className="text-muted-foreground">Scope:</span>
                      <p className="font-medium whitespace-pre-wrap">{wizardState.scopeDescription}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <p className="text-sm">
                  <strong>Note:</strong> The PSSR will be created as a <strong>Draft</strong>. 
                  You can add checklist items and assign approvers after creation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? handleClose : handleBack}
            disabled={isSubmitting}
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
