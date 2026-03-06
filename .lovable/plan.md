

## Plan: Open ORA Wizard in Review Mode from Task CTA

### Problem
The "Review ORA Plan" button currently navigates to `/operation-readiness/${planId}` which shows an empty Gantt chart page. The user wants it to open the **ORA Plan Wizard** (the same one used during creation) so the approver can see and edit the Schedule/Gantt (Step 4), activities, etc.

### Root Cause
The wizard's draft-loading logic only looks for plans with `status = 'DRAFT'`. The submitted plan has `status = 'PENDING_APPROVAL'`, so passing the same `projectId` won't load it. Additionally, `wizard_state` is set to `null` on submission, so the wizard has no state to restore from.

### Solution

**1. Add `planId` prop to `ORAActivityPlanWizard`** (`src/components/ora/wizard/ORAActivityPlanWizard.tsx`)
- Add optional `planId?: string` and `mode?: 'create' | 'review'` props
- When `planId` is provided, load that specific plan by ID (regardless of status) instead of searching for drafts by project
- Load the plan's actual data (phase, deliverables/activities, approvers) from `orp_plans` + `orp_deliverables` + `orp_plan_approvers` to reconstruct wizard state
- In review mode: change the title to "Review ORA Plan", hide "Delete Draft", and change submit button to "Save Changes"

**2. Update draft loading logic** (`ORAActivityPlanWizard.tsx`)
- When `planId` is set, fetch the plan and reconstruct wizard state from the actual plan data (phase, deliverables converted to activities, approvers) rather than relying on `wizard_state` JSON (which is cleared on submission)
- Start the reviewer on Step 4 (Schedule) by default since that's the most relevant view

**3. Update `TaskDetailSheet.tsx`**
- For `isOraReviewTask`, instead of navigating away, open the `ORAActivityPlanWizard` with `planId={oraPlanId}` and `mode="review"`
- Add state `oraReviewWizardOpen` and render the wizard component

### Files to Change

| File | Change |
|------|--------|
| `src/components/ora/wizard/ORAActivityPlanWizard.tsx` | Add `planId` + `mode` props; add plan-loading logic that reconstructs state from actual DB records; adjust UI labels for review mode |
| `src/components/tasks/TaskDetailSheet.tsx` | Replace `navigate()` with opening the wizard in review mode |

