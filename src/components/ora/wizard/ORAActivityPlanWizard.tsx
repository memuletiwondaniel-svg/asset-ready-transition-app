import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepPhaseSelection } from './StepPhaseSelection';
import { StepProjectType } from './StepProjectType';
import { StepActivities } from './StepActivities';
import { StepSchedule } from './StepSchedule';
import { StepReview } from './StepReview';
import { WizardActivity, catalogToWizardActivity } from './types';
import { useORAActivityCatalog } from '@/hooks/useORAActivityCatalog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ORAActivityPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

const STEP_LABELS = ['Phase', 'Type', 'Activities', 'Schedule', 'Review'];

// Map wizard phases to catalog phases
const PHASE_TO_CATALOG: Record<string, string> = {
  'IDENTIFY': 'IDENTIFY',
  'ASSESS': 'ASSESS',
  'SELECT': 'SELECT',
  'DEFINE': 'DEFINE',
  'EXECUTE': 'EXECUTE',
};

// Map wizard phases to orp_phase enum values
const PHASE_TO_ORP: Record<string, string> = {
  'IDENTIFY': 'ASSESS_SELECT',
  'ASSESS': 'ASSESS_SELECT',
  'SELECT': 'ASSESS_SELECT',
  'DEFINE': 'DEFINE',
  'EXECUTE': 'EXECUTE',
};

export const ORAActivityPlanWizard: React.FC<ORAActivityPlanWizardProps> = ({
  open, onOpenChange, projectId, onSuccess
}) => {
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState('');
  const [projectType, setProjectType] = useState('');
  const [activities, setActivities] = useState<WizardActivity[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Load activities from catalog when phase changes
  const catalogPhase = phase ? PHASE_TO_CATALOG[phase] : undefined;
  const { activities: catalogActivities, isLoading: catalogLoading } = useORAActivityCatalog(
    catalogPhase ? { phase: catalogPhase } : undefined
  );

  // When moving to step 3, load catalog activities
  useEffect(() => {
    if (step === 3 && catalogActivities.length > 0 && activities.length === 0) {
      setActivities(catalogActivities.map(catalogToWizardActivity));
    }
  }, [step, catalogActivities]);

  const resetForm = () => {
    setStep(1);
    setPhase('');
    setProjectType('');
    setActivities([]);
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const orpPhase = PHASE_TO_ORP[phase] || 'ASSESS_SELECT';

      // Create ORP plan
      const { data: plan, error: planError } = await supabase
        .from('orp_plans')
        .insert({
          project_id: projectId,
          phase: orpPhase as any,
          created_by: user.user.id,
          ora_engineer_id: user.user.id,
          status: 'DRAFT' as any,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Get selected activities
      const selectedActivities = activities.filter(a => a.selected);

      // For catalog activities, insert plan deliverables
      // For custom activities, we'll need to create catalog entries first or skip
      const catalogDeliverables = selectedActivities
        .filter(a => !a.id.startsWith('custom-'))
        .map(a => ({
          orp_plan_id: plan.id,
          deliverable_id: a.id,
          start_date: a.startDate || null,
          end_date: a.endDate || null,
          estimated_manhours: a.durationDays ? a.durationDays * 8 : a.estimatedManhours,
          status: 'NOT_STARTED' as any,
        }));

      if (catalogDeliverables.length > 0) {
        const { error: delError } = await supabase
          .from('orp_plan_deliverables')
          .insert(catalogDeliverables);

        if (delError) {
          console.warn('Some deliverables could not be linked:', delError.message);
        }
      }

      toast({ title: 'Success', description: 'ORA Activity Plan created successfully' });
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!phase;
      case 2: return !!projectType;
      case 3: return activities.some(a => a.selected);
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Create ORA Activity Plan
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-2">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < step;
            const isCurrent = stepNum === step;
            const isFuture = stepNum > step;

            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                    isCompleted && "border-2 border-emerald-600 text-emerald-600 bg-transparent",
                    isCurrent && "bg-primary text-primary-foreground scale-105 ring-2 ring-primary/30 animate-pulse",
                    isFuture && "bg-muted text-muted-foreground"
                  )}>
                    {stepNum}
                  </div>
                  <span className={cn(
                    "text-[11px] hidden sm:inline transition-colors",
                    isCompleted && "text-muted-foreground",
                    isCurrent && "text-foreground font-semibold",
                    isFuture && "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-[3px] rounded-full mx-1 transition-colors duration-300",
                    isCompleted ? "bg-emerald-600" : isCurrent ? "bg-amber-200" : "bg-border"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-auto py-2">
          {step === 1 && <StepPhaseSelection phase={phase} onPhaseChange={setPhase} />}
          {step === 2 && <StepProjectType projectType={projectType} onProjectTypeChange={setProjectType} />}
          {step === 3 && (
            catalogLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading activities...</span>
              </div>
            ) : (
              <StepActivities activities={activities} phase={phase} onActivitiesChange={setActivities} />
            )
          )}
          {step === 4 && <StepSchedule activities={activities} onActivitiesChange={setActivities} />}
          {step === 5 && <StepReview phase={phase} projectType={projectType} activities={activities} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < 5 ? (
            <Button onClick={() => {
              if (step === 2 && activities.length === 0) {
                // Reset activities when moving to step 3 so they reload
                setActivities([]);
              }
              setStep(step + 1);
            }} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
              ) : (
                'Create Plan'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
