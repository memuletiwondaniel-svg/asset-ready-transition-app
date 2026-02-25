

## Problem

Two issues with the Edit PSSR Template modal:

1. **Inconsistent height**: The modal content area shrinks on Step 3 (SoF Approvers) because the content is shorter than other steps and the dialog has no fixed height — it uses `max-h-[90vh]` but no minimum, so it collapses to fit content.

2. **Jarring transition between Step 1 and Step 2**: When switching steps, React unmounts one component and mounts another. Without any transition, this causes a visual "flash" as the content area briefly empties then fills with new content.

## Plan

**File: `src/components/pssr/EditPSSRReasonOverlay.tsx`**

1. **Fix consistent height** — Change the `DialogContent` className from `max-h-[90vh]` to `h-[85vh]` so the modal maintains a fixed height across all steps. The inner content area (`flex-1 overflow-y-auto`) already handles scrolling, so shorter steps will simply have empty space below rather than collapsing.

2. **Smooth step transitions** — Wrap the step content area in a container with a CSS transition. Add `animate-in fade-in duration-200` to each step's content wrapper so that when React swaps step components, the new one fades in smoothly instead of appearing abruptly.

Both the loading state dialog (line 339) and the main dialog (line 351) will get the fixed height for consistency.

### Technical Details

- Line 339: Change `max-h-[90vh]` → `h-[85vh]` on loading state DialogContent
- Line 351: Change `max-h-[90vh]` → `h-[85vh]` on main DialogContent  
- Lines 426-528: Add `className="animate-in fade-in duration-200"` wrapper div around each step's rendered content (steps 1-4)

