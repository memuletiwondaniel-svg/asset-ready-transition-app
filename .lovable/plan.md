

## Collapsible Hierarchy in Gantt Charts

### Current State
Both Gantt components (`StepSchedule.tsx` and `ORPGanttChart.tsx`) render all activities in a flat list. The `WizardActivity` type already has `parentActivityId`, and `ora_activity_catalog` has `parent_activity_id` — the hierarchy data exists but is not used for display.

Activity codes use dot notation for hierarchy: `IDN-01` (parent), `IDN-01.01` (child), `IDN-01.01.01` (grandchild), etc.

### Changes

#### 1. `StepSchedule.tsx` — Wizard Gantt with collapsible rows

- Add `expandedIds: Set<string>` state, defaulting to empty (all collapsed — only top-level activities visible)
- Build a `childrenMap` from `parentActivityId` (same pattern used in `StepActivities.tsx`)
- Compute `visibleActivities` by walking the tree: show root activities always, show children only if parent is in `expandedIds`
- Add a chevron toggle (ChevronRight/ChevronDown) in the Activity Name column for activities that have children
- Indent activity name based on depth level (each level adds ~16px left padding)
- Timeline bars render for visible activities only; parent activities show a summary bar spanning min(start)→max(end) of children

#### 2. `ORPGanttChart.tsx` — Plan view Gantt with collapsible rows

- The `deliverables` data joins `orp_deliverables_catalog` which is fetched via `deliverable:orp_deliverables_catalog(*)` — need to verify if `ora_activity_catalog` fields (specifically `parent_activity_id`) are included. If not, build hierarchy from activity code dot notation (e.g., `IDN-01` is parent of `IDN-01.01`)
- Add `expandedIds: Set<string>` state
- Same tree-walk logic for visible rows
- Add chevron + indentation in the Activity Name column
- Parent rows show aggregated duration (sum or span) and a summary bar

#### 3. Shared hierarchy utility

Create a small helper (inline or extracted) to:
- Build parent→children map from `parentActivityId` or activity code dot notation
- Compute depth level for indentation
- Determine if an activity has children (to show chevron)

### Files Modified

1. **`src/components/ora/wizard/StepSchedule.tsx`** — Add expand/collapse state, tree-walk for visible activities, chevron toggles, indented names, summary bars for parents
2. **`src/components/orp/ORPGanttChart.tsx`** — Same hierarchy logic using activity code parsing or `parent_activity_id` from joined catalog data

