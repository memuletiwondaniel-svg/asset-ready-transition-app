import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Check, Loader2, X, CalendarIcon, Box, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVCRTemplates, VCRTemplate } from '@/hooks/useVCRTemplates';
import { usePACCategories, PACCategory } from '@/hooks/useHandoverPrerequisites';

interface CreateVCRWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectCode: string;
  onSuccess?: (vcrId: string) => void;
}

interface System {
  id: string;
  system_id: string;
  name: string;
  description: string | null;
  is_hydrocarbon: boolean;
}

interface WizardState {
  // Step 1: VCR Name
  name: string;
  description: string;
  
  // Step 2: Systems
  selectedSystemIds: string[];
  
  // Step 3: Phase/Milestone
  targetDate: Date | undefined;
  phaseId: string;
  
  // Step 4: VCR Items (Prerequisites)
  selectedPrerequisiteIds: string[];
}

const STEPS = [
  { id: 1, title: 'VCR Details', description: 'Enter VCR name and description' },
  { id: 2, title: 'Systems', description: 'Select applicable systems' },
  { id: 3, title: 'Schedule', description: 'Set target date and phase' },
  { id: 4, title: 'VCR Items', description: 'Select applicable checklist items' },
];

export const CreateVCRWizard: React.FC<CreateVCRWizardProps> = ({
  open,
  onOpenChange,
  projectId,
  projectCode,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [handoverPlanId, setHandoverPlanId] = useState<string | null>(null);
  const [systems, setSystems] = useState<System[]>([]);
  const [phases, setPhases] = useState<{ id: string; name: string }[]>([]);
  
  const { data: vcrTemplates } = useVCRTemplates();
  const { data: categories } = usePACCategories();

  const [wizardState, setWizardState] = useState<WizardState>({
    name: '',
    description: '',
    selectedSystemIds: [],
    targetDate: undefined,
    phaseId: '',
    selectedPrerequisiteIds: [],
  });

  // Fetch handover plan and systems when dialog opens
  useEffect(() => {
    const fetchData = async () => {
      if (!open || !projectId) return;

      // Get handover plan for this project
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const planResult = await client
        .from('p2a_handover_plans')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      const plan = planResult.data;

      if (!plan) {
        // No handover plan exists - we'll create one when VCR is submitted
        setHandoverPlanId(null);
        setSystems([]);
        setPhases([]);
        return;
      }

      setHandoverPlanId(plan.id);

      // Fetch systems for this plan
      const systemsResult = await client
        .from('p2a_systems')
        .select('id, system_id, name, is_hydrocarbon')
        .eq('handover_plan_id', plan.id)
        .order('system_id');

      const systemsData = systemsResult.data || [];
      setSystems(systemsData.map((s: any) => ({
        id: s.id,
        system_id: s.system_id,
        name: s.name,
        description: null,
        is_hydrocarbon: s.is_hydrocarbon,
      })));

      // Fetch phases
      const phasesResult = await client
        .from('p2a_project_phases')
        .select('id, name')
        .eq('handover_plan_id', plan.id)
        .order('display_order');

      setPhases(phasesResult.data || []);
    };

    fetchData();
  }, [open, projectId, projectCode]);

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardState({
      name: '',
      description: '',
      selectedSystemIds: [],
      targetDate: undefined,
      phaseId: '',
      selectedPrerequisiteIds: [],
    });
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!wizardState.name.trim()) {
          toast.error('Please enter a VCR name');
          return false;
        }
        return true;
      case 2:
        // Systems are optional
        return true;
      case 3:
        // Schedule is optional
        return true;
      case 4:
        // Items are optional
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

  const handleSubmit = async () => {
    if (!handoverPlanId) {
      toast.error('No handover plan found');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate VCR code — strip "DP-" prefix since the RPC adds "DP" itself
      const rawCode = projectCode.replace(/^DP-?/i, '');
      const { data: vcrCode, error: vcrError } = await supabase.rpc('generate_vcr_code', {
        p_project_code: rawCode,
      });

      if (vcrError) throw vcrError;

      // Create VCR (handover point)
      const { data: newVCR, error: createError } = await supabase
        .from('p2a_handover_points')
        .insert({
          handover_plan_id: handoverPlanId,
          phase_id: wizardState.phaseId || null,
          vcr_code: vcrCode,
          name: wizardState.name,
          description: wizardState.description || null,
          target_date: wizardState.targetDate ? format(wizardState.targetDate, 'yyyy-MM-dd') : null,
          position_x: 0,
          position_y: 0,
          status: 'PENDING',
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Assign systems to VCR
      if (wizardState.selectedSystemIds.length > 0) {
        const systemAssignments = wizardState.selectedSystemIds.map(systemId => ({
          handover_point_id: newVCR.id,
          system_id: systemId,
          assigned_by: user.id,
        }));

        await supabase.from('p2a_handover_point_systems').insert(systemAssignments);
      }

      // Create prerequisites from templates
      if (wizardState.selectedPrerequisiteIds.length > 0 && vcrTemplates) {
        const selectedTemplates = vcrTemplates.filter(t => 
          wizardState.selectedPrerequisiteIds.includes(t.id)
        );

        const prereqs = selectedTemplates.map((template, index) => ({
          handover_point_id: newVCR.id,
          summary: template.summary,
          description: template.description,
          status: 'NOT_STARTED' as const,
          delivering_party_id: template.delivering_party_role_id,
          receiving_party_id: template.receiving_party_role_id,
          display_order: index,
        }));

        await supabase.from('p2a_vcr_prerequisites').insert(prereqs);
      }

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['project-vcrs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['p2a-handover-points', handoverPlanId] });

      toast.success(`VCR ${vcrCode} created successfully!`);
      handleClose();
      onSuccess?.(newVCR.id);
    } catch (error: any) {
      console.error('Failed to create VCR:', error);
      toast.error(error.message || 'Failed to create VCR');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  const toggleSystem = (systemId: string) => {
    setWizardState(prev => ({
      ...prev,
      selectedSystemIds: prev.selectedSystemIds.includes(systemId)
        ? prev.selectedSystemIds.filter(id => id !== systemId)
        : [...prev.selectedSystemIds, systemId],
    }));
  };

  const togglePrerequisite = (prereqId: string) => {
    setWizardState(prev => ({
      ...prev,
      selectedPrerequisiteIds: prev.selectedPrerequisiteIds.includes(prereqId)
        ? prev.selectedPrerequisiteIds.filter(id => id !== prereqId)
        : [...prev.selectedPrerequisiteIds, prereqId],
    }));
  };

  // Group templates by category
  const templatesByCategory = vcrTemplates?.reduce((acc, template) => {
    const catId = template.category_id || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(template);
    return acc;
  }, {} as Record<string, VCRTemplate[]>) || {};

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vcr-name">VCR Name *</Label>
              <Input
                id="vcr-name"
                value={wizardState.name}
                onChange={(e) => setWizardState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Power and Utilities"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vcr-description">Description</Label>
              <Textarea
                id="vcr-description"
                value={wizardState.description}
                onChange={(e) => setWizardState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the scope of this VCR..."
                rows={3}
              />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                VCR Code (Auto-generated)
              </div>
              <div className="font-mono text-sm font-medium">
                VCR-###-{projectCode}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Systems</Label>
              <span className="text-xs text-muted-foreground">
                {wizardState.selectedSystemIds.length} selected
              </span>
            </div>
            {systems.length > 0 ? (
              <ScrollArea className="h-[300px] border rounded-lg p-3">
                <div className="space-y-2">
                  {systems.map((system) => (
                    <div
                      key={system.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        wizardState.selectedSystemIds.includes(system.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => toggleSystem(system.id)}
                    >
                      <Checkbox
                        checked={wizardState.selectedSystemIds.includes(system.id)}
                        onCheckedChange={() => toggleSystem(system.id)}
                      />
                      <Box className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{system.name}</div>
                        <div className="text-xs text-muted-foreground">{system.system_id}</div>
                      </div>
                      {system.is_hydrocarbon && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          HC
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No systems available</p>
                <p className="text-xs">Systems can be added later</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Completion Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !wizardState.targetDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {wizardState.targetDate ? format(wizardState.targetDate, 'PPP') : 'Select a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={wizardState.targetDate}
                    onSelect={(date) => setWizardState(prev => ({ ...prev, targetDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {phases.length > 0 && (
              <div className="space-y-2">
                <Label>Phase (Optional)</Label>
                <div className="space-y-2">
                  {phases.map((phase) => (
                    <div
                      key={phase.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        wizardState.phaseId === phase.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setWizardState(prev => ({ 
                        ...prev, 
                        phaseId: prev.phaseId === phase.id ? '' : phase.id 
                      }))}
                    >
                      <Checkbox
                        checked={wizardState.phaseId === phase.id}
                        onCheckedChange={() => setWizardState(prev => ({ 
                          ...prev, 
                          phaseId: prev.phaseId === phase.id ? '' : phase.id 
                        }))}
                      />
                      <span className="text-sm font-medium">{phase.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select VCR Checklist Items</Label>
              <span className="text-xs text-muted-foreground">
                {wizardState.selectedPrerequisiteIds.length} selected
              </span>
            </div>
            {vcrTemplates && vcrTemplates.length > 0 ? (
              <ScrollArea className="h-[300px] border rounded-lg p-3">
                <div className="space-y-4">
                  {Object.entries(templatesByCategory).map(([categoryId, templates]) => {
                    const category = categories?.find(c => c.id === categoryId);
                    return (
                      <div key={categoryId} className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {category?.display_name || 'General'}
                        </div>
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              wizardState.selectedPrerequisiteIds.includes(template.id)
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => togglePrerequisite(template.id)}
                          >
                            <Checkbox
                              checked={wizardState.selectedPrerequisiteIds.includes(template.id)}
                              onCheckedChange={() => togglePrerequisite(template.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{template.summary}</div>
                              {template.description && (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No VCR templates available</p>
                <p className="text-xs">Checklist items can be added later</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Create New VCR
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
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
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
                  Create VCR
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
