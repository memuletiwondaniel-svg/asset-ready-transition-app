

## Plan: Fix P2A Task Card Lifecycle — Warning Dialog, Stale State, and Missing Gantt Activity

### Root Causes Found

1. **Missing DB data**: The `ora_plan_activities` table has NO P2A-01 row, and the `wizard_state.activities` array has no P2A entry. The earlier restoration migration only inserted into `user_tasks` — the subquery for `ora_plan_activity_id` returned NULL. This is why the Gantt chart shows no P2A activity.

2. **Wrong column name**: `useKanbanDragDrop.ts` line 172 resets approvers with `.eq('plan_id', ...)` but the column is `handover_id`. The reset silently fails (matches 0 rows).

3. **No warning dialog for P2A revert**: `isApprovalProtected` in `useUnifiedTasks.ts` only checks `APPROVED`/`COMPLETED`, but submitted P2A plans have status `ACTIVE`. So the warning dialog never triggers for submitted-but-not-yet-approved plans.

4. **P2A drag intercept incomplete**: `handleDragEnd` in `TaskKanbanBoard.tsx` only intercepts `todo→in_progress` and `*→done`. It doesn't intercept `done→in_progress` or `done→todo` for P2A tasks, so no warning is shown.

5. **Stale sheet data after revert**: `useKanbanDragDrop.ts` invalidates `p2a-plan-exists-sheet` and `user-tasks` but NOT `ora-activity-detail`, so the ORAActivityTaskSheet still shows old status/CTA/progress after revert.

6. **Task metadata out of sync**: The `user_tasks` row has `plan_status` missing and `completion_percentage: 71` even though the plan is ACTIVE (should be 95%).

### Changes

#### 1. Database Migration — Restore P2A-01 activity + fix task metadata

- Insert `ora_plan_activities` row with code `P2A-01`, name `Develop P2A Plan`, status `IN_PROGRESS`, completion 95% (plan is ACTIVE)
- Append the activity to `orp_plans.wizard_state.activities` JSON array
- Update `user_tasks` metadata to set `plan_status: 'ACTIVE'`, `completion_percentage: 95`, and link the new `ora_plan_activity_id`

#### 2. `useKanbanDragDrop.ts` — Fix approver reset + add query invalidation

- Line 172: Change `.eq('plan_id', ...)` to `.eq('handover_id', ...)`
- After revert, also invalidate `ora-activity-detail` query key so the sheet picks up fresh data
- Extend the P2A revert logic to also fire when `targetColumn === 'todo'` (not just `in_progress`)

#### 3. `TaskKanbanBoard.tsx` — Add warning dialog for P2A Done→In Progress/Todo

- In `handleDragEnd`, for P2A tasks being dragged FROM `done` to `in_progress` or `todo`, show the `ApprovalVoidWarningDialog` (same as ORA plan). On confirm, call `moveTaskToColumn` with `forceMove: true`.
- Remove the existing P2A intercept that just opens the overlay (for todo→in_progress) — the warning dialog should take priority when moving FROM done.

#### 4. `useUnifiedTasks.ts` — Include ACTIVE in isApprovalProtected

- Add `'ACTIVE'` to the `isApprovalProtected` check so P2A tasks that are submitted (but not yet fully approved) also get the warning dialog treatment.

#### 5. `ORAActivityTaskSheet.tsx` — Already correct

The sheet already has the correct CTA logic (`Start` / `Continue` / `View`) and uses `existingP2APlan` query. The fix is just ensuring the query cache is invalidated properly (handled in change #2).

### Files to Edit
1. **Database migration** — Restore P2A-01 activity, update wizard_state, fix task metadata
2. **`src/components/tasks/useKanbanDragDrop.ts`** — Fix `handover_id`, add `ora-activity-detail` invalidation, handle `todo` target
3. **`src/components/tasks/TaskKanbanBoard.tsx`** — Show warning dialog for P2A Done→In Progress/Todo drags
4. **`src/components/tasks/useUnifiedTasks.ts`** — Add ACTIVE to isApprovalProtected

