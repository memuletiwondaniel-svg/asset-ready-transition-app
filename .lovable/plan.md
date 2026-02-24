

# Add "Save" Button to All Steps in PSSR Template Editor

## Problem
Currently, the "Save Changes" button only appears on the final step (Step 4 - Checklist Items). If a user edits something on Step 1, 2, or 3, they must navigate all the way to Step 4 before they can save. This is unintuitive and risks losing changes.

## Solution
Add a persistent "Save" button in the footer on **every step** of the wizard, alongside the existing "Next" button. After a successful save, the overlay closes and the user is returned to the PSSR templates list (which is already the current behavior of `handleClose()`).

## Changes

### File: `src/components/pssr/EditPSSRReasonOverlay.tsx`

**Footer section (lines 515-557):** Restructure the button layout so that:
- "Back" button appears on steps 2-4 (unchanged)
- "Cancel" button always appears (unchanged)
- **"Save Changes" button always appears** on every step, not just step 4
- "Next" button appears on steps 1-3 (unchanged)

The button order in the footer will be:

```
[Delete]                    [Back?] [Cancel] [Save Changes] [Next?]
```

- On Step 1: Delete | Cancel, Save Changes, Next
- On Steps 2-3: Delete | Back, Cancel, Save Changes, Next
- On Step 4: Delete | Back, Cancel, Save Changes

No logic changes to `handleSave()` are needed -- it already saves all form state, invalidates queries, shows a success toast, and calls `handleClose()` which returns the user to the templates list.

## Files Modified
- `src/components/pssr/EditPSSRReasonOverlay.tsx` -- move Save button outside the step-4-only conditional

