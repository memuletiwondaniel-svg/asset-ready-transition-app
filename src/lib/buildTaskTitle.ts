/**
 * Standardized task-title builder used by every user_tasks generator on the
 * client side and mirrored by the SQL helper `public.build_task_title(...)`
 * (see migration B-mig-1). Emits the canonical pattern:
 *
 *   "<Human action> for <Subject code> (<Subject name>)"
 *
 * e.g. "Review checklist bundle for VCR-DP300-02 (Diesel loading)"
 *      "Develop VCR plan for VCR-DP300-03 (Fuel offloading)"
 *      "Approve VCR plan for VCR-DP300-02 (Diesel loading)"
 *
 * Both the subject name and the trailing parenthetical are dropped when
 * unavailable, so the util degrades to just "<Human action> for <Code>" or
 * "<Human action>".
 */

export type CanonicalAction =
  // deliver family
  | 'deliver_vcr_checklist_bundle'
  | 'deliver_witness_hold'
  | 'deliver_critical_docs'
  | 'deliver_critical_docs_item'
  | 'deliver_procedures'
  | 'deliver_procedures_item'
  | 'deliver_procedures_registers'
  | 'deliver_training'
  | 'deliver_training_item'
  // develop / create family
  | 'develop_vcr_plan'
  | 'create_ora_plan'
  | 'create_p2a_plan'
  | 'create_vcr_delivery_plan'
  // review / approve family
  | 'review_vcr_checklist_bundle'
  | 'review_witness_hold'
  | 'review_qualification'
  | 'review_draft_pssr'
  | 'review_ora_plan'
  | 'review_p2a_plan'
  | 'review_vcr_plan'
  | 'training_review'
  | 'procedure_review'
  | 'register_review'
  // owner workflows
  | 'training_workflow'
  | 'procedure_workflow'
  | 'register_action'
  | 'complete_ora_activity'
  | 'complete_itp'
  | 'complete_witness_hold'
  // signature family
  | 'sof_signature'
  | 'pac_signature'
  // qualification family
  | 'qualification_decision';

const HUMAN_ACTION: Record<CanonicalAction, string> = {
  deliver_vcr_checklist_bundle: 'Deliver checklist bundle',
  deliver_witness_hold: 'Deliver witness & hold',
  deliver_critical_docs: 'Deliver critical documents',
  deliver_critical_docs_item: 'Deliver critical document',
  deliver_procedures: 'Deliver procedures',
  deliver_procedures_item: 'Deliver procedure',
  deliver_procedures_registers: 'Deliver operational registers',
  deliver_training: 'Deliver training package',
  deliver_training_item: 'Deliver training',
  develop_vcr_plan: 'Develop VCR plan',
  create_ora_plan: 'Create ORA plan',
  create_p2a_plan: 'Create P2A plan',
  create_vcr_delivery_plan: 'Create delivery plan',
  review_vcr_checklist_bundle: 'Review checklist bundle',
  review_witness_hold: 'Review witness & hold',
  review_qualification: 'Review qualification',
  review_draft_pssr: 'Review draft PSSR',
  review_ora_plan: 'Review ORA plan',
  review_p2a_plan: 'Review P2A plan',
  review_vcr_plan: 'Approve VCR plan',
  training_review: 'Review training',
  procedure_review: 'Review procedure',
  register_review: 'Review register',
  training_workflow: 'Progress training',
  procedure_workflow: 'Progress procedure',
  register_action: 'Progress register',
  complete_ora_activity: 'Complete ORA activity',
  complete_itp: 'Complete ITP',
  complete_witness_hold: 'Close witness & hold',
  sof_signature: 'Sign SoF',
  pac_signature: 'Sign PAC',
  qualification_decision: 'Decide on qualification request',
};

export interface BuildTaskTitleArgs {
  action: CanonicalAction | string;
  subjectCode?: string | null;   // e.g. VCR-DP300-02 / PSSR-01 / TRN-001
  subjectName?: string | null;   // e.g. "Diesel loading", provider name
  actionOverride?: string;       // caller-supplied verbatim action label
  isResubmit?: boolean;          // develop_vcr_plan resubmit variant
}

export function buildTaskTitle(args: BuildTaskTitleArgs): string {
  const verb = args.actionOverride
    ?? HUMAN_ACTION[args.action as CanonicalAction]
    ?? args.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const verbFinal = args.isResubmit ? `${verb} (resubmit)` : verb;

  const code = (args.subjectCode || '').trim();
  const name = (args.subjectName || '').trim();
  if (!code) return verbFinal;
  if (!name || name === code) return `${verbFinal} for ${code}`;
  return `${verbFinal} for ${code} (${name})`;
}

/**
 * Review-shape predicate — the single source of truth for the "My Reviews"
 * lens. Any user_task whose type OR metadata.action matches a review shape
 * belongs in the reviews lens. Keep this list in sync with the SQL enum
 * mirror in `public.is_review_task(...)`.
 */
const REVIEW_TASK_TYPES = new Set<string>([
  'vcr_approval_bundle',
  'pssr_approval_bundle',
  'ora_plan_review',
  'qualification_review',
  'training_review',
  'procedure_review',
  'register_review',
  'wh_review',
  'vcr_plan_review',
  'sof_signature',
  'pac_signature',
  // legacy consolidations (kept for the transition window)
  'approval',
  'review',
]);

export interface ReviewShape {
  type?: string | null;
  metadata?: { action?: string | null } | null;
}

export function isReviewShapedTask(t: ReviewShape | null | undefined): boolean {
  if (!t) return false;
  if (t.type && REVIEW_TASK_TYPES.has(t.type)) return true;
  const action = t.metadata?.action || '';
  return typeof action === 'string' && action.startsWith('review_');
}
