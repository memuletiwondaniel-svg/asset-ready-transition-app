

## Root Cause Analysis

The bug keeps recurring because there are **two competing sources of truth** that get out of sync:

1. **`user_tasks.status`** — determines which Kanban column the card appears in
2. **`p2a_handover_plans.status`** — determines the badge ("Draft"/"Pending Approval"), CTA label ("Continue"/"View"), and intent text in the detail sheet

Previous migrations fixed `user_tasks.status` (moving the card to "In Progress") but left `p2a_handover_plans.status` as `ACTIVE`, or vice versa. The frontend reads the plan status directly from `p2a_handover_plans`, so whenever the card is in "In Progress" but the plan is `ACTIVE`, the detail sheet shows "Pending Approval" + "View P2A Plan".

Additionally, `user_tasks.metadata.plan_status` is `null` and `completion_percentage` is `71` — both stale.

## Current Database State (Inconsistent)
- `p2a_handover_plans.status` = **ACTIVE** (wrong — should be DRAFT)
- `user_tasks.status` = **in_progress** (correct for Kanban)
- `user_tasks.metadata.plan_status` = **null** (should be DRAFT)
- `user_tasks.metadata.completion_percentage` = **71** (should be 86)
- `ora_plan_activities.completion_percentage` = **71** (should be 86)
- `ora_plan_activities.status` = **IN_PROGRESS** (correct)

## Plan

### 1. Database Migration — Fix all three tables atomically
Single migration to synchronize:
- `p2a_handover_plans.status` → `DRAFT`
- `user_tasks.metadata` → `plan_status: 'DRAFT'`, `completion_percentage: 86`
- `ora_plan_activities.completion_percentage` → `86`
- Reset `p2a_handover_approvers` to `PENDING` status (since the plan is being reverted to draft)

### 2. Frontend Guard — Prevent recurrence
Add a **reconciliation guard** in `ORAActivityTaskSheet` that detects when the `user_tasks.status` is `in_progress` or `pending` but the plan status is `ACTIVE`, and overrides the displayed plan status to `DRAFT`. This ensures even if the DB gets out of sync again (e.g., from a partial migration or race condition), the UI stays consistent with the Kanban column.

Specifically in `ORAActivityTaskSheet.tsx` (~line 216-225):
- After fetching `existingP2APlan`, check if the task's own status indicates the card is NOT in the Done column (i.e., `task.status !== 'completed'`). If so, treat the plan as `DRAFT` regardless of what `p2a_handover_plans.status` says — because moving out of Done should have reverted it.
- This acts as a safety net: the canonical revert logic in `useKanbanDragDrop` should handle the DB update, but if it didn't fire (e.g., migration-based move), the UI still shows the correct state.

### 3. Same guard in `TaskDetailSheet.tsx` (~line 120-122)
Apply the identical reconciliation logic so both entry points are protected.

### Files to Change
- **New migration SQL** — fix DB state
- **`src/components/tasks/ORAActivityTaskSheet.tsx`** — add reconciliation guard (~5 lines near line 216)
- **`src/components/tasks/TaskDetailSheet.tsx`** — add matching guard (~5 lines near line 120)

