

## Analysis: Rejected Task Card Behavior on Kanban

### Current Behavior
When a reviewer rejects a P2A plan:
1. **Reviewer's task** → set to `cancelled` status (disappears from the board or shows as cancelled)
2. **Other reviewers' tasks** → also cancelled
3. **Author's task** → moves back to "In Progress" at 86%
4. Plan reverts to DRAFT

### Enterprise SaaS Best Practice (Jira, ServiceNow, Monday.com, Asana)

The modern pattern is: **the reviewer's task should move to "Done"** — because the reviewer *did* complete their action (they reviewed and made a decision). "Cancelled" implies the task was abandoned, which is misleading.

**Recommended approach:**

1. **Reviewer's task → Done with "Rejected" banner**: The reviewer completed their review action. The card in "Done" should show a red "Rejected" badge/banner so it's visually distinct from approved tasks. This preserves the audit trail on the Kanban board.

2. **Author's task → In Progress** (already working correctly): The author needs to revise and resubmit.

3. **On resubmission → New approval task in "To Do"**: When the author resubmits, a fresh approval task is created for reviewers in the "To Do" column. The old rejected task stays in "Done" as a historical record. This is consistent with how ServiceNow and Jira handle approval cycles.

### Implementation Plan

**1. Change rejection status from `cancelled` to `completed` with rejection metadata**

In `useUserTasks.ts` (rejection cascade, ~line 279–354):
- Instead of setting reviewer task to `cancelled`, set it to `completed` with metadata flag `{ outcome: 'rejected' }`
- Keep the cancellation of *other* reviewers' pending tasks as-is (they didn't act)

**2. Add "Rejected" visual indicator on Done cards**

In `TaskKanbanBoard.tsx` (card rendering):
- Detect `metadata.outcome === 'rejected'` on completed approval tasks
- Render a small red "Rejected" badge on the card in the Done column

In `TaskDetailSheet.tsx`:
- Show a red banner at the top when viewing a rejected-but-done task: "You rejected this plan on [date]"

**3. Update all rejection handlers to use new pattern**

Files: `TaskTableView.tsx`, `ReviewTasksPanel.tsx`, `ORPActivitiesPanel.tsx`, `UnifiedTaskList.tsx`, `TaskKanbanBoard.tsx`
- Change `onReject` handlers from `updateTaskStatus(id, 'cancelled')` to `updateTaskStatus(id, 'completed')` (the metadata flagging happens in `useUserTasks.ts`)

**4. Ensure resubmission creates new tasks in "To Do"**

Already handled by the existing DB trigger `trg_auto_create_p2a_approval_task` — when the plan is resubmitted, new approval tasks are created. The old rejected tasks stay in Done as historical records.

### Files Modified
- `src/hooks/useUserTasks.ts` — change rejected task status to `completed` with `outcome: 'rejected'` metadata
- `src/components/tasks/TaskKanbanBoard.tsx` — add "Rejected" badge on done cards with rejection outcome
- `src/components/tasks/TaskDetailSheet.tsx` — add rejection banner for completed-but-rejected tasks
- `src/components/tasks/TaskTableView.tsx` — update reject handler
- `src/components/tasks/ReviewTasksPanel.tsx` — update reject handler
- `src/components/tasks/ORPActivitiesPanel.tsx` — update reject handler
- `src/components/tasks/UnifiedTaskList.tsx` — update reject handler

