
# Fix PSSR Approvers & SoF Approvers Persistence

## Problem Summary

There are multiple frontend-backend integration gaps causing approvers not to appear in the PSSR detail overlay:

1. **PSSR Approvers table is empty** for PSSR-NRNGL-001 -- the `pssr_approvers` table has zero rows for this PSSR
2. **SoF Approvers exist but are unresolved** -- all 3 SoF approver rows have `user_id: null` and `approver_name: 'Pending Assignment'`
3. **Approver selections are not persisted in drafts** -- unlike checklist items which have `draft_checklist_item_ids`, there are no equivalent columns for approver role IDs

## Root Causes

### Root Cause 1: No draft persistence for approver selections
The `handleSaveAsDraft` function saves `draft_checklist_item_ids`, `draft_na_item_ids`, and `draft_item_overrides`, but does **not** save the selected PSSR approver role IDs or SoF approver role IDs. When a draft is reopened, the approver selections are loaded from the reason template defaults, discarding any user modifications.

### Root Cause 2: Draft restore uses template defaults instead of user selections
When restoring a draft (line 230-237 in CreatePSSRWizard.tsx), approver IDs are loaded from `pssr_reason_configuration` rather than from persisted user selections. If the user added/removed approvers, those changes are lost.

### Root Cause 3: Submission doesn't clean up existing approvers for drafts
When submitting a draft PSSR, the code inserts new approvers without first deleting existing ones. For the first submission this should work, but re-submissions or edge cases could cause silent failures.

### Root Cause 4: SoF auto-populate skips existing unresolved approvers
In `PSSRDetailOverlay.tsx`, the auto-populate mutation checks `sofApprovers.length === 0` before resolving names. Since the SoF approvers already exist (inserted during submission with `approver_name: 'Pending Assignment'`), the resolution is skipped entirely. The PSSR approvers auto-populate correctly handles this case (checking for `null user_id`), but the SoF version doesn't.

## Implementation Plan

### Step 1: Database Migration -- Add draft approver columns
Add two new columns to the `pssrs` table:
- `draft_pssr_approver_role_ids` (UUID array, nullable)
- `draft_sof_approver_role_ids` (UUID array, nullable)

### Step 2: Persist approver selections in `handleSaveAsDraft`
Update the `fullDraftPayload` in `CreatePSSRWizard.tsx` to include:
```
draft_pssr_approver_role_ids: wizardState.selectedPssrApproverRoleIds
draft_sof_approver_role_ids: wizardState.selectedSofApproverRoleIds
```

### Step 3: Restore approver selections from draft
When restoring a draft, prioritize the persisted `draft_pssr_approver_role_ids` and `draft_sof_approver_role_ids` over template defaults. Fall back to template defaults only if the draft columns are null/empty.

### Step 4: Clean up existing approvers before submission
In `handleSubmitPSSR`, before inserting new PSSR approvers and SoF approvers, delete any existing rows for the PSSR ID:
```
await supabase.from('pssr_approvers').delete().eq('pssr_id', newPSSR.id);
await supabase.from('sof_approvers').delete().eq('pssr_id', newPSSR.id);
```

### Step 5: Fix SoF auto-populate in detail overlay
Update the `autoPopulateSofApprovers` mutation condition in `PSSRDetailOverlay.tsx` to also handle existing but unresolved approvers (those with `user_id: null`). Instead of only inserting new approvers when the list is empty, also update existing approvers that have null user_ids -- mirroring the PSSR approvers auto-populate logic.

### Step 6: Sync approver changes immediately to DB (consistent with other draft changes)
When the user toggles approver roles in Step 4 and a draft exists, immediately sync the change to the database (matching the pattern already used for checklist items and overrides).

## Files to Modify

- **New migration**: Add `draft_pssr_approver_role_ids` and `draft_sof_approver_role_ids` columns
- **`src/components/pssr/CreatePSSRWizard.tsx`**: Persist and restore approver selections; clean up before re-insert on submission; sync changes to DB on toggle
- **`src/components/pssr/PSSRDetailOverlay.tsx`**: Fix SoF auto-populate to resolve unresolved approvers
- **`src/integrations/supabase/types.ts`**: Will be auto-updated after migration
