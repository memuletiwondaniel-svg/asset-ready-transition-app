

## Plan: Unify ORA Plan Overlay with Approver Review View

### Problem
1. The ORA Plan overlay (opened from CTA) differs visually from the approver's review overlay
2. Status column not shown by default
3. Overlay too narrow for the Gantt chart
4. Parent activities are expanded by default (should be collapsed)
5. Activity ID badges use different styling than the review overlay
6. Phase legend clutters the bottom of the chart
7. Clicking an activity opens a modal dialog instead of a modern side panel

### Changes

**1. ORPGanttOverlay.tsx — Widen overlay & match review overlay layout**
- Change `max-w-5xl` to `max-w-7xl` and `w-[95vw]` to `w-[98vw]` for a wider dialog
- Keep the same header structure (icon, title, status badge, View Full Plan) but ensure it visually matches the review overlay's style

**2. ORPGanttChart.tsx — Collapse parents by default**
- Change the default `expandedCodes` state initialization (lines 195-203) from auto-expanding root parents to starting with an empty `Set<string>()` (all collapsed)

**3. ORPGanttChart.tsx — Remove the phase legend**
- Delete the legend section (lines 668-676) that shows "Phases: IDN ASS SEL..." under the chart

**4. ORPGanttChart.tsx — Activity click opens a Sheet (side panel) instead of a modal**
- The chart already uses `ORAActivityTaskSheet` (a Sheet/side panel) for ORA activities (line 482-505 — `_isOraActivity` branch)
- The non-ORA path opens `ORPDeliverableModal` (a dialog). Change this to also open the `ORAActivityTaskSheet` side panel, converting the deliverable data to the same task-like shape
- This provides the modern UX pattern: table stays visible while details slide in from the right

**5. ORPGanttChart.tsx — Ensure Status column is always visible**
- Status column is already rendered (COL_WIDTHS.status = 96). The issue is likely that `hideToolbar` suppresses it or the overlay width clips it. Widening the overlay (change 1) should resolve this. No column-hiding logic exists for Status.

### Files to modify
- `src/components/orp/ORPGanttOverlay.tsx` — wider dialog
- `src/components/orp/ORPGanttChart.tsx` — collapse by default, remove legend, unify click handler to use side sheet

