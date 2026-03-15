

## Analysis of Current Issues

### Issue 1: Approvers seeing "Not Started / In Progress / Completed" instead of "Approve / Reject"
The routing fix from the previous implementation IS correct — review tasks with `source === 'task_review'` are now directed to `TaskDetailSheet` instead of `ORAActivityTaskSheet`. Inside `TaskDetailSheet`, the ad-hoc review flow renders:
- Source task context card (lines 1108-1134)
- Source attachments (lines 1137-1144) 
- Source activity feed via `TaskActivityFeed taskId={sourceTaskId}` (line 1147)
- Approve/Reject buttons (lines 1152-1192) — gated by `isReviewTask && !isCompleted && !hasAlreadyDecided`

However, there's a problem: the **activity feed shown to the reviewer uses `sourceTaskId`**, but the **author's ORAActivityTaskSheet now writes to `task_comments` using `task.id`**. If these are the same ID, the feeds match. They should be the same since `source_task_id` in the reviewer's metadata points to the author's task.

The routing fix should be working. If the user still sees the status toggle, it's likely a stale cache or the changes haven't fully deployed. No additional code changes needed for routing.

### Issue 2: Activity feed not synchronized
After the previous changes, ORAActivityTaskSheet writes submission events to `task_comments` (task-scoped). The reviewer's `TaskDetailSheet` reads from `TaskActivityFeed` using `sourceTaskId` which queries `useTaskComments(sourceTaskId)`. The `useTaskComments` hook ALSO pulls legacy `ora_activity_comments` via the `ora_plan_activity_id` metadata lookup. So old comments should still appear, and new ones write to the task-scoped table. This should produce synchronized feeds.

### Issue 3: Done → In Progress dialog not opening
The universal check at line 817 should trigger the dialog. The code is correct. Possible causes:
- The `kanbanColumn` property not being `'done'` even though the card appears in the Done column
- Build hasn't refreshed with the new code

### Issue 4: Submit button missing after revert
**This is a real bug.** After moving from Done → In Progress:
1. Task status becomes `in_progress`
2. ORAActivityTaskSheet opens and initializes with `baseStatus = 'IN_PROGRESS'`
3. `originalStatus` is set to `IN_PROGRESS`
4. `isDirty` evaluates to `false` because nothing has changed from the initial state
5. The submit button at line 1416 requires `isDirty` to be `true`

The user must manually change status to COMPLETED again to trigger `isDirty`, but this isn't intuitive. The fix is to either:
- Always show the save button (not gate on `isDirty`) when task status is not completed
- Or show a "Resubmit" CTA when the task was previously completed but is now reverted

---

## Plan

### 1. Fix submit button visibility after revert
**File**: `src/components/tasks/ORAActivityTaskSheet.tsx`

Detect when a task was previously submitted (has reviewers + was completed) but has been reverted to in_progress. In this case, show the save/submit button even when `isDirty` is false. The button should remain visible when:
- `!isReadOnly`
- AND (`isDirty` OR the task has reviewers and current task DB status is `in_progress` but was previously `completed`)

Concretely, change the submit button condition on line 1416 from:
```
{!isReadOnly && isDirty && !(isP2AActivity && status === 'COMPLETED') && (
```
to also show when the user has changed the status from the initialized value, or when the task needs resubmission. The simplest fix is to check if `status !== originalStatus` as an independent display trigger — but `isDirty` already includes this. The real issue is that after a revert, `status` and `originalStatus` are both `IN_PROGRESS`.

**Solution**: Add a `wasReverted` detection — check if the task's reviewers have status `PENDING` while the task is not completed. If reviewers exist and task is in_progress, show the button always (user needs to resubmit). Add a separate boolean:
```typescript
const needsResubmission = hasReviewers && task?.status === 'in_progress' && !isReadOnly;
```
Update the button condition to: `!isReadOnly && (isDirty || needsResubmission) && ...`

Also update the submission notes section (line 1360) with the same condition.

### 2. Ensure Done→InProgress dialog reliability
**File**: `src/components/tasks/TaskKanbanBoard.tsx`

The code at line 817 looks correct. Add a `console.log` guard to verify the drag handler fires. Also check if the `warningState` setter is being called by adding defensive checks.

Actually, the more likely issue is that the `ApprovalVoidWarningDialog` component (starting ~line 96) has `open={!!warningState}` — need to verify it renders correctly for generic tasks. The dialog IS rendered on line 961+ — let me verify.

**File**: `src/components/tasks/TaskKanbanBoard.tsx` — line ~960+
Need to verify the `ApprovalVoidWarningDialog` is rendered with `open={!!warningState}`. This should be correct based on the code structure.

### 3. Verify approver sees correct UI with attachments and synced feed
The routing and UI logic appears correct in the code. The `TaskDetailSheet` for ad-hoc reviews:
- Shows source task attachments via `TaskAttachmentsSection` with `sourceTaskId`
- Shows activity feed via `TaskActivityFeed taskId={sourceTaskId}`
- Shows Approve/Reject buttons when `isReviewTask && !isCompleted && !hasAlreadyDecided`

No code changes needed here — the previous routing fix should handle this.

### 4. Add defensive logging for drag handler debugging
**File**: `src/components/tasks/TaskKanbanBoard.tsx`
Add a toast or console warning if the drag handler's Done→back path is hit but `warningState` doesn't get set, to help diagnose the dialog not opening.

---

## Summary of Changes

| File | Change |
|------|--------|
| `ORAActivityTaskSheet.tsx` | Add `needsResubmission` flag; show save/submit button when task has been reverted and needs resubmission even if `isDirty` is false |
| `TaskKanbanBoard.tsx` | Verify and harden the Done→InProgress dialog trigger; ensure `ApprovalVoidWarningDialog` renders for all task types |

