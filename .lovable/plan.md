

## Plan: Toolbar Spacing, Remove Maximize2, Weighted Progress Formula, Progress Narrative

### 1. Toolbar layout — move icon group left, remove Maximize2

**File**: `src/components/orp/ORPGanttChart.tsx`

- Add a spacer `div` (e.g., `ml-4` or `flex-grow`) between the Columns tooltip (line ~489) and the Zoom presets section (line ~491) to push them apart visually
- Remove the Maximize2 button at lines 509-511 (the "Fit to screen" icon-only button inside the zoom controls group)

### 2. Weighted overall progress formula

**File**: `src/hooks/useProjectORPPlans.ts` — replace the simple average at lines 73-74.

New formula:
- **P2A activities** (detected by `activity_code` starting with `VCR-`): weighted at 50% of total. Split evenly across distinct VCR groups (by top-level VCR code e.g. `VCR-001`). Within each VCR, activities whose name contains "Systems Readiness" or "System Readiness" get 20% of that VCR's share; remaining activities split the other 80%
- **Non-P2A activities**: weighted at 50% of total. Simple average of their `completion_percentage`
- Each activity contributes its `completion_percentage / 100`
- If no P2A activities exist, fall back to equal-weight average of all leaf activities
- Compute counts: `completedCount`, `inProgressCount`, `notStartedCount`, `p2aProgress`, `vcrCount`

### 3. Progress narrative summary

**File**: `src/components/orp/ORPGanttOverlay.tsx` — below the existing progress bar (line ~118), add a `<p>` element with auto-generated text like:

> "3 of 12 activities completed. 5 in progress, 4 not started. P2A readiness across 3 VCRs is at 40%."

This requires passing additional stats from `useProjectORPPlans` — specifically `inProgressCount`, `notStartedCount`, `p2aProgress`, and `vcrCount`. These will be added to the `ProjectORPPlan` interface and computed alongside the weighted progress.

The overlay component already receives `overallProgress`, `completedCount`, and `totalCount` as props — we'll add the new stats as optional props and compute the narrative string.

### Files to modify

1. **`src/components/orp/ORPGanttChart.tsx`** — Add spacer between icons and zoom presets; remove Maximize2 button
2. **`src/hooks/useProjectORPPlans.ts`** — Weighted progress formula + additional stats fields
3. **`src/components/orp/ORPGanttOverlay.tsx`** — Accept new stats props, render narrative below progress bar

