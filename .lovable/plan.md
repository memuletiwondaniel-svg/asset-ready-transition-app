

## Analysis

Looking at the `ORAActivityTaskSheet.tsx` footer (lines 858-880), the Save/Confirm Complete button only renders when `isDirty` is true. Two issues:

1. **Comment text not tracked in `isDirty`**: The `comment` state (line 82) is not included in the `isDirty` memo (lines 196-209). Typing a comment won't show the Save button.

2. **"Confirm Completed" not appearing**: From the screenshot, the user changed status to COMPLETED but no button appeared. This likely happens when the task was already in "completed" status when opened — `originalStatus` would already be `'COMPLETED'`, so `isDirty` stays false. Additionally, if the only change is status to COMPLETED, the button should always appear prominently.

## Plan

**File: `src/components/tasks/ORAActivityTaskSheet.tsx`**

1. **Add `comment` to the `isDirty` memo** (line 196-209): Include `comment.trim().length > 0` as a dirty signal so typing a comment reveals the Save button.

2. **Show "Confirm Completed" button whenever status is COMPLETED and it wasn't already completed originally**: Change the footer condition from `isDirty` alone to `isDirty || (status === 'COMPLETED' && originalStatus !== 'COMPLETED')`. This ensures the green "Confirm Completed" CTA always appears when the user switches to Completed status.

3. **Show Save when there are unsaved changes including comment text**: The save button condition becomes `isDirty` (which now includes comment tracking).

This is a ~5-line change across the `isDirty` memo and the footer conditional.

