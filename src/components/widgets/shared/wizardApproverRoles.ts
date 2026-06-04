/**
 * Canonical wizard approver role labels — single source of truth.
 *
 * Labels MUST be byte-identical to `roles.name` (Mig 5c validator). They
 * are passed directly to `resolve_project_role_user` via
 * `useProjectRoleUsers`. Used by:
 *   - P2A Plan wizard (ApprovalSetupStep)
 *   - VCR Plan wizard (ApproversStep)
 *   - ORA Activity Plan wizard
 *
 * Ordering is the canonical approval sequence — do not reorder per
 * wizard. If a wizard needs a different list, slice from this catalog;
 * never invent a new order.
 */

export interface WizardApproverRole {
  key: string;
  /** Byte-identical to roles.name */
  label: string;
  order: number;
  /** Parallel/sequential phase grouping used by P2A gate model. */
  phase: 1 | 2;
}

export const P2A_AND_VCR_APPROVER_ROLES: readonly WizardApproverRole[] = [
  { key: 'ora_lead',              label: 'ORA Lead',             order: 1, phase: 1 },
  { key: 'construction_lead',     label: 'Construction Lead',    order: 2, phase: 1 },
  { key: 'commissioning_lead',    label: 'Commissioning Lead',   order: 3, phase: 1 },
  { key: 'hub_lead',              label: 'Project Hub Lead',     order: 4, phase: 2 },
  { key: 'deputy_plant_director', label: 'Dep. Plant Director',  order: 5, phase: 2 },
] as const;

export const ORA_ACTIVITY_APPROVER_ROLES: readonly WizardApproverRole[] = [
  { key: 'ora_lead',              label: 'ORA Lead',             order: 1, phase: 1 },
  { key: 'hub_lead',              label: 'Project Hub Lead',     order: 2, phase: 2 },
  { key: 'deputy_plant_director', label: 'Dep. Plant Director',  order: 3, phase: 2 },
] as const;

/** Deputy Plant Director is plant-scoped and uses its own SECURITY DEFINER
 *  RPC (`find_deputy_plant_director`). Filter it out when calling
 *  `useProjectRoleUsers` (which is project-team-scoped). */
export const DEPUTY_DIRECTOR_KEY = 'deputy_plant_director';

export function rpcResolvedLabels(roles: readonly WizardApproverRole[]): string[] {
  return roles.filter(r => r.key !== DEPUTY_DIRECTOR_KEY).map(r => r.label);
}
