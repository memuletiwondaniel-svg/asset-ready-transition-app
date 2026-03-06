

## Plan: Gantt Chart Column Controls, ID Colors, 6M Default & Today Line

### Changes

**1. Hide End & Days columns by default + Column visibility toggle button**
- Add a `visibleColumns` state initialized with `end` and `duration` hidden
- Dynamically compute `LEFT_PANEL_WIDTH` based on visible columns
- Add a `Columns` dropdown button (using Popover + checkboxes) next to the Relations button in the toolbar
- Columns available: #, ID, Activity (always visible), Start, End, Days, Status — each toggleable except Activity

**2. Combine Expand/Collapse into a single toggle button**
- Replace the two separate buttons with one button that reads "Expand" when collapsed (expandedCodes is empty) and "Collapse" when any are expanded
- Click toggles between expandAll and collapseAll

**3. Fix ID label colors — use sequential hue rotation per activity**
- The current code maps all activities to the same phase prefix color (e.g., all EXE activities get indigo). Per the memory notes, ID badges should use "sequential hue rotation" for scannability
- Implement a rotating palette: assign each visible row a color from a fixed palette array based on its row index, so adjacent activities get distinct colors regardless of phase

**4. Default view = 6M**
- After the component mounts / when `scrollContainerRef` is available, auto-trigger `setZoomToFitDays(180)` via a `useEffect`

**5. Show "Today" vertical reference line**
- Calculate today's position: `differenceInDays(today, minDate) * dayWidth`
- Render a dashed vertical line spanning the full timeline height in the timeline area
- Add a "Today" date label in the timeline header row at the same position

### Files to modify
- `src/components/orp/ORPGanttChart.tsx` — all five changes in this single file

