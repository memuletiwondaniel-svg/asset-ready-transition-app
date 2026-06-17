import { describe, it, expect } from 'vitest';
import { computeUrgency, warningWindowFor } from './taskUrgency';
import type { UnifiedTask } from './useUnifiedTasks';

const NOW = new Date('2026-06-17T12:00:00');
const DAY = 86_400_000;

function makeTask(partial: Partial<UnifiedTask> & { kind?: 'approval' | 'plan_creation' | 'generic' }): UnifiedTask {
  const { kind = 'approval', ...rest } = partial;
  const meta =
    kind === 'plan_creation'
      ? { action: 'create_p2a_plan' }
      : kind === 'approval'
        ? { source: 'p2a_handover' }
        : {};
  return {
    id: 't1',
    title: 'x',
    category: 'action',
    categoryLabel: 'Action',
    kanbanColumn: 'todo',
    status: 'pending',
    isNew: false,
    createdAt: new Date(NOW.getTime() - 0 * DAY).toISOString(),
    userTask: { metadata: meta } as any,
    ...rest,
  } as UnifiedTask;
}

describe('computeUrgency — label grammar + precedence', () => {
  it('overdue 1 day → red "Overdue by 1 day"', () => {
    const t = makeTask({ dueDate: new Date(NOW.getTime() - 1 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'red', label: 'Overdue by 1 day', tone: 'red' });
  });

  it('overdue 3 days → red "Overdue by 3 days"', () => {
    const t = makeTask({ dueDate: new Date(NOW.getTime() - 3 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'red', label: 'Overdue by 3 days' });
  });

  it('due today → amber "Due today"', () => {
    const t = makeTask({ dueDate: new Date(NOW.getTime() + 2 * 3600_000).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'amber', label: 'Due today' });
  });

  it('due in 1 day, approval (2d window) → amber "Due in 1 day"', () => {
    const t = makeTask({ kind: 'approval', dueDate: new Date(NOW.getTime() + 1 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'amber', label: 'Due in 1 day', tone: 'amber' });
  });

  it('due in 5 days, approval → grey "Due in 5 days"', () => {
    const t = makeTask({ kind: 'approval', dueDate: new Date(NOW.getTime() + 5 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: 'Due in 5 days', tone: 'muted' });
  });

  it('due in 3 days, plan-creation (3d window) → amber', () => {
    const t = makeTask({ kind: 'plan_creation', dueDate: new Date(NOW.getTime() + 3 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'amber', label: 'Due in 3 days' });
  });

  it('due in 12 days → boundary: >10 falls through to age', () => {
    const created = new Date(NOW.getTime() - 4 * DAY).toISOString();
    const t = makeTask({ dueDate: new Date(NOW.getTime() + 12 * DAY).toISOString(), createdAt: created });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: 'Assigned 4 days ago' });
  });

  it('due in exactly 10 days → still grey due-in label (boundary)', () => {
    const t = makeTask({ dueDate: new Date(NOW.getTime() + 10 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: 'Due in 10 days' });
  });

  it('assigned today (no due date) → "Assigned today"', () => {
    const t = makeTask({ createdAt: NOW.toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: 'Assigned today' });
  });

  it('assigned today + isNew → accent tone', () => {
    const t = makeTask({ createdAt: NOW.toISOString(), isNew: true });
    expect(computeUrgency(t, NOW)).toMatchObject({ label: 'Assigned today', tone: 'accent' });
  });

  it('assigned 1 day ago → "Assigned 1 day ago"', () => {
    const t = makeTask({ createdAt: new Date(NOW.getTime() - 1 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: 'Assigned 1 day ago' });
  });

  it('assigned 4 days ago → "Assigned 4 days ago"', () => {
    const t = makeTask({ createdAt: new Date(NOW.getTime() - 4 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: 'Assigned 4 days ago' });
  });

  it('dateless task → falls back to age', () => {
    const t = makeTask({ dueDate: undefined, endDate: undefined, createdAt: new Date(NOW.getTime() - 2 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: 'Assigned 2 days ago' });
  });

  it('done column → grey rail, no label', () => {
    const t = makeTask({ kanbanColumn: 'done', dueDate: new Date(NOW.getTime() - 5 * DAY).toISOString() });
    expect(computeUrgency(t, NOW)).toMatchObject({ rail: 'grey', label: null });
  });
});

describe('warningWindowFor', () => {
  it('approval task → 2', () => {
    expect(warningWindowFor(makeTask({ kind: 'approval' }))).toBe(2);
  });
  it('plan-creation task → 3', () => {
    expect(warningWindowFor(makeTask({ kind: 'plan_creation' }))).toBe(3);
  });
  it('unknown/generic → defaults to 2', () => {
    expect(warningWindowFor(makeTask({ kind: 'generic' }))).toBe(2);
  });
});
