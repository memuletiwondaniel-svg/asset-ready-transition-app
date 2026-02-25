

## Problem

When the user clicks "Other", the custom reason input field appears **below** the card grid (line 207-218). If the card list is long enough, the input is pushed below the visible area and the user has no visual cue that they need to scroll down to complete a required field.

## Modern UI/UX Approach: Inline Expansion

The best pattern here is to **embed the input directly inside the Other card** when it is selected, expanding the card itself. This is the approach used by Linear, Notion, and similar tools for "Other / Custom" options. The user clicks the card, it expands in-place to reveal the text field with autofocus, and the context is immediately clear.

### Plan

**File: `src/components/pssr/wizard/WizardStepReasonDetails.tsx`**

1. **Remove the separate `{isOtherSelected && ...}` block** (lines 207-218) that renders the custom input below the entire card grid

2. **Expand the Other card itself** when selected to include the input inline:
   - When `isOtherSelected` is true, the Other card grows to include an input field directly beneath the "Other" label inside the card
   - The input gets `autoFocus` so the cursor is immediately placed for typing
   - Add a subtle amber/warning-colored hint text inside the card: "Please specify the reason below" to draw attention
   - The card's border uses `border-amber-500` (instead of `border-primary`) when selected but the custom reason is still empty, signaling incompleteness
   - Once the user types something, the border reverts to the normal `border-primary` selected state

3. **Visual details**:
   - The input renders inside the card with a small top margin, spanning the full width below the icon+label row
   - Use `animate-in slide-in-from-top-2 fade-in duration-200` for a smooth reveal
   - The card's description text changes from "Other reason not listed above" to "Please specify your reason" when expanded

This keeps everything in-place with zero scrolling needed, and the autofocus + visual hint make it impossible to miss.

### Technical Details

- Only `WizardStepReasonDetails.tsx` needs changes
- The same pattern should also be applied to `WizardStepCategory.tsx` (the Create PSSR wizard) for consistency — it has the same "Other" card structure
- No prop or database changes required
- The `autoFocus` on the input ensures keyboard-first users can immediately start typing

