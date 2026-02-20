import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Check, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePSSRTieInScopes } from '@/hooks/usePSSRAtiScopes';
import { usePlants } from '@/hooks/usePlants';
import { useFields } from '@/hooks/useFields';
import { useStations } from '@/hooks/useStations';
import { usePSSRReasons } from '@/hooks/usePSSRReasons';
import WizardStepCategory from './wizard/WizardStepCategory';
import WizardStepDetails from './wizard/WizardStepDetails';
import WizardStepChecklistItems, { ChecklistItemOverrides } from './wizard/WizardStepChecklistItems';
import WizardStepApproversSetup from './wizard/WizardStepApproversSetup';
import { Attachment } from '@/components/ui/RichTextEditor';

interface CreatePSSRWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (pssrId: string) => void;
}

interface WizardState {
  // Step 1: Reason (template selection)
  categoryId: string;
  reasonId: string;
  selectedAtiScopeIds: string[];
  
  // Step 2: Details & Location
  title: string;
  scopeDescription: string;
  scopeAttachments: Attachment[];
  plantId: string;
  fieldId: string;
  stationId: string;
  
  // Step 3: Checklist Items
  selectedChecklistItemIds: string[];
  checklistItemOverrides: ChecklistItemOverrides;
  naItemIds: string[];
  templateChecklistItemIds: string[];
  configLoaded: boolean;
  configLoading: boolean;
  
  // Step 4: Approvers
  selectedPssrApproverRoleIds: string[];
  selectedSofApproverRoleIds: string[];
  templatePssrApproverRoleIds: string[];
  templateSofApproverRoleIds: string[];
}

const STEPS = [
  { id: 1, title: 'Reason', description: 'Select PSSR reason' },
  { id: 2, title: 'Details & Location', description: 'Title, scope and location' },
  { id: 3, title: 'PSSR Items', description: 'Review checklist items' },
  { id: 4, title: 'Approvers', description: 'PSSR & SoF approvers' },
];

