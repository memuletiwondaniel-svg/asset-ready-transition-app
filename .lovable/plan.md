

## Plan: Gantt Bar Drag-Resize, Progress Overlay, and Relationships

### 1. Drag-to-resize Gantt bars (both components)

Add mouse event handlers to each non-parent bar in both `ORPGanttChart.tsx` and `StepSchedule.tsx`:

- Render invisible 6px-wide "handle" divs at the left and right edges of each bar
- On hover, change cursor to `col-resize` 
- On mousedown on left handle: track drag to adjust `start_date` (snapping to nearest day)
- On mousedown on right handle: track drag to adjust `end_date` (snapping to nearest day)
- Use `useRef` + `useEffect` for document-level `mousemove`/`mouseup` listeners during drag
- Compute new date = `addDays(minDate, Math.round(mouseX / dayWidth))` and call `updateActivity` (StepSchedule) or a Supabase update mutation (ORPGanttChart)
- During drag, show a subtle outline/shadow on the bar being resized

### 2. Progress bar inside duration bar

Currently in `ORPGanttChart.tsx` (lines 571-589), there's already a white overlay showing completion %. Improve it:

- Change the bar to have two layers: a lighter/muted background bar (full width = full duration) and an inner filled bar (width = `completion_percentage%`) in a darker shade of the same color
- Structure: outer bar (muted phase color, full width) → inner progress bar (solid phase color, percentage width) → percentage label centered
- Apply the same pattern to `StepSchedule.tsx` bars (lines 593-607)

### 3. Relationships toggle button

Add a "Show Relationships" toggle button to the toolbar in both components:

- New state: `showRelationships: boolean`
- Button with `GitBranch` or `Link` icon in the toolbar area
- When enabled, draw SVG arrow lines between related bars using the `p2a_vcr_relationships` data (or a simpler predecessor field on the activity)
- Render an absolutely positioned SVG overlay on the timeline panel
- Arrows go from the right edge of the predecessor bar to the left edge of the successor bar, with a small arrowhead
- Use a muted color (gray) for the connector lines

### Files to modify
- `src/components/orp/ORPGanttChart.tsx` — drag handles, progress bar redesign, relationships overlay
- `src/components/ora/wizard/StepSchedule.tsx` — drag handles, progress bar redesign, relationships overlay

