

## Plan: Fix Activity Deletion, Remove Duplicate Narrative, Fix Progress Formula

### 1. Activity deletion not removing from Gantt table

**Root cause**: `handleDelete` in `ORAActivityTaskSheet.tsx` deletes from `ora_plan_activities` and `user_tasks` DB tables, but the Gantt is built from `wizard_state` JSON (line 560 in `useORPPlans.ts`). The wizard_state is never updated, so the activity reappears on refetch.

**Fix**: After deleting DB rows, also update the `wizard_state` JSON on the `orp_plans` row to remove (or mark as deselected) the deleted activity. Steps:
- In `handleDelete`, fetch the current `wizard_state` from the plan
- Filter out the deleted activity from `wizard_state.activities` (or set `selected: false`)
- Update the `orp_plans` row with the modified `wizard_state`
- The existing cache invalidation will then correctly exclude the activity

**File**: `src/components/tasks/ORAActivityTaskSheet.tsx`

### 2. Duplicate narrative under progress bar

**Root cause**: In `ORPGanttOverlay.tsx`, lines 124-126 show "X of Y activities completed" as a simple text line, then lines 127-134 show a full narrative paragraph that starts with the same "X of Y activities completed..." text.

**Fix**: Remove the first duplicate line (lines 124-126) and keep only the full narrative paragraph.

**File**: `src/components/orp/ORPGanttOverlay.tsx` — remove lines 124-126.

### 3. Unrealistic progress formula (showing 61% with only 2 completions)

**Root cause**: When no P2A/VCR activities exist (the current case in the screenshot — activity codes are `EXE-xx`, not `VCR-xx`), the formula falls back to a simple average of `completion_percentage` across all leaf activities. With activities at 60%, 95%, 100%, 100% and others at 0%, the average inflates to ~30-60% despite most activities being untouched.

**Fix**: Revise the fallback (no-P2A) formula to be more realistic by using equal weight per activity but also factoring in status:
- Each activity contributes `1 / totalCount` of the total weight
- Its contribution = `completion_percentage / 100` (so 0% = 0, 100% = 1)
- This is already how it works — the real issue is the denominator. Currently it divides by `leafActivities.length` which counts ALL activities. But looking at the screenshot: 12 activities, with completions at 60+10+0+0+0+0+100+0+0+95+0+0 = 265, divided by 12 = 22%, not 61%.

The 61% discrepancy suggests the overlay is using a different count — likely "2 of 6" (from `useProjectORPPlans` counting only 6 leaf activities due to parent filtering). With 6 leaves: 265/6 = 44%. Still not 61%.

The most likely cause: the `useProjectORPPlans` hook fetches from `ora_plan_activities` table (which may have fewer rows than wizard_state), while the overlay shows all wizard_state activities. The formula runs on the DB subset, producing inflated results.

**Revised formula** (for both P2A and non-P2A cases):
- When P2A activities exist: keep the 50/50 weighted split as designed
- When NO P2A activities exist: use simple average but ensure we count ALL activities from wizard_state, not just DB rows
- Additionally, in `useProjectORPPlans`, use wizard_state as the source of truth for activity count (same as the overlay does), merging in DB status/progress data

**Files**: `src/hooks/useProjectORPPlans.ts` — update the plan-level progress computation to merge wizard_state + ora_plan_activities (similar to `useORPPlanDetails`) before computing weighted progress. This ensures the denominator matches the actual activity count shown in the Gantt.

### Files to modify

1. **`src/components/tasks/ORAActivityTaskSheet.tsx`** — Update wizard_state on delete
2. **`src/components/orp/ORPGanttOverlay.tsx`** — Remove duplicate narrative line
3. **`src/hooks/useProjectORPPlans.ts`** — Fix progress denominator by using wizard_state as source of truth for activity list

