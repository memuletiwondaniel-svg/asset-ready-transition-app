

## Plan: Post-Approval Task Generation, P2A Activity Special Handling, and Cross-Linkage

### Problem
1. After ORA Plan approval, only a P2A task is generated — no tasks for leaf-level activities
2. The "Develop P2A Plan" activity in the Gantt chart shows standard status buttons (Not Started / In Progress / Completed) instead of a P2A wizard CTA
3. Completing a task in My Tasks doesn't update the Gantt chart activity status, and vice versa

---

### Changes

#### 1. Generate leaf-level tasks during materialization (`ORAActivityPlanWizard.tsx`)

In `materializeActivities()`, after inserting all activities into `ora_plan_activities`, identify leaf-level activities (those whose IDs do not appear as any other activity's `parent_id`). For each leaf activity (excluding the P2A-01 activity which already has its own task):

- Create a `user_task` via `create_user_task` RPC assigned to the Sr. ORA Engineer
- Order by `start_date`, first task gets `High` priority, rest get `Medium`
- Task type: `ora_activity`, metadata includes `plan_id`, `ora_activity_id`, `project_id`, `action: 'complete_ora_activity'`, `activity_code`, `activity_name`

This goes after the existing P2A task creation block (~line 473).

#### 2. Special P2A activity handling in Gantt chart (`ORPGanttChart.tsx`)

In `openActivitySheet()`, detect if the clicked activity is the P2A activity (activity_code === 'P2A-01' or name contains 'P2A Plan'). If so, instead of opening the `ORAActivityTaskSheet`, set state to open the `P2APlanCreationWizard`.

Add state: `showP2AWizard` boolean. Render `P2APlanCreationWizard` at the bottom of the component (needs `projectId` and `projectCode` props — derive from plan data).

Fetch existing P2A plan status to determine CTA label: "Create P2A Plan" vs "Continue P2A Plan".

#### 3. Special P2A status in Gantt chart status column (`ORPGanttChart.tsx`)

For the P2A-01 row in the status column, instead of the standard status badge, render a small CTA button "Create P2A Plan" / "Continue P2A Plan" that opens the P2A wizard.

#### 4. Special P2A handling in ORAActivityTaskSheet (`ORAActivityTaskSheet.tsx`)

Detect if the activity is P2A (via `activity_code === 'P2A-01'` or metadata `action === 'create_p2a_plan'`). If so, replace the standard status toggle section with a single CTA button for the P2A wizard. Render `P2APlanCreationWizard` inside the sheet.

#### 5. P2A task in TaskDetailSheet — already handled
The `TaskDetailSheet` already detects `action === 'create_p2a_plan'` tasks but currently shows them as generic tasks. Need to add specific handling: detect this action, show "Create P2A Plan" / "Continue P2A Plan" CTA that opens `P2APlanCreationWizard`. Requires fetching project info (projectCode, projectName) from `project_id` in metadata.

#### 6. Cross-linkage: Task ↔ Gantt activity sync

**Task → Activity (already partially done):** `ORAActivityTaskSheet.handleSave()` already updates both `ora_plan_activities` and `user_tasks` tables. Verify it also invalidates Gantt queries — it does (`orp-plan-details`).

**Activity → Task:** When status changes in the Gantt (via `ORAActivityTaskSheet`), find the matching `user_task` by metadata `ora_activity_id` and update its status. This is partially done (lines 309-318) but only for real task IDs. Add: when saving from Gantt context (task ID starts with `ora-` or `ws-`), query `user_tasks` by `metadata->>ora_plan_activity_id` matching `realOraActivityId` and update that task's status too.

---

### Files to modify
- `src/components/ora/wizard/ORAActivityPlanWizard.tsx` — add leaf-level task generation in `materializeActivities()`
- `src/components/orp/ORPGanttChart.tsx` — P2A activity special handling in click + status column, add P2A wizard render
- `src/components/tasks/ORAActivityTaskSheet.tsx` — P2A activity detection + CTA, cross-linkage for Gantt-originated saves
- `src/components/tasks/TaskDetailSheet.tsx` — P2A task CTA with P2APlanCreationWizard

