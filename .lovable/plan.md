

## Problem

The Gantt chart's "Develop P2A Plan" overlay shows "Draft" with "Continue P2A Plan" even though the plan has been submitted (ACTIVE). The My Tasks overlay correctly shows "Pending Approval" with "View P2A Plan".

**Root cause**: The `ORAActivityTaskSheet` has a reconciliation guard (line 220) that checks `task?.status !== 'completed'` — if the task isn't in the "Done" column, it forces the P2A plan status to `DRAFT`. 

- **From Kanban**: `task.status` = `'completed'` (from `user_tasks` table, Done column) → guard doesn't fire → correct
- **From Gantt**: `task.status` is derived from `ora_plan_activities.status` = `'IN_PROGRESS'` → mapped to `'in_progress'` → guard fires → incorrectly overrides to DRAFT

## Fix

**File: `src/components/orp/ORPGanttChart.tsx`** (~line 720)

When constructing the P2A task object for `ORAActivityTaskSheet`, derive the `status` field from the P2A plan status (already available as `existingP2APlan`) rather than from the `ora_plan_activities.status`:

```typescript
// Line 720: Change status derivation for P2A tasks
status: existingP2APlan?.status === 'ACTIVE' || existingP2APlan?.status === 'COMPLETED' || existingP2APlan?.status === 'APPROVED'
  ? 'completed'
  : deliverable.status === 'COMPLETED' ? 'completed' 
  : deliverable.status === 'IN_PROGRESS' ? 'in_progress' 
  : 'pending',
```

This maps the P2A plan's submitted/approved state to `'completed'` so the reconciliation guard in `ORAActivityTaskSheet` doesn't override the real plan status. When the plan is DRAFT or doesn't exist, it falls back to the activity's own status.

**Single file, single line change.**

