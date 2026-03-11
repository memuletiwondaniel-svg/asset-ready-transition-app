

## Problem

1. **Name mismatch**: The Gantt chart shows "Develop P2A Plan" (from `ora_plan_activities.name`) while My Tasks shows "Create P2A Plan" (from `user_tasks.title`). These should be consistent.

2. **Same overlay requirement**: When clicking the P2A activity in the Gantt, the `ORAActivityTaskSheet` already opens (same component used by Kanban). However, the Gantt constructs the task object differently — it uses the DB activity name as `title`, which causes the name discrepancy in the overlay header. The overlay behavior is already the same component; the data fed into it just differs slightly.

## Plan

### 1. Rename the activity from "Develop P2A Plan" to "Create P2A Plan"

Update the hardcoded activity name in the ORA wizard where it inserts the EXE-10 activity:

- **`src/components/ora/wizard/ORAActivityPlanWizard.tsx`** (line 478): Change `'Develop P2A Plan'` → `'Create P2A Plan'`

### 2. Override the title in the Gantt click handler for P2A activities

In `ORPGanttChart.tsx` (line 717), the Gantt passes `deliverable.deliverable?.name` as the title. For P2A activities, override this to `'Create P2A Plan'` so the overlay header matches My Tasks regardless of what's stored in the DB (for existing records that already have "Develop"):

- **`src/components/orp/ORPGanttChart.tsx`** (line 717): Change `title: deliverable.deliverable?.name || ''` → `title: 'Create P2A Plan'` (only in the P2A-specific block)

### 3. Update any other "Develop P2A Plan" references

- **`src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx`** (line ~114 comment): Update comment text referencing "Develop P2A Plan" to "Create P2A Plan" for consistency.

### Files to change
- `src/components/ora/wizard/ORAActivityPlanWizard.tsx` — rename inserted activity
- `src/components/orp/ORPGanttChart.tsx` — override title in P2A click handler
- `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx` — update comment

