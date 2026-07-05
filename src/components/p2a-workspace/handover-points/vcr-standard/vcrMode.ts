/**
 * VCR mode resolution — shared by both overlay entry points
 * (p2a-workspace/handover-points/VCRDetailOverlay and widgets/VCRDetailOverlay).
 *
 * - execution: plan approved OR legacy/post-handover (SIGNED, gate signed,
 *   or in-flight items with no plan record). Renders VCRStandardView.
 * - plan_review: plan actively in the approval workflow
 *   (SUBMITTED / CHANGES_REQUESTED). Renders the legacy plan-review overlay.
 * - plan_draft: no plan yet, or plan still DRAFT. Renders the legacy
 *   overlay so the plan-creation wizard entry point stays intact.
 */
export type VCRMode = 'execution' | 'plan_review' | 'plan_draft';

export interface VCRModeInput {
  execution_plan_status?: string | null;
  status?: string | null;
  sof_signed_at?: string | null;
  pac_signed_at?: string | null;
}

export function resolveVCRMode(v: VCRModeInput): VCRMode {
  const eps = (v.execution_plan_status || '').toUpperCase();
  const status = (v.status || '').toUpperCase();
  const gateSigned = !!v.sof_signed_at || !!v.pac_signed_at;

  if (eps === 'APPROVED') return 'execution';
  if (status === 'SIGNED' || gateSigned) return 'execution';
  // Legacy VCRs pre-date the plan wizard — no plan row, but items in execution.
  if (!eps && (status === 'IN_PROGRESS' || status === 'READY')) return 'execution';

  if (eps === 'SUBMITTED' || eps === 'CHANGES_REQUESTED' || eps === 'IN_APPROVAL' || eps === 'PENDING_APPROVAL') {
    return 'plan_review';
  }
  return 'plan_draft';
}
