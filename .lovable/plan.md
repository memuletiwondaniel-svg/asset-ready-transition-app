

## Fix: Gantt Chart Passing Wrong Task Status to Activity Overlay

### Root Cause

The Gantt chart reconciles the status for display purposes (showing "In Progress / 95%" instead of "Completed / 100%" when reviewers are pending). However, it then passes this **reconciled** status (`in_progress`) to the `ORAActivityTaskSheet` as `task.status`.

Inside the sheet, the `needsResubmission` check is:
```ts
needsResubmission = hasReviewers && task?.status === 'in_progress' && reviewers.some(r => r.status === 'PENDING')
```

This evaluates to `true` because the Gantt passed `'in_progress'` — even though the real DB task status is `'completed'` (set by `submit_task_for_approval`). This causes the Submission Notes field and Submit button to incorrectly appear.

When opened from My Tasks, the real status `'completed'` is passed, so `needsResubmission` is `false` and the submission UI is correctly hidden.

### Fix

In `ORPGanttChart.tsx` line ~1173, stop overriding the task status with the reconciled value when building the overlay payload. Pass the **real** task status from `activityTaskMap` instead:

**File: `src/components/orp/ORPGanttChart.tsx`**

In `openActivitySheet`, for the generic activity branch (~line 1168-1176), change:
```ts
// Before (broken)
status: reconciledTaskStatus,

// After (fixed) — pass the real DB task status
status: taskEntry.activityTask.status,
```

Do the same for the fallback synthetic case (~line 1186-1195): use the real task status from `taskEntry?.taskStatus` rather than the reconciled one.

Also apply the same fix to the P2A branch (~line 1048-1074) and VCR branch (~line 1089-1118) — ensure the overlay always receives the actual DB status, not the Gantt-display-reconciled status.

The reconciled status continues to be used only for the Gantt bars, badges, and progress columns — which is already correct.

### Scope

One file change: `src/components/orp/ORPGanttChart.tsx` — ~4 lines across the `openActivitySheet` branches.

