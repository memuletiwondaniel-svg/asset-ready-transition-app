import { describe, it, expect } from 'vitest';
import { isApprovedPlanCardLocked } from '../TaskKanbanBoard';
import type { UnifiedTask } from '../useUnifiedTasks';

function mkTask(partial: Partial<UnifiedTask> & {
  kanbanColumn: UnifiedTask['kanbanColumn'];
  action?: string;
  type?: string;
  planStatus?: string;
}): UnifiedTask {
  const { action, type, planStatus, ...rest } = partial;
  return {
    ...(rest as any),
    userTask: {
      id: 'ut-1',
      type,
      metadata: { action, plan_status: planStatus },
    } as any,
  } as UnifiedTask;
}

describe('isApprovedPlanCardLocked', () => {
  it('locks approved P2A plan card in Done', () => {
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'done', action: 'create_p2a_plan', planStatus: 'COMPLETED',
    }))).toBe(true);
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'done', action: 'create_p2a_plan', planStatus: 'ACTIVE',
    }))).toBe(true);
  });

  it('locks approved ORA plan card in Done (both APPROVED and COMPLETED)', () => {
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'done', action: 'create_ora_plan', planStatus: 'APPROVED',
    }))).toBe(true);
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'done', type: 'ora_plan_creation', planStatus: 'COMPLETED',
    }))).toBe(true);
  });

  it('does NOT lock an in-progress plan card', () => {
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'in_progress', action: 'create_p2a_plan', planStatus: 'DRAFT',
    }))).toBe(false);
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'done', action: 'create_p2a_plan', planStatus: 'DRAFT',
    }))).toBe(false);
  });

  it('does NOT lock a generic completed task', () => {
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'done', action: 'some_other_action',
    }))).toBe(false);
    expect(isApprovedPlanCardLocked({ kanbanColumn: 'done' } as UnifiedTask)).toBe(false);
  });

  it('does NOT lock approved plan card sitting in other columns', () => {
    expect(isApprovedPlanCardLocked(mkTask({
      kanbanColumn: 'todo', action: 'create_ora_plan', planStatus: 'APPROVED',
    }))).toBe(false);
  });
});
