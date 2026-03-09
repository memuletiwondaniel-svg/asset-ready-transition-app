

## Problem Summary

The TaskDetailSheet overlay for "Create ORA Plan" has three issues when the task is completed/approved:

1. **Shows "ORA Plan" badge** instead of the Project ID (e.g., "DP-300")
2. **Shows "7 days pending"** even though the task is completed — should show the completion date instead
3. **CTA still says "Create ORA Plan"** — for completed tasks it should say "View ORA Plan"

## Changes

All changes are in **`src/components/tasks/TaskDetailSheet.tsx`**:

### 1. Replace "ORA Plan" type badge with Project ID badge
- In `getTypeBadge()`, for `isOraTask`, show the project code (e.g., `DP-300`) from `task.metadata?.project_code` instead of the generic "ORA Plan" label
- Keep the purple/violet styling but display the project identifier

### 2. Show completion date instead of "X days pending" for completed tasks
- Detect completed status: check `task.status === 'completed'` or `task.metadata?.plan_status` being `APPROVED`/`COMPLETED`
- When completed: hide the "X days pending" warning and instead show "Completed on [date]" using `task.updated_at` or a green checkmark style
- When still pending: keep the existing "X days pending" logic

### 3. Change CTA label to "View ORA Plan" when plan is approved
- Check `task.metadata?.plan_status` — if `APPROVED` or `COMPLETED`, change `oraCtaLabel` from "Create/Continue ORA Plan" to "View ORA Plan"
- Update `oraIntentMessage` to reflect completion: "The ORA Activity Plan has been approved. Click below to view the finalized plan."
- Optionally style the CTA as secondary/outline instead of primary since it's a view action, not a creation action

