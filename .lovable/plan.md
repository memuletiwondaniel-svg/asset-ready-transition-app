

## P2A Milestone Vertical Dividers Implementation

### Overview
Transform the milestone markers from a horizontally-connected timeline to individual markers with vertical lines extending down into the workspace. This helps users visually understand that milestones act as phase separators.

### Current State
- Milestones use amber/orange color scheme
- Horizontal gradient lines connect milestones (`w-12 h-px bg-gradient-to-r from-amber-400/40 to-amber-400/10`)
- Milestones are positioned in a header bar above the workspace
- No visual connection between milestones and the phase columns below

### Proposed Changes

**1. Update Milestone Color Scheme**
Change from amber to a more neutral/subtle color that won't compete with phase headers:
- Replace `bg-amber-500` with `bg-slate-400 dark:bg-slate-500`
- Replace `ring-amber-200/50` with `ring-slate-300/50 dark:ring-slate-600/50`
- Update the header background from `from-amber-500/5` to `from-slate-500/5`

**2. Remove Horizontal Connecting Lines**
Delete the horizontal line element that currently connects milestones:
```tsx
// Remove this block:
{idx < sortedMilestones.length - 1 && (
  <div className="w-12 h-px bg-gradient-to-r from-amber-400/40 to-amber-400/10" />
)}
```

**3. Add Vertical Divider Lines**
Modify `MilestoneMarker.tsx` to include a vertical line extending downward:
- Add a `flex-col` layout to contain both the marker and the vertical line
- Add a faint vertical line element with styling like:
  - Height extending to the bottom of the workspace
  - Very subtle color: `bg-border/30` or `bg-slate-300/20`
  - Thin width: `w-px`

**4. Adjust Layout for Vertical Lines**
Update `PhasesTimeline.tsx` to:
- Change the milestones container to use `relative` positioning
- Allow the vertical lines to extend through the workspace area using `absolute` positioning
- Ensure vertical lines don't interfere with drag-and-drop functionality (`pointer-events-none`)

### Technical Details

**Files to Modify:**
1. `src/components/p2a-workspace/phases/MilestoneMarker.tsx`
   - Update marker colors from amber to slate
   - Add vertical line element with absolute positioning

2. `src/components/p2a-workspace/phases/PhasesTimeline.tsx`
   - Remove horizontal connecting lines between milestones
   - Update header background gradient color
   - Adjust container positioning to allow vertical lines to extend through

### Visual Result
```
[MS-01]     [MS-02]     [MS-03]     <- Milestone markers (slate colored)
    |           |           |       <- Faint vertical lines
    |           |           |
+-------+  +-------+  +-------+
| Phase |  | Phase |  | Phase |     <- Phase columns
|   1   |  |   2   |  |   3   |
+-------+  +-------+  +-------+
    |           |           |
    v           v           v       <- Lines continue through workspace
```

### Considerations
- Vertical lines will use `pointer-events-none` to not interfere with clicking/dragging
- Lines will be positioned behind phase cards using z-index
- The faint color ensures they provide visual guidance without being distracting
- Lines will extend from the milestone down through the entire workspace height

