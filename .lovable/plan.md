

## Problem
PSSR and SoF Approver roles show "0 roles" on Step 4 because the draft loading logic prematurely sets `configLoaded: true` without actually loading the approver role IDs.

## Root Cause
In `CreatePSSRWizard.tsx` line 229, when loading a draft:

```tsx
configLoaded: dbItemIds.length > 0 || customItemIds.length > 0,
```

If the draft has saved checklist items, `configLoaded` becomes `true`. This prevents the config loading effect (line 253) from ever firing, since it checks `!wizardState.configLoaded`. But the draft loading never sets `selectedPssrApproverRoleIds` or `selectedSofApproverRoleIds` -- those stay as empty arrays `[]`.

So the system thinks configuration is already loaded, but the approver role IDs were never fetched.

## Fix

**File: `src/components/pssr/CreatePSSRWizard.tsx`**

During draft loading (after line 216), also fetch the approver role IDs from `pssr_reason_configuration` and include them in the restored state:

```tsx
// After loading custom items, also load approver config
const { data: config } = await supabase
  .from('pssr_reason_configuration')
  .select('pssr_approver_role_ids, sof_approver_role_ids')
  .eq('reason_id', draft.reason_id)
  .maybeSingle();

const pssrApproverIds = config?.pssr_approver_role_ids || [];
const sofApproverIds = config?.sof_approver_role_ids || [];
```

Then in the `setWizardState` call (lines 217-230), add:

```tsx
selectedPssrApproverRoleIds: pssrApproverIds,
selectedSofApproverRoleIds: sofApproverIds,
templatePssrApproverRoleIds: pssrApproverIds,
templateSofApproverRoleIds: sofApproverIds,
configLoaded: true,
```

This way `configLoaded: true` is justified because ALL config data (checklist IDs and approver role IDs) is fully restored.

## Summary

Single file change in `src/components/pssr/CreatePSSRWizard.tsx`: add approver role ID fetching to the draft loading logic so the data is available by the time the user reaches Step 4.

