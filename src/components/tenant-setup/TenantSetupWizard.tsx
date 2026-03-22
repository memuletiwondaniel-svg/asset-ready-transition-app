import React, { useState, useCallback } from 'react';
import { WizardShell, WizardShellStep } from '@/components/widgets/shared/WizardShell';
import { Building2, Factory, MapPin, Network, Users, ShieldCheck, UserPlus } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { OrgStep } from './steps/OrgStep';
import { PlantsStep } from './steps/PlantsStep';
import { FieldsStep } from './steps/FieldsStep';
import { HubsStep } from './steps/HubsStep';
import { CommissionsStep } from './steps/CommissionsStep';
import { RolesStep } from './steps/RolesStep';
import { UsersStep } from './steps/UsersStep';

const STEPS: WizardShellStep[] = [
  { id: 'org', label: 'Organisation', icon: Building2 },
  { id: 'plants', label: 'Plants', icon: Factory },
  { id: 'fields', label: 'Fields', icon: MapPin },
  { id: 'hubs', label: 'Hubs', icon: Network },
  { id: 'commissions', label: 'Commissions', icon: Users },
  { id: 'roles', label: 'Roles', icon: ShieldCheck },
  { id: 'users', label: 'Invite Users', icon: UserPlus },
];

interface TenantSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TenantSetupWizard: React.FC<TenantSetupWizardProps> = ({ open, onOpenChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { tenantName } = useTenant();

  const markComplete = useCallback((idx: number) => {
    setCompletedSteps(prev => new Set(prev).add(idx));
  }, []);

  const handleNext = () => {
    markComplete(currentStep);
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const isLastStep = currentStep === STEPS.length - 1;

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <OrgStep onComplete={() => markComplete(0)} />;
      case 1: return <PlantsStep onComplete={() => markComplete(1)} />;
      case 2: return <FieldsStep onComplete={() => markComplete(2)} />;
      case 3: return <HubsStep onComplete={() => markComplete(3)} />;
      case 4: return <CommissionsStep onComplete={() => markComplete(4)} />;
      case 5: return <RolesStep onComplete={() => markComplete(5)} />;
      case 6: return <UsersStep onComplete={() => markComplete(6)} onFinish={() => onOpenChange(false)} />;
      default: return null;
    }
  };

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="Tenant Setup Wizard"
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      isStepComplete={(idx) => completedSteps.has(idx)}
      header={
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground truncate">Setup Wizard</p>
          <p className="text-[11px] text-muted-foreground truncate">{tenantName || 'New Organisation'}</p>
        </div>
      }
      navigation={{
        onBack: handleBack,
        onNext: handleNext,
        canGoBack: currentStep > 0,
        canProceed: true,
        submitLabel: isLastStep ? 'Finish Setup' : undefined,
        onSubmit: isLastStep ? () => onOpenChange(false) : undefined,
      }}
    >
      {renderStep()}
    </WizardShell>
  );
};
