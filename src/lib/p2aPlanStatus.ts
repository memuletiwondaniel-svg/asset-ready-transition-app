/**
 * Canonical P2A plan status → UI derivation.
 * SINGLE source of truth — every consumer (workspace card, header pill,
 * overlay header, dialogs) must read from here. No per-component
 * conditionals duplicated.
 *
 * Real enum values (see public.p2a_plan_status):
 *   DRAFT | PENDING_APPROVAL | ACTIVE | COMPLETED | ARCHIVED
 *
 * There is no REJECTED status on p2a_handover_plans (rejection is captured
 * separately on last_rejection_* columns; a rejected plan returns to DRAFT).
 */

export type P2APlanStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED';

export type P2APlanPrimaryAction = 'edit' | 'view' | 'create';

export interface P2APlanUIState {
  /** Short pill label for the header badge. */
  badgeLabel: string;
  /** Tailwind classes for the badge (semantic tokens preferred). */
  badgeClass: string;
  /** One-line helper text under the card. */
  helperText: string;
  /** Primary CTA label on the card. */
  primaryLabel: string;
  /** What clicking the primary CTA / header should do. */
  primaryAction: P2APlanPrimaryAction;
  /** True when the plan is locked from further editing. */
  isLocked: boolean;
  /** True when the plan is fully approved. */
  isApproved: boolean;
}

const STATES: Record<P2APlanStatus, P2APlanUIState> = {
  DRAFT: {
    badgeLabel: 'Draft',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    helperText: 'Continue setting up your handover plan',
    primaryLabel: 'Continue P2A Plan',
    primaryAction: 'edit',
    isLocked: false,
    isApproved: false,
  },
  PENDING_APPROVAL: {
    badgeLabel: 'Awaiting Approval',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    helperText: 'Awaiting approval',
    primaryLabel: 'View P2A Plan',
    primaryAction: 'view',
    isLocked: true,
    isApproved: false,
  },
  ACTIVE: {
    // Legacy "submitted / in review" status — same UX as PENDING_APPROVAL.
    badgeLabel: 'In Review',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    helperText: 'Your plan is awaiting approval',
    primaryLabel: 'View P2A Plan',
    primaryAction: 'view',
    isLocked: true,
    isApproved: false,
  },
  COMPLETED: {
    badgeLabel: 'Approved',
    badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    helperText: 'Your plan has been approved',
    primaryLabel: 'View P2A Plan',
    primaryAction: 'view',
    isLocked: true,
    isApproved: true,
  },
  ARCHIVED: {
    badgeLabel: 'Archived',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    helperText: 'This plan has been archived',
    primaryLabel: 'View P2A Plan',
    primaryAction: 'view',
    isLocked: true,
    isApproved: false,
  },
};

/**
 * Resolve a plan status string into its UI state. Unknown values fall back
 * to DRAFT so the UI never silently mislabels a submitted plan as approved.
 * If you see "Draft" for a submitted plan, the status string is unexpected —
 * fix the source, don't widen the fallback to a more permissive state.
 */
export function getP2APlanUIState(status: string | null | undefined): P2APlanUIState {
  if (!status) return STATES.DRAFT;
  const upper = status.toUpperCase() as P2APlanStatus;
  return STATES[upper] ?? STATES.DRAFT;
}

export function isP2APlanLocked(status: string | null | undefined): boolean {
  return getP2APlanUIState(status).isLocked;
}
