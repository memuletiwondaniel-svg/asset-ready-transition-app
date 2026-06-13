import { createContext, useContext } from 'react';

export interface VCRReviewPayload {
  approverRowId: string;
  handoverPointId: string;
  vcrCode: string;
  vcrName: string;
  projectCode?: string;
  projectId?: string;
  roleKey: string;
  roleLabel: string;
  phase: number | null;
}

export interface VCRWizardMode {
  mode: 'create' | 'review';
  reviewPayload?: VCRReviewPayload | null;
}

export const VCRWizardModeContext = createContext<VCRWizardMode>({ mode: 'create' });
export const useVCRWizardMode = () => useContext(VCRWizardModeContext);
export const useIsReviewMode = () => useContext(VCRWizardModeContext).mode === 'review';
