
## P2A Milestone Positioning Between Phase Columns

### Overview
Reposition milestone markers from a separate header row to be positioned **between** phase columns, with faint dotted vertical lines extending from each milestone down through the workspace and stopping just above the Unassigned VCRs panel.

### Current State
- Milestones render in a dedicated header bar **above** all phases
- Each milestone has a vertical line extending down, but the positioning doesn't align with phase boundaries
- Milestones appear as a separate row at the top, not visually connected to the phases they separate

### Proposed Changes

**1. Remove Dedicated Milestone Header Row**
Remove the separate milestones header section from `PhasesTimeline.tsx`. Instead, milestones will be rendered inline within the phases flex container.

**2. Interleave Milestones Between Phase Columns**
Rework the phases rendering logic to:
- Render milestones **between** phase columns based on their `display_order` relationship
- A milestone with `display_order = N` appears between phase N and phase N+1
- First milestone (display_order = 0) could appear before the first phase if needed, or between phase 1 and 2

**Logic approach:**
- For each phase, check if there's a milestone that should appear **after** it (before the next phase)
- Render: `[Phase 1] [Milestone SD] [Phase 2] [Milestone MC] [Phase 3]`
- Alternatively, use the phase's `end_milestone_id` to determine which milestone appears after it

**3. Update MilestoneMarker Component**
Modify `MilestoneMarker.tsx` to:
- Display as a vertical separator between columns (narrow width, vertically oriented)
- Show the milestone icon at the top
- Render a **faint dotted** vertical line extending downward
- Change `bg-border/30` to `border-dashed` or use CSS for dotted pattern
- Limit the line height so it stops just above the Unassigned VCRs panel (not full viewport height)

**4. Visual Design for Inline Milestone**
The milestone marker between phases will be:
- Narrow column (about `w-8` or `w-10`)
- Centered circular icon at the top
- Milestone code below the icon (rotated vertically or small text)
- Faint dotted vertical line (`border-l border-dashed border-border/40`) extending down
- Line stops at a calculated height (e.g., `calc(100% - 180px)` to avoid the unassigned section)

### Technical Implementation

**Files to Modify:**

1. **`src/components/p2a-workspace/phases/PhasesTimeline.tsx`**
   - Remove the dedicated milestones header section (lines 120-135)
   - Modify the phases flex container to interleave milestones
   - Create a combined render array: phases interleaved with milestone markers
   - Pass the appropriate height constraint to milestone markers

2. **`src/components/p2a-workspace/phases/MilestoneMarker.tsx`**
   - Redesign as a vertical separator element
   - Change from horizontal row layout to vertical column layout
   - Update the vertical line to use dotted style (`border-dashed`)
   - Accept a `height` prop or use CSS calc to stop above unassigned section
   - Position the marker icon and label appropriately for a vertical orientation

**Interleaving Logic:**
```tsx
// Example: Build combined render list
const renderItems = [];
phases.forEach((phase, idx) => {
  renderItems.push({ type: 'phase', phase, idx });
  
  // Check if a milestone should appear after this phase
  // Using end_milestone_id from the phase, or milestone display_order
  const separatorMilestone = sortedMilestones.find(m => 
    phase.end_milestone_id === m.id || 
    m.display_order === idx + 1
  );
  
  if (separatorMilestone) {
    renderItems.push({ type: 'milestone', milestone: separatorMilestone });
  }
});
```

**Milestone Marker Visual Update:**
```tsx
// Vertical separator design
<div className="flex-shrink-0 w-8 flex flex-col items-center pt-4">
  {/* Milestone icon */}
  <div className="relative flex items-center justify-center mb-1">
    <div className="w-3 h-3 rounded-full bg-slate-400 ring-2 ring-slate-300/50" />
  </div>
  
  {/* Milestone code - vertical or small */}
  <span className="text-[9px] font-medium text-muted-foreground writing-vertical">
    {milestone.code}
  </span>
  
  {/* Dotted vertical line */}
  <div 
    className="flex-1 w-px border-l border-dashed border-border/40 mt-2"
    style={{ minHeight: '200px' }}
  />
</div>
```

### Visual Result
```text
+-------+  |SD|  +-------+  |MC|  +-------+
| Phase |   :   | Phase |   :   | Phase |
|   1   |   :   |   2   |   :   |   3   |
+-------+   :   +-------+   :   +-------+
            :               :
            :               :
            :..............:............
                                        ^
              Lines stop here ─────────────────
+─────────────────────────────────────────────+
|           Unassigned VCRs                   |
+─────────────────────────────────────────────+
```

### Considerations
- If milestones aren't linked to phases via `end_milestone_id`, use `display_order` correlation
- The dotted line uses CSS `border-dashed` for the dotted effect
- Lines are `pointer-events-none` to not interfere with drag-and-drop
- Milestone tooltips remain functional on hover
- The interleaving should sync with horizontal scrolling of the phases area
