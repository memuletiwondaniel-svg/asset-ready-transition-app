

## Fix: P2A Approvers Not Showing in Summary Dialog

### Problem
The approvers are not visible in the summary overlay because the `persistPlanToDatabase` function in `useP2APlanWizard.ts` does not include `user_id` when saving approver records. This means the `p2a_handover_approvers` table is empty (or records lack user assignments), so the summary dialog has nothing to display.

### Root Cause
In `src/hooks/useP2APlanWizard.ts` (line 455-460), the approver save logic only persists `role_name`, `display_order`, and `status` -- it omits `user_id`, `user_name`, and `user_avatar`:

```text
const approverRecords = state.approvers.map(a => ({
  handover_id: planId,
  role_name: a.role_name,
  display_order: a.display_order,
  status: 'PENDING',
  // user_id is MISSING here
}));
```

### Plan

**Step 1: Fix approver persistence** (`src/hooks/useP2APlanWizard.ts`)
- Add `user_id: a.user_id || null` to the approver records map so that assigned users are saved to the database.

**Step 2: Always show the Approvers section** (`src/components/widgets/P2APlanSummaryDialog.tsx`)
- Currently the section is hidden when `approvers.length === 0`. After the fix, data will be present, but as a safeguard, also add a fallback message like "No approvers configured" when the list is empty, so the user always sees the section.

**Step 3: Re-submit the plan**
- Since the existing plan's approvers were lost, you will need to re-save or re-submit the plan to populate the approver records. Alternatively, I can add a one-time data repair to re-insert the default approvers for the current plan.

### Technical Details

File changes:

1. **`src/hooks/useP2APlanWizard.ts`** (line ~455-460)
   - Change the approver record mapping to include `user_id`:
   ```typescript
   const approverRecords = state.approvers.map(a => ({
     handover_id: planId,
     role_name: a.role_name,
     user_id: a.user_id || null,
     display_order: a.display_order,
     status: 'PENDING' as const,
   }));
   ```

2. **`src/components/widgets/P2APlanSummaryDialog.tsx`**
   - Remove the `approvers.length > 0` guard so the "Approvers" section always renders.
   - Show a "No approvers configured" fallback when the list is empty.

3. **Data repair** -- Insert the default approvers for the existing active plan (`7da85ab4-9ed7-402a-b137-ca0dfc8859c2`) so the summary dialog works immediately without re-submitting:
   - Insert the 5 default approver roles (Project Hub Lead, ORA Lead, CSU Lead, Construction Lead, Deputy Plant Director) with status `PENDING`.

