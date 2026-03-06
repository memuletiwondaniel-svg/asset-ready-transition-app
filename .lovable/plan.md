

## Investigation Summary

I traced the full data and code flow. There are two distinct problems:

### Problem 1: Task Card Shows Full Project Name Instead of Project Code

The task metadata stored in the database is:
```
project_name: "DP300 - HM Additional Compressors"
```
There is **no separate `project_code` field**. The KanbanCard uses `task.project` for the `ProjectIdBadge`, which comes from `meta?.project_name || meta?.project_code` in `useUnifiedTasks.ts`. So the badge displays the full concatenated string instead of just "DP300".

**Fix (3 places):**

1. **`ORAActivityPlanWizard.tsx`** (line ~359): Add `project_code` to metadata when creating review tasks. The project prefix and number are available from the wizard context.
   ```
   project_code: `${prefix}-${number}`,   // e.g. "DP-300"
   project_name: projectTitle,             // e.g. "HM Additional Compressors"
   ```

2. **`useUnifiedTasks.ts`** (line 175): Prefer `project_code` over `project_name` for the badge:
   ```
   project: meta?.project_code || meta?.project_name || undefined
   ```

3. **Database migration**: Update the existing task's metadata to split the fields:
   ```sql
   UPDATE user_tasks
   SET metadata = jsonb_set(
     jsonb_set(metadata::jsonb, '{project_code}', '"DP-300"'),
     '{project_name}', '"HM Additional Compressors"'
   )
   WHERE id = '6c77b7ff-83ee-414b-9a0c-dd41d8705790';
   ```

### Problem 2: "Review ORA Plan" Opens Wrong UI

The current `TaskDetailSheet.tsx` code already has the correct navigate (`/operation-readiness/${oraPlanId}`) and the `ORAActivityPlanReviewOverlay` is NOT imported anywhere. The code is correct. However, the user reports no change is visible.

This likely means the **`isOraReviewTask` condition** (line 236: `isOraReviewTask && oraPlanId`) is failing because `ora_plan_review` is being caught first by the `isReviewTask` check (line 109), which triggers the generic approve/reject UI instead. But more critically, `isOraReviewTask` is `true` AND `oraPlanId` exists (`plan_id: "2b88ecdf-..."`), so the button SHOULD render.

The real issue: the `isReviewTask` flag (line 109) includes `'ora_plan_review'`, which means the TaskDetailSheet shows BOTH the "Review ORA Plan" navigate button AND the generic approve/reject section below it. For ORA review tasks, the approval should happen on the ORA Plan details page (which has an Approvals tab), NOT inline in the task sheet.

**Fix:**
- **`TaskDetailSheet.tsx`**: Exclude `ora_plan_review` from `isReviewTask` when `oraPlanId` is present, since the approval happens on the dedicated plan page. Change the CTA to be more prominent (primary variant) and the intent message to direct users to the full plan view.

### Implementation Plan

| Step | File | Change |
|------|------|--------|
| 1 | `useUnifiedTasks.ts` | Prefer `project_code` over `project_name` for `project` field |
| 2 | `ORAActivityPlanWizard.tsx` | Store `project_code` and `project_name` as separate metadata fields |
| 3 | `TaskDetailSheet.tsx` | Exclude ORA review tasks from showing inline approve/reject when they have a plan_id (redirect to plan page instead) |
| 4 | Migration SQL | Fix existing task metadata to split project_code and project_name |

