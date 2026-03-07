

## Plan: Fix Missing Post-Approval Task Creation for ORA Plans

### Root Cause
The leaf-level task generation code (creating `ora_activity` tasks for the Sr. ORA Engineer) and the P2A task creation were added to `materializeActivities()` **after** DP300's plan was already approved and materialized. The function has an early-return guard:
```
if (existing && existing.length > 0) return;
```
This correctly prevents duplicate activity rows, but it also skips all the task-creation logic that runs after the insert loop. For DP300, activities exist (11 rows) but 0 tasks were created.

### Changes

#### 1. Separate task generation from materialization (`ORAActivityPlanWizard.tsx`)

Refactor `materializeActivities()` to split into two concerns:
- **Activity insertion** (guarded by the existing check — only runs once)
- **Task generation** (separate function `generateLeafTasks()` that checks for existing tasks independently)

The new `generateLeafTasks(planId)` function will:
- Query `ora_plan_activities` for this plan to find leaf activities (no children)
- Check if tasks already exist for this plan (`user_tasks` where `metadata->>'plan_id' = planId AND type = 'ora_activity'`)
- If no tasks exist, look up the Snr ORA Engr from `project_team_members` and create tasks via `create_user_task` RPC
- Also check/create the P2A task if missing

This way, even for already-materialized plans, calling `generateLeafTasks()` will create the missing tasks.

#### 2. Call `generateLeafTasks` after approval in `handleReviewDecision`

After `materializeActivities()` completes (or skips due to existing activities), call `generateLeafTasks()` to ensure tasks always exist. This handles both new and retroactive cases.

#### 3. Add a one-time backfill for DP300

Since DP300 is already approved and won't go through the approval flow again, add a "Generate Tasks" button to the Gantt chart toolbar (visible only when plan is APPROVED and no leaf tasks exist). Clicking it calls `generateLeafTasks()`. Alternatively, we can trigger this automatically when the Gantt chart loads for an approved plan with 0 tasks.

**Automatic approach (preferred):** In the Gantt chart component, when loading an APPROVED plan, check if leaf tasks exist. If not, auto-generate them. This is a self-healing pattern that fixes all past and future gaps.

#### 4. Clean up dead code (`ORAActivityPlanReviewOverlay.tsx`)

This component is not imported anywhere. It contains stale approval logic (wrong priority casing, direct insert bypassing RLS, no consensus check). Remove it to prevent accidental future use.

### Files to Modify
- `src/components/ora/wizard/ORAActivityPlanWizard.tsx` — extract `generateLeafTasks()`, call it after materialization
- `src/components/orp/ORPGanttChart.tsx` — add auto-heal: generate missing tasks on load for approved plans
- `src/components/ora/ORAActivityPlanReviewOverlay.tsx` — delete (dead code)

