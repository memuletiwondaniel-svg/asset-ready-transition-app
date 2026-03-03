

## Make TaskDetailSheet Context-Aware

The current `TaskDetailSheet` always renders Comments + Approve/Reject buttons for every task type. This is incorrect -- "Create ORA Plan" is an action task, not a review task.

### Design

Classify tasks into two categories based on `task.type`:

**Action tasks** (user must do something):
- `ora_plan_creation` -- Launch ORA Plan wizard
- `vcr_delivery_plan` -- Launch VCR Delivery Plan wizard
- `ora_activity` -- Open activity details

For these: Show an intent explanation (e.g., "You've been assigned to create the ORA Activity Plan for this project"), then show **only** the primary CTA button (the wizard launcher). No Comments, no Approve/Reject.

**Review/Approval tasks** (user must evaluate and decide):
- `review` / `approval` -- PSSR review
- `ora_plan_review` -- Review ORA Plan
- Any task with `pssr_id` in metadata

For these: Show the review CTA (to open the review overlay), then Comments + Approve/Reject as today.

### Changes

**Single file: `src/components/tasks/TaskDetailSheet.tsx`**

1. Add a helper that determines if the task is a "review" task:
   ```
   const isReviewTask = ['review', 'approval', 'ora_plan_review'].includes(task.type) || !!pssrId;
   ```

2. Add an intent description block below the description, explaining what the user needs to do (map per task type).

3. Conditionally render the bottom section:
   - If `isReviewTask`: show Comments textarea + Approve/Reject buttons (current behavior)
   - If action task: hide Comments and Approve/Reject entirely; the wizard CTA button is the only action

4. Style the primary CTA more prominently for action tasks (use `bg-primary text-primary-foreground` instead of `bg-muted`).

