

## Bug: "Unsaved changes" badge persists after saving

### Root Cause

In `EditPSSRReasonOverlay.tsx`, after a successful save, the snapshot is reset using **trimmed** values (lines 267-269):

```tsx
initialSnapshot.current = {
  reasonName: formReasonName.trim(),    // trimmed
  description: description.trim() || '', // trimmed
  ...
};
```

But the actual React state (`formReasonName`, `description`) is **never updated** to the trimmed versions. So immediately after save, the dirty check compares:

- `formReasonName` (e.g. `"Retired or idle equipment "`) vs snapshot `reasonName` (e.g. `"Retired or idle equipment"`)

The trailing whitespace causes `isDirty` to evaluate to `true` — even though nothing actually changed.

This also happens if the description loaded from the DB had any whitespace difference, or even just from how React state preserves the raw input value.

### Fix

**File: `src/components/pssr/EditPSSRReasonOverlay.tsx`** — Lines 266-277

Store the **raw current state values** (not trimmed) in the snapshot after save. The trimming should only apply to what's sent to the database, not to what's stored for comparison:

```tsx
// Reset snapshot so dirty state clears
initialSnapshot.current = {
  reasonName: formReasonName,        // use raw state, not trimmed
  description: description,          // use raw state, not trimmed
  categoryId: formCategoryId,
  subCategory,
  pssrLeadId,
  pssrApproverRoleIds: [...pssrApproverRoleIds],
  sofApproverRoleIds: [...sofApproverRoleIds],
  checklistItemIds: [...checklistItemIds],
  checklistItemOverrides: { ...checklistItemOverrides },
};
```

This is a two-line change (removing `.trim()` from `reasonName` and `description` in the snapshot reset). The dirty badge will now correctly clear on save and only reappear when the user makes actual changes.

