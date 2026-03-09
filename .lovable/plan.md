
## Problem Analysis

**Issue 1: "Create ORA Plan" task showing in "In Progress" instead of "Done"**
- The `useUserTasks` hook fetches tasks with statuses: `pending`, `in_progress`, `waiting`, `completed`
- When a plan gets approved, the ORA plan task (`type: ora_plan_creation`) should be automatically marked `completed` — but its `status` may still be `in_progress` or `pending` in `user_tasks` if the DB trigger didn't update it
- The `mapToKanbanColumn` function in `useUnifiedTasks.ts` maps `completed` → `done`, but if `user_tasks.status = 'in_progress'`, the card stays in "In Progress"
- **Root cause**: The `kanbanColumn` for `create_ora_plan` type tasks doesn't check the actual ORA plan's approval status (`orp_plans.status = 'APPROVED'`) — it only looks at `user_tasks.status`

**Issue 2: No guard against reverting approved workflow tasks**
- The `useKanbanDragDrop.ts` allows any task to be dragged to `todo`, `in_progress`, or `waiting` without checking if it's an approval-backed workflow task
- `TaskDetailSheet.tsx` renders but doesn't guard against status downgrades for approved plans

## Solution Plan

### Part 1 — Fix the "Create ORA Plan" task showing in "In Progress"
The `mapToKanbanColumn` logic needs to detect workflow-completion tasks whose underlying plan is approved. This can be done by:
1. Fetching the ORA plan status in `useUnifiedTasks.ts` (it already has `oraActivityDates` from `useUserTasks`) — or more precisely, checking `orp_plans` status in the `useUserTasks` hook alongside existing fetching
2. Alternatively: in the `useUnifiedTasks.ts` `useMemo`, check if a task with `action === 'create_ora_plan'` has `meta.plan_status === 'APPROVED'` or if there's a linked plan that is approved — and force `kanbanColumn: 'done'`

**Simpler approach (no extra query)**: In `useUserTasks.ts`, when fetching regular tasks, also fetch the linked ORA plan status from `orp_plans` for plan-creation tasks and set `metadata.plan_status` accordingly. Or, in `useUnifiedTasks.ts`, if `t.type === 'ora_plan_creation'` and we can detect plan is approved, force column to `done`. 

Since the task `status` in `user_tasks` should already be `completed` when the plan is approved (the submission flow in `ORAActivityPlanWizard.tsx` marks the task completed), the real issue is the task is still showing as `in_progress`. The fix should check: for `ora_plan_creation` tasks, also check `orp_plans` status. I'll add a query to fetch linked plan statuses in `useUserTasks.ts`.

### Part 2 — Warning dialog for reverting approved workflow tasks

Define "protected workflow tasks" = tasks that have gone through external approval:
- `action === 'create_ora_plan'` (ORA Plan approved)
- `action === 'create_p2a_plan'` (P2A Plan completed)
- `type === 'ora_plan_review'` (approved plans)
- Any task with `kanbanColumn === 'done'`

**Implementation in `useKanbanDragDrop.ts`**:
- Add logic to detect if a task is a "protected workflow task" (has underlying approved plan)
- If dragging such a task backward (done → in_progress/todo/waiting, or any approved plan task to a lower state), return `'needs_warning'` instead of proceeding
- In `TaskKanbanBoard.tsx`, intercept this and show a warning dialog

**Warning Dialog Design (modern UX)**:
- Destructive alert dialog with:
  - Red/amber warning icon
  - Title: "Void All Approvals?"
  - Body: explains that moving this task will void the existing approval chain and the workflow will need to restart
  - Two actions: "Cancel" (safe, keeps current position) and "Move Anyway – Void Approvals" (destructive, red)
  - Checkbox: "I understand this will void all approvals and require a new review cycle"

### Files to Modify

1. **`src/hooks/useUserTasks.ts`** — Add fetching of linked plan status for `ora_plan_creation` tasks so that approved plans show `status: 'completed'` or `kanbanColumn: 'done'`

2. **`src/components/tasks/useUnifiedTasks.ts`** — In `mapToKanbanColumn`, add a check for plan-creation task types where the plan is `APPROVED`/`COMPLETED` → force `done`

3. **`src/components/tasks/useKanbanDragDrop.ts`** — Add:
   - `isProtectedWorkflowTask(task)` helper — detects tasks backed by external approvals
   - `checkIfApprovalWouldBeVoided(task, targetColumn)` — returns `true` if moving would void approvals
   - Return a new status `'needs_warning'` from `moveTaskToColumn` instead of proceeding

4. **`src/components/tasks/TaskKanbanBoard.tsx`** — Add:
   - `ApprovalVoidWarningDialog` component — the warning dialog with destructive styling, explanatory copy, and a confirmation checkbox
   - State: `[warningState, setWarningState]` holding `{ task, targetColumn }` when warning is triggered
   - Hook: intercept `handleDragEnd` to check if warning needed before moving
   - On confirm: call `moveTaskToColumn` forcefully, bypassing the guard

### Warning Dialog Specification

```text
┌─────────────────────────────────────────────┐
│  🚨  Void All Approvals?                    │
│                                             │
│  "Create ORA Plan" has already been        │
│  approved through a formal review process. │
│                                             │
│  Moving this task back will:               │
│  • Void all existing approvals             │
│  • Require a completely new review cycle   │
│  • Notify all approvers of the change      │
│                                             │
│  ☐ I understand this action cannot be      │
│    easily undone                            │
│                                             │
│  [Cancel]  [Move Anyway – Void Approvals]   │
└─────────────────────────────────────────────┘
```

### How to detect "is a workflow-approved task"

In `useUnifiedTasks.ts`, when building the unified task list for `ora_plan_creation` type tasks, add a flag `isApprovalProtected: true` if:
- `task.category === 'ora'` AND `meta.action === 'create_ora_plan'` AND `meta.plan_status` is `APPROVED` or `COMPLETED`
- OR `task.category === 'p2a'` AND `meta.action === 'create_p2a_plan'`

Add `isApprovalProtected?: boolean` field to `UnifiedTask` interface.

In `useKanbanDragDrop.ts`, check `task.isApprovalProtected` and if `targetColumn` is not `done`, trigger the warning.

For Part 1 fix, the cleanest solution is: in `useUserTasks.ts`, after fetching tasks, identify `ora_plan_creation` tasks and batch-fetch the plan status from `orp_plans` using the `project_id` from metadata, then annotate the task's metadata with `plan_status`. Then in `useUnifiedTasks.ts`, if `plan_status === 'APPROVED'`, override `kanbanColumn` to `done`.
