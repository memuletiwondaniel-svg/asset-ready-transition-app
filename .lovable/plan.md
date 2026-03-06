

## Investigation Findings: Gantt Drag Bounce-Back Root Cause

The bounce-back has **three distinct causes** that have been persisting through previous fix attempts:

### Root Cause 1: `start_date` always reads from wizard_state, ignoring DB updates
In `useORPPlanDetails` (line 569):
```
start_date: a.startDate || a.start_date || null,
```
For `ora-` prefixed activities (those with an `oraRow`), `handleBarResize` only updates the `ora_plan_activities` DB table — it does NOT update wizard_state. But when the query refetches, `start_date` is always rebuilt from wizard_state (`a.startDate`), **ignoring the DB value entirely**. The `end_date` (line 570) has `oraRow?.end_date` priority so end dates partially work, but start dates always bounce back.

### Root Cause 2: Query invalidation overwrites optimistic cache
The 500ms `setTimeout` invalidation triggers a full refetch of `useORPPlanDetails`, which re-runs the entire `queryFn`. This rebuilds deliverables from wizard_state + DB. If wizard_state wasn't updated (for `ora-` activities), or if the DB write is still in-flight, the refetch brings back stale data.

### Root Cause 3: Both `ora-` and `ws-` activities need wizard_state updated
The current code only updates wizard_state for `ws-` prefixed activities. But `ora-` activities also originate from wizard_state and their dates are read from there. Both paths must update wizard_state.

---

## Plan

### 1. Fix `handleBarResize` in `ORPGanttChart.tsx`
- **Always update wizard_state** for both `ora-` and `ws-` activities: fetch the plan's wizard_state, find the matching activity by stripped ID, update `startDate`/`start_date`/`endDate`/`end_date` fields
- **Also update `ora_plan_activities`** table for both (upsert for `ws-`, update for `ora-`)
- **Cancel in-flight queries** before optimistic update using `queryClient.cancelQueries({ queryKey: ['orp-plan'] })`
- **Only invalidate on error**, not on success — trust the optimistic cache and let the next natural refetch pick up DB state
- Remove the aggressive 500ms `setTimeout` invalidation

### 2. Fix `useORPPlanDetails` merge logic in `useORPPlans.ts`
- Change line 569 to prefer `oraRow` dates when available:
  ```
  start_date: oraRow?.start_date || a.startDate || a.start_date || null,
  end_date: oraRow?.end_date || a.endDate || a.end_date || null,
  ```
  This ensures that once dates are persisted to the DB, they take priority over stale wizard_state values.

### 3. UI: Increase spacing between title and metrics row (`ORPGanttOverlay.tsx`)
- Change `mt-2.5` to `mt-4` on the metrics grid container

### 4. UI: Reduce SPI/At Risk/Slippage card size (`ORPGanttOverlay.tsx`)
- Reduce `min-w-[70px]` to `min-w-[56px]`
- Reduce padding from `px-3 py-1.5` to `px-2 py-1`
- Reduce icon size from `h-3.5 w-3.5` to `h-3 w-3`
- Reduce value font from `text-sm` to `text-xs`

