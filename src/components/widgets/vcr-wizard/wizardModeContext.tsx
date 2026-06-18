import { createContext, useContext } from 'react';

export interface VCRReviewPayload {
  /**
   * Approver row this viewer owns on the plan, or `null` for a view-only
   * launch (submitter / observer / non-approver). When `null` the wizard
   * runs in `review_only` sub-mode with no decision controls and the final
   * step renders the read-only approver-status board only.
   */
  approverRowId: string | null;
  handoverPointId: string;
  vcrCode: string;
  vcrName: string;
  projectCode?: string;
  projectId?: string;
  roleKey: string;
  roleLabel: string;
  phase: number | null;
}

/**
 * Wizard sub-mode (review-mode only).
 *
 * - `ora_edit`     — Phase-1 ORA Lead is the actionable approver. Authoring
 *                    affordances re-enable (body class swaps to
 *                    `vcr-ora-edit-mode`).
 * - `review_only`  — Any other review viewer (Phase-2 approver, already-
 *                    decided approver, or non-approver). Read-only.
 *
 * Derivation is keyed on `phase` + `my_actionable_row_id` from the plan
 * rollup, NOT on the free-text `role_label`. The Phase-1 actionable row
 * is the ORA Lead by construction (gated by `role_key='ora_lead'`).
 */
export type VCRWizardSubMode = 'ora_edit' | 'review_only';

export interface VCRWizardMode {
  mode: 'create' | 'review';
  subMode: VCRWizardSubMode | null;
  reviewPayload?: VCRReviewPayload | null;
}

/**
 * Snapshot shape persisted to `public.vcr_plan_snapshots.snapshot` (jsonb).
 * Consumers in Step 3 (snapshot writer RPC) and Step 4 (diff renderer) MUST
 * agree on this shape. The `active_vcr_item_ids` set will be produced by the
 * SAME `computeActiveVcrItems` helper used by `submit_vcr_plan`
 * (src/lib/vcrActiveItems.ts) — do not fork.
 */
export interface VCRPlanSnapshot {
  active_vcr_item_ids: string[];
  items_by_category: Record<string, string[]>;
  documents: unknown[];
  training: unknown[];
  procedures: unknown[];
  registers: unknown[];
  logsheets: unknown[];
  maintenance: unknown[];
  approvers: Array<{
    id: string;
    role_label: string;
    user_id: string | null;
    approver_order: number;
  }>;
}

export const VCRWizardModeContext = createContext<VCRWizardMode>({
  mode: 'create',
  subMode: null,
});
export const useVCRWizardMode = () => useContext(VCRWizardModeContext);
export const useIsReviewMode = () => useContext(VCRWizardModeContext).mode === 'review';
export const useVCRWizardSubMode = () => useContext(VCRWizardModeContext).subMode;
