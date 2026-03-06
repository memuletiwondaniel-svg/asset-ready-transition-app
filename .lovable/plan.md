

## Plan: Parent Bar Styling, Relations Fix, Icon-Only Toolbar Buttons

### 1. Parent activity Gantt bars — match normal bar height and span child date range

**Current issue**: Parent bars render as thin 8px border-only outlines (lines 702-714). Normal bars use full `ROW_HEIGHT - 16 = 24px` with fills, progress, and labels.

**Fix**: Change the parent bar to render at the same height as normal bars (`top: 8px, height: ROW_HEIGHT - 16`), use the same muted background + progress fill pattern, and show a centered duration/percentage label. The `getParentDateRange` function already recursively calculates the min start and max end from all descendants — no logic change needed there.

### 2. Relations button — fetch and render predecessor arrows

**Current issue**: The `showRelationships` toggle exists but there's zero rendering code for arrows. Additionally, predecessor data isn't stored in `ora_plan_activities` — it only exists in `wizard_state` JSON.

**Fix**:
- When fetching plan details in `useORPPlanDetails`, also read `wizard_state.activities` to extract `predecessorIds` for each activity (matching by `activity_code` or `id`)
- Pass this predecessor map through to the Gantt chart via the deliverables data (add a `predecessorIds` field to each activity deliverable)
- In `ORPGanttChart.tsx`, when `showRelationships` is true, render an SVG overlay with red arrow paths (same pattern as `StepSchedule.tsx` — arrowhead markers, L-shaped connector paths from predecessor bar end to successor bar start)
- Style the Relations button with active/highlighted state when toggled on (already uses `variant={showRelationships ? 'secondary' : 'outline'}` but could strengthen to `variant="default"` or add `bg-primary/10`)

### 3. Icon-only toolbar buttons with tooltip hover

**Current issue**: Expand, Relations, and Columns buttons all show text labels ("Expand", "Relations", "Columns").

**Fix**: Remove the text labels from all three buttons. Use icon-only buttons wrapped in `<Tooltip>` (from Radix) with hover text showing the function:
- `ChevronsUpDown` → tooltip "Expand" or "Collapse" (dynamic)
- `GitBranch` → tooltip "Relations"
- `Columns3` → tooltip "Columns"

Make each button square (`h-7 w-7`) with just the icon centered.

### Files to modify

- **`src/hooks/useORPPlans.ts`** — In `useORPPlanDetails`, extract `predecessorIds` from `wizard_state.activities` and merge into the activity deliverables
- **`src/components/orp/ORPGanttChart.tsx`** — All three visual changes:
  1. Parent bar: same height/style as normal bars
  2. SVG relationship arrows when `showRelationships` is true
  3. Icon-only buttons with Tooltip wrappers