const CreatePSSRWizard: React.FC<CreatePSSRWizardProps> = ({ open, onOpenChange, onSuccess }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: atiScopes } = usePSSRTieInScopes();
  const { data: reasons } = usePSSRReasons();
  const { plants } = usePlants();
  const { allFields: fields } = useFields();
  const { allStations: stations } = useStations();
  
  const [wizardState, setWizardState] = useState<WizardState>({
    categoryId: '',
    reasonId: '',
    selectedAtiScopeIds: [],
    title: '',
    scopeDescription: '',
    scopeAttachments: [],
    plantId: '',
    fieldId: '',
    stationId: '',
    selectedChecklistItemIds: [],
    checklistItemOverrides: {},
    naItemIds: [],
    templateChecklistItemIds: [],
    configLoaded: false,
    configLoading: false,
    selectedPssrApproverRoleIds: [],
    selectedSofApproverRoleIds: [],
    templatePssrApproverRoleIds: [],
    templateSofApproverRoleIds: [],
  });

  const selectedReason = reasons?.find(r => r.id === wizardState.reasonId);
  const selectedPlant = plants?.find(p => p.id === wizardState.plantId);
  const selectedField = fields?.find(f => f.id === wizardState.fieldId);
  const selectedStation = stations?.find(s => s.id === wizardState.stationId);

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardState({
      categoryId: '',
      reasonId: '',
      selectedAtiScopeIds: [],
      title: '',
      scopeDescription: '',
      scopeAttachments: [],
      plantId: '',
      fieldId: '',
      stationId: '',
      selectedChecklistItemIds: [],
      checklistItemOverrides: {},
      naItemIds: [],
      templateChecklistItemIds: [],
      configLoaded: false,
      configLoading: false,
      selectedPssrApproverRoleIds: [],
      selectedSofApproverRoleIds: [],
      templatePssrApproverRoleIds: [],
      templateSofApproverRoleIds: [],
    });
  };

  // Load configuration when entering Step 3
  useEffect(() => {
    const loadConfiguration = async () => {
      if (currentStep === 3 && wizardState.reasonId && !wizardState.configLoaded && !wizardState.configLoading) {
        setWizardState(prev => ({ ...prev, configLoading: true }));
        
        try {
          const { data: config } = await supabase
            .from('pssr_reason_configuration')
            .select('checklist_item_ids, pssr_approver_role_ids, sof_approver_role_ids')
            .eq('reason_id', wizardState.reasonId)
            .maybeSingle();
          
          const checklistIds = config?.checklist_item_ids || [];
          const pssrApproverIds = config?.pssr_approver_role_ids || [];
          const sofApproverIds = config?.sof_approver_role_ids || [];
          
          setWizardState(prev => ({
            ...prev,
            selectedChecklistItemIds: checklistIds,
            selectedPssrApproverRoleIds: pssrApproverIds,
            selectedSofApproverRoleIds: sofApproverIds,
            templateChecklistItemIds: checklistIds,
            templatePssrApproverRoleIds: pssrApproverIds,
            templateSofApproverRoleIds: sofApproverIds,
            configLoaded: true,
            configLoading: false,
          }));
        } catch (error) {
          console.error('Error loading configuration:', error);
          setWizardState(prev => ({ ...prev, configLoading: false }));
        }
      }
    };
    
    loadConfiguration();
  }, [currentStep, wizardState.reasonId, wizardState.configLoaded, wizardState.configLoading]);

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!wizardState.categoryId) {
          toast.error('Please select a PSSR reason');
          return false;
        }
        return true;
      case 2:
        if (!wizardState.title.trim()) {
          toast.error('Please enter a PSSR title');
          return false;
        }
        if (!wizardState.plantId) {
          toast.error('Please select a plant');
          return false;
        }
        return true;
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

      const plantValue = selectedPlant?.name || '';
      const csLocationValue = selectedStation?.name || '';

      const { data: newPSSR, error: pssrError } = await supabase
        .from('pssrs')
        .insert({
          pssr_id: pssrId,
          reason: selectedReason?.name || '',
          scope: wizardState.scopeDescription.trim() || null,
          asset: wizardState.title.trim(),
          status: 'DRAFT',
          user_id: user.id,
          plant: plantValue || null,
          cs_location: csLocationValue || null,
        })
        .select()
        .single();

      if (pssrError) throw pssrError;

      // Create checklist responses
      if (wizardState.selectedChecklistItemIds.length > 0) {
        const checklistResponses = wizardState.selectedChecklistItemIds.map((itemId: string) => ({
          pssr_id: newPSSR.id,
          checklist_item_id: itemId,
          status: 'pending',
          response: null,
        }));

        const { error: checklistError } = await supabase
          .from('pssr_checklist_responses')
          .insert(checklistResponses);

        if (checklistError) console.error('Error creating checklist responses:', checklistError);
      }

      // Create PSSR approvers
      if (wizardState.selectedPssrApproverRoleIds.length > 0) {
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .in('id', wizardState.selectedPssrApproverRoleIds);

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

          if (approverError) console.error('Error creating PSSR approvers:', approverError);
        }
      }

      // Create SoF certificate with approvers
      if (wizardState.selectedSofApproverRoleIds.length > 0) {
        const year = new Date().getFullYear();
        const sofNumber = `SOF-${year}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        const certificateText = `This Statement of Fitness certifies that all pre-startup safety review requirements have been satisfactorily completed for the ${selectedReason?.name || 'PSSR'} scope of work.`;
        
        const { data: sofCert, error: sofCertError } = await supabase
          .from('sof_certificates')
          .insert({
            pssr_id: newPSSR.id,
            certificate_number: sofNumber,
            pssr_reason: selectedReason?.name || '',
            certificate_text: certificateText,
            plant_name: plantValue || null,
            status: 'DRAFT',
          })
          .select()
          .single();

        if (sofCertError) {
          console.error('Error creating SoF certificate:', sofCertError);
        } else if (sofCert) {
          const { data: roles } = await supabase
            .from('roles')
            .select('id, name')
            .in('id', wizardState.selectedSofApproverRoleIds);

          if (roles && roles.length > 0) {
            const sofApprovers = roles.map((role, index) => ({
              sof_certificate_id: sofCert.id,
              pssr_id: newPSSR.id,
              approver_role: role.name,
              approver_name: 'Pending Assignment',
              approver_level: index + 1,
              status: 'LOCKED',
            }));

            const { error: sofApproverError } = await supabase
              .from('sof_approvers')
              .insert(sofApprovers);

            if (sofApproverError) console.error('Error creating SoF approvers:', sofApproverError);
          }
        }
      }

      // Save selected ATI scopes
      if (wizardState.selectedAtiScopeIds.length > 0) {
        const atiScopeRecords = wizardState.selectedAtiScopeIds.map(scopeId => ({
          pssr_id: newPSSR.id,
          ati_scope_id: scopeId,
        }));

        const { error: atiError } = await supabase
          .from('pssr_selected_ati_scopes')
          .insert(atiScopeRecords);

        if (atiError) console.error('Error saving ATI scopes:', atiError);
      }

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
          <DialogTitle className="text-xl font-semibold">
            Create New PSSR
          </DialogTitle>
          
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
          {/* Step 1: Reason (select PSSR template) */}
          {currentStep === 1 && (
            <WizardStepCategory
              categoryId={wizardState.categoryId}
              onCategoryChange={(id) => setWizardState(prev => ({ 
                ...prev, 
                categoryId: id,
                reasonId: id === '__other__' ? '' : id,
                selectedAtiScopeIds: [],
                configLoaded: false,
              }))}
            />
          )}

          {/* Step 2: Details & Location */}
          {currentStep === 2 && (
            <WizardStepDetails
              title={wizardState.title}
              onTitleChange={(title) => setWizardState(prev => ({ ...prev, title }))}
              scopeDescription={wizardState.scopeDescription}
              scopeAttachments={wizardState.scopeAttachments}
              onScopeChange={(html) => setWizardState(prev => ({ ...prev, scopeDescription: html }))}
              onAttachmentsChange={(attachments) => setWizardState(prev => ({ ...prev, scopeAttachments: attachments }))}
              plantId={wizardState.plantId}
              fieldId={wizardState.fieldId}
              stationId={wizardState.stationId}
              onPlantChange={(id) => setWizardState(prev => ({ ...prev, plantId: id }))}
              onFieldChange={(id) => setWizardState(prev => ({ ...prev, fieldId: id }))}
              onStationChange={(id) => setWizardState(prev => ({ ...prev, stationId: id }))}
            />
          )}

          {/* Step 3: PSSR Items */}
          {currentStep === 3 && (
            <WizardStepChecklistItems
              selectedItemIds={wizardState.selectedChecklistItemIds}
              itemOverrides={wizardState.checklistItemOverrides}
              onItemToggle={(itemId) => {
                setWizardState(prev => ({
                  ...prev,
                  selectedChecklistItemIds: prev.selectedChecklistItemIds.includes(itemId)
                    ? prev.selectedChecklistItemIds.filter(id => id !== itemId)
                    : [...prev.selectedChecklistItemIds, itemId]
                }));
              }}
              onSelectAllItems={(itemIds) => {
                setWizardState(prev => ({ ...prev, selectedChecklistItemIds: itemIds }));
              }}
              onDeselectAll={() => {
                setWizardState(prev => ({ ...prev, selectedChecklistItemIds: [] }));
              }}
              onItemOverrideChange={(itemId, override) => {
                setWizardState(prev => ({
                  ...prev,
                  checklistItemOverrides: { ...prev.checklistItemOverrides, [itemId]: override }
                }));
              }}
              onItemOverrideReset={(itemId) => {
                setWizardState(prev => {
                  const newOverrides = { ...prev.checklistItemOverrides };
                  delete newOverrides[itemId];
                  return { ...prev, checklistItemOverrides: newOverrides };
                });
              }}
              naItemIds={wizardState.naItemIds}
              onMarkNA={(itemId) => {
                setWizardState(prev => ({
                  ...prev,
                  naItemIds: [...prev.naItemIds, itemId],
                  selectedChecklistItemIds: prev.selectedChecklistItemIds.filter(id => id !== itemId),
                }));
              }}
              onRestoreNA={(itemId) => {
                setWizardState(prev => ({
                  ...prev,
                  naItemIds: prev.naItemIds.filter(id => id !== itemId),
                  selectedChecklistItemIds: [...prev.selectedChecklistItemIds, itemId],
                }));
              }}
              plantName={selectedPlant?.name}
              fieldName={selectedField?.name}
            />
          )}

          {/* Step 4: Approvers */}
          {currentStep === 4 && (
            <WizardStepApproversSetup
              selectedPssrApproverRoleIds={wizardState.selectedPssrApproverRoleIds}
              onPssrApproverToggle={(roleId) => {
                setWizardState(prev => ({
                  ...prev,
                  selectedPssrApproverRoleIds: prev.selectedPssrApproverRoleIds.includes(roleId)
                    ? prev.selectedPssrApproverRoleIds.filter(id => id !== roleId)
                    : [...prev.selectedPssrApproverRoleIds, roleId]
                }));
              }}
              isPssrApproversModified={
                JSON.stringify(wizardState.selectedPssrApproverRoleIds.sort()) !== 
                JSON.stringify(wizardState.templatePssrApproverRoleIds.sort())
              }
              onResetPssrApprovers={() => {
                setWizardState(prev => ({
                  ...prev,
                  selectedPssrApproverRoleIds: [...prev.templatePssrApproverRoleIds]
                }));
              }}
              selectedSofApproverRoleIds={wizardState.selectedSofApproverRoleIds}
              onSofApproverToggle={(roleId) => {
                setWizardState(prev => ({
                  ...prev,
                  selectedSofApproverRoleIds: prev.selectedSofApproverRoleIds.includes(roleId)
                    ? prev.selectedSofApproverRoleIds.filter(id => id !== roleId)
                    : [...prev.selectedSofApproverRoleIds, roleId]
                }));
              }}
              isSofApproversModified={
                JSON.stringify(wizardState.selectedSofApproverRoleIds.sort()) !== 
                JSON.stringify(wizardState.templateSofApproverRoleIds.sort())
              }
              onResetSofApprovers={() => {
                setWizardState(prev => ({
                  ...prev,
                  selectedSofApproverRoleIds: [...prev.templateSofApproverRoleIds]
                }));
              }}
              plantName={selectedPlant?.name}
            />
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
