import type { VCRApprover } from '@/components/widgets/vcr-wizard/steps/ApproversStep';

/**
 * Shared payload builder for `submit_vcr_plan`'s `p_approvers` argument.
 * Used by BOTH the create-mode submit flow (VCRConfirmationStep) and the
 * ORA-edit-mode "Save changes" action in review mode — do NOT fork.
 *
 * The RPC reconciles the roster server-side; this function only shapes the
 * client-side roster (which lives in ApproversStep's local state) into the
 * RPC's expected element shape.
 */
export interface VcrSubmitApproverPayload {
  user_id: string;
  role_key: string;
  role_label: string;
  approver_order: number;
}

export function buildVcrSubmitApproverPayload(
  roster: VCRApprover[] | undefined | null,
): VcrSubmitApproverPayload[] {
  return (roster || [])
    .filter((a) => !!a.user_id)
    .map((a) => ({
      user_id: a.user_id as string,
      role_key: a.role_key || 'custom',
      role_label: a.role_name,
      approver_order: a.display_order,
    }));
}
