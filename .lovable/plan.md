

## Root Cause Analysis

The `reopen_task` RPC (used for generic Done→In Progress reverts) only does two things:
1. Updates the source task status to `in_progress`
2. Logs a `reopened` comment

It does **not**:
- Delete or cancel reviewer tasks already created in the approver's tray
- Reset `task_reviewers` records back to `PENDING`
- Clear reviewer decisions (`decided_at`, `comments`)

So when you move a card from Done to In Progress, the task status updates but the approver's review card remains in their tray as if still needing review.

Additionally, a regular ORA activity task (not ORA plan creation, not P2A) with ad-hoc reviewers falls into the `isGenericRevert` path, which doesn't handle ORA-activity-specific reviewer cleanup.

## Changes

### 1. Update `reopen_task` RPC (new migration)

Extend the function to also:
- **Delete reviewer tasks** from `user_tasks` where `metadata->>'source_task_id' = p_task_id` and status is not already `completed`
- **Reset `task_reviewers`** for the source task: set status back to `PENDING`, clear `decided_at` and `comments`

```sql
-- Inside reopen_task, after status update and before logging:
-- 1) Delete pending/in_progress reviewer tasks from approvers' trays
DELETE FROM user_tasks
WHERE type = 'review'
  AND metadata->>'source' = 'task_review'
  AND metadata->>'source_task_id' = p_task_id::text
  AND status IN ('pending', 'in_progress', 'waiting');

-- 2) Reset task_reviewers to PENDING
UPDATE task_reviewers
SET status = 'PENDING', decided_at = NULL, comments = NULL
WHERE task_id = p_task_id;
```

### 2. Ensure `moveTaskToColumn` calls `reopen_task` for all revert scenarios with reviewers

In `useKanbanDragDrop.ts`, the generic revert path at line 454 only calls `reopen_task` when `voidReason` is truthy. Since the warning dialog requires a reason (min 5 chars), this should always be present. But add a defensive fallback so it always runs for Done→back moves.

### 3. Invalidate reviewer-related query caches after reopen

After the `reopen_task` RPC call in `useKanbanDragDrop.ts`, invalidate:
- `['task-reviewers', taskId]`
- `['task-reviewers-summary']`
- `['user-tasks']`

This ensures both the author's and approver's UIs refresh immediately.

## Files to Change

| File | Change |
|------|--------|
| New migration SQL | Recreate `reopen_task` to delete reviewer tasks and reset `task_reviewers` |
| `src/components/tasks/useKanbanDragDrop.ts` | Add reviewer cache invalidation after `reopen_task` call; ensure reopen always fires on Done→back |

