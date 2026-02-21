

## Problem
When reopening a saved draft PSSR and navigating back to Step 1:
1. The previously selected PSSR reason card is not highlighted
2. Clicking "Next" shows "Please select a PSSR reason" even though one was already selected

## Root Cause
In the draft loading logic (line 186 of `CreatePSSRWizard.tsx`):
```tsx
const categoryId = matchedReason?.category || '';
```

The `category` column in the `pssr_reasons` table is always `null`, so this resolves to an empty string `''`. But the reason cards use the reason's UUID (`reason.id`) for selection matching. So the wizard state ends up with `categoryId: ''` instead of the actual reason ID, and the ref (`categoryIdRef`) also gets set to empty.

Meanwhile, when a user manually selects a reason in Step 1, `onCategoryChange(reason.id)` correctly sets `categoryId` to the reason's UUID. The draft loading path uses the wrong field.

## Fix

**File: `src/components/pssr/CreatePSSRWizard.tsx`**

Change the draft loading to use `draft.reason_id` directly as the `categoryId` (since that is the value the Step 1 cards match against), and also synchronize the `categoryIdRef`:

**Line 186** - Replace:
```tsx
const categoryId = matchedReason?.category || '';
```
With:
```tsx
const categoryId = draft.reason_id || '';
```

**After line 230 (after `setWizardState`)** - Add ref sync:
```tsx
categoryIdRef.current = categoryId;
```

This ensures that when a draft is reopened:
- `wizardState.categoryId` holds the reason's UUID (matching the card comparison logic)
- `categoryIdRef.current` is also populated as a backup
- The reason card is correctly highlighted on Step 1
- "Next" validation passes because `categoryId` is no longer empty

## Summary
A single-line fix in the draft loading logic plus a ref sync line. The `category` column was always null, so the code was effectively setting `categoryId` to an empty string when restoring drafts.
