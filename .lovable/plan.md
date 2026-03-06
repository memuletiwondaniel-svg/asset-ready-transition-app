

## Plan: Fix Relations, Add Critical Path & Metrics, Sticky Toolbar, Editable Dates, Remove "View Full Plan"

### 1. Fix Relationship Arrows (Currently Broken)

The relationship arrows use `_predecessorIds` from deliverable data (line 819), but this array is likely not populated correctly from wizard_state predecessors. The arrows render as L-shaped SVG paths between predecessor end and successor start — but the predecessor lookup (line 831-835) matches by `activity_code` or `id`, which may not align with how predecessors are stored in wizard_state.

**Fix in `ORPGanttChart.tsx`**:
- Debug the predecessor data flow from `useORPPlanDetails` → ensure `_predecessorIds` contains valid activity codes
- Fix the matching logic to handle prefixed IDs and code formats consistently
- Need to check `useORPPlans.ts` to see how `_predecessorIds` is populated on deliverables

### 2. Critical Path Highlighting

Add a "Critical Path" toggle button next to the Relations button in the toolbar. Critical path = the longest chain of dependent activities (using predecessors) that determines the minimum project duration.

**Logic**:
- Build a dependency graph from predecessor relationships
- Forward-pass to compute earliest start/finish, backward-pass for latest start/finish
- Activities where earliest == latest are on the critical path (zero float)
- Highlight critical path bars with a red/orange border or distinct styling
- Add a `Route` icon toggle button in the toolbar

**File**: `ORPGanttChart.tsx` — add toggle state, compute critical path in `useMemo`, apply styling to bars

### 3. Schedule Performance Metrics

Add a small metrics row below the progress bar in the overlay showing:
- **SPI (Schedule Performance Index)**: % of activities on/ahead of schedule vs behind
- **Activities at Risk**: count of activities past their end date but not completed
- **Average Slippage**: mean days behind for overdue activities

**File**: `ORPGanttOverlay.tsx` — compute from deliverables data, render as small stat cards below the narrative

### 4. Sticky Toolbar Row

Currently the toolbar (expand, columns, relations, 6M/12M/24M, zoom) is inside `CardHeader` while content scrolls inside `CardContent > div.max-h-[60vh].overflow-y-auto`. The header row with column labels (line 530-558) scrolls away.

**Fix**: Make the toolbar + column header row sticky so they remain visible when scrolling vertically through activities.

**File**: `ORPGanttChart.tsx` — restructure so:
- `CardHeader` with toolbar remains outside the scroll container (already is)
- The column header row (line 530-558) gets `sticky top-0 z-20 bg-background` so it pins when scrolling the activity rows

### 5. Editable Start/End Dates in Activity Sheet

Currently dates display as static text (lines 338-354 in `ORAActivityTaskSheet.tsx`). Need to make them clickable to open a calendar popover for editing.

**Fix in `ORAActivityTaskSheet.tsx`**:
- Add state for `editStartDate` and `editEndDate`
- Replace static date display with `Popover` + `Calendar` component (drill-down calendar pattern)
- On date change, update local state and mark as dirty
- On save, include updated dates in the upsert to `ora_plan_activities` and update `wizard_state`
- Auto-compute duration when dates change

### 6. Remove "View Full Plan" Button

**File**: `ORPGanttOverlay.tsx` — remove lines 110-113 (the Button with ExternalLink icon and "View Full Plan" text). Also remove the `useNavigate` import and `handleViewFullPlan` function if no longer needed.

### Files to Modify

1. **`src/components/orp/ORPGanttChart.tsx`** — Fix relations, add critical path toggle, sticky header row
2. **`src/components/orp/ORPGanttOverlay.tsx`** — Add schedule metrics, remove "View Full Plan" button
3. **`src/components/tasks/ORAActivityTaskSheet.tsx`** — Editable dates with calendar popovers
4. **`src/hooks/useORPPlans.ts`** — Verify `_predecessorIds` propagation to deliverables (may need fix)

