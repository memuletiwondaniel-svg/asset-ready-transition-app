// Urgency rail + label logic for My Tasks Kanban cards.
// Pure functions so they're easy to unit test.

import type { UnifiedTask } from './useUnifiedTasks';

export type RailColor = 'red' | 'amber' | 'grey';
export type LabelTone = 'red' | 'amber' | 'muted' | 'accent';

export interface UrgencyResult {
  rail: RailColor;
  label: string | null;
  tone: LabelTone;
}

const DAY_MS = 86_400_000;

// Floor to local-midnight day boundaries so "today / N days" math is stable.
function startOfLocalDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function daysBetween(target: Date, now: Date): number {
  return Math.round((startOfLocalDay(target) - startOfLocalDay(now)) / DAY_MS);
}

// Warning window (amber band) per task type, in days.
// Approval/review tasks: 2 days. Plan-creation tasks: 3 days. Default: 2.
export function warningWindowFor(task: UnifiedTask): number {
  const meta = (task.userTask?.metadata ?? {}) as Record<string, any>;
  const action = meta.action as string | undefined;
  const type = task.userTask?.type as string | undefined;
  const isPlanCreation =
    action === 'create_ora_plan' ||
    action === 'create_p2a_plan' ||
    action === 'create_vcr_delivery_plan' ||
    type === 'ora_plan_creation' ||
    type === 'p2a_plan_creation';
  return isPlanCreation ? 3 : 2;
}

function pluralDays(n: number): string {
  return n === 1 ? '1 day' : `${n} days`;
}

/**
 * Compute the rail color + meta-row label for a card.
 * Precedence:
 *   a. overdue           → red    "Overdue by N days"
 *   b. due today         → amber  "Due today"
 *   c. due ≤ window      → amber  "Due in N days"
 *   d. due ≤ 10 days     → grey   "Due in N days"
 *   e. else (>10d or no date) → grey "Assigned N days ago"
 *   f. done column       → grey, no label
 * The day-0 newly-assigned age label gets an accent tone (subtle pop in place
 * of the retired "New" pill).
 */
export function computeUrgency(
  task: UnifiedTask,
  now: Date = new Date(),
): UrgencyResult {
  // Done column → neutral rail, no urgency/age label.
  if (task.kanbanColumn === 'done') {
    return { rail: 'grey', label: null, tone: 'muted' };
  }

  const dueIso = task.dueDate || task.endDate;
  if (dueIso) {
    const due = new Date(dueIso);
    const delta = daysBetween(due, now); // negative = overdue, 0 = today
    if (delta < 0) {
      const days = Math.abs(delta);
      return { rail: 'red', label: `Overdue by ${pluralDays(days)}`, tone: 'red' };
    }
    if (delta === 0) {
      return { rail: 'amber', label: 'Due today', tone: 'amber' };
    }
    const window = warningWindowFor(task);
    if (delta <= window) {
      return { rail: 'amber', label: `Due in ${pluralDays(delta)}`, tone: 'amber' };
    }
    if (delta <= 10) {
      return { rail: 'grey', label: `Due in ${pluralDays(delta)}`, tone: 'muted' };
    }
    // Fall through to age fallback when due date is >10 days out.
  }

  // Age fallback (no due date, or due >10 days out).
  if (!task.createdAt) {
    return { rail: 'grey', label: null, tone: 'muted' };
  }
  const ageDays = Math.max(0, daysBetween(now, new Date(task.createdAt)));
  // Day-0 newly-assigned tasks get the accent tone (replacement for "New" pill).
  const tone: LabelTone = ageDays === 0 && task.isNew ? 'accent' : 'muted';
  const label = ageDays === 0 ? 'Assigned today' : `Assigned ${pluralDays(ageDays)} ago`;
  return { rail: 'grey', label, tone };
}
