
# Fix Wasted Space Below Unassigned VCRs Section

## Problem Analysis

The "Unassigned VCRs" section is positioned correctly at the bottom of the flex container, but there's visible empty space below it. This happens because:

1. The parent containers use `flex-1` to fill available height
2. The `PhasesTimeline` component's flex layout doesn't fully stretch to consume all available space
3. The ScrollArea in the middle may not be properly expanding to push the unassigned section to the absolute bottom

## Solution

Ensure the unassigned VCRs section is pinned to the very bottom of the viewport by making the flex container fill 100% of available height and positioning the unassigned section at the absolute bottom using `mt-auto`.

## Technical Changes

### 1. Update `PhasesTimeline.tsx`

**Change the wrapper for the Unassigned VCRs section:**
- Add `mt-auto` to the unassigned section wrapper to push it to the very bottom of the flex container
- This ensures any extra space appears above the phases (within the scrollable area) rather than below the unassigned section

```tsx
// Line 267: Update the unassigned VCRs wrapper
<div className="flex-shrink-0 px-4 py-2 border-t border-border mt-auto">
```

### 2. Ensure proper height inheritance

The main container already uses `flex-1 flex flex-col overflow-hidden` which should fill the parent. The `mt-auto` on the bottom section will push it to the absolute bottom edge.

## Visual Result

```text
┌─────────────────────────────────┐
│  Milestones Header              │
├─────────────────────────────────┤
│                                 │
│  ScrollArea (phases)            │
│  - Expands to fill space        │
│                                 │
├─────────────────────────────────┤
│  Unassigned VCRs (mt-auto)      │  ← Pinned to bottom
└─────────────────────────────────┘
                                    ← No wasted space
```

## Files to Modify
- `src/components/p2a-workspace/phases/PhasesTimeline.tsx` (1 line change)
