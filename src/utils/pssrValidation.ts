
import { PSSRData } from '@/hooks/usePSSRFormData';

export const validateStep = (step: number, formData: PSSRData): boolean => {
  switch (step) {
    case 1:
      return validateStepOne(formData);
    case 2:
      return validateStepTwo(formData);
    case 3:
      return true;
    default:
      return false;
  }
};

export const validateStepOne = (formData: PSSRData): boolean => {
  const hasReason = Boolean(formData.reason);
  const hasScope = Boolean(formData.scope);
  
  if (formData.reason === 'Start-up or Commissioning of a new Asset') {
    const hasProject = Boolean(formData.projectId && formData.projectName);
    return hasReason && hasScope && hasProject;
  } else {
    const hasAsset = Boolean(formData.asset);
    return hasReason && hasScope && hasAsset;
  }
};

export const validateStepTwo = (formData: PSSRData): boolean => {
  const hasHubLead = Boolean(formData.projectHubLead?.name && formData.projectHubLead?.email);
  const hasCommissioningLead = Boolean(formData.commissioningLead?.name && formData.commissioningLead?.email);
  const hasConstructionLead = Boolean(formData.constructionLead?.name && formData.constructionLead?.email);
  
  return hasHubLead && hasCommissioningLead && hasConstructionLead;
};
