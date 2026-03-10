

## Plan: Clean Up P2A Plan Task Card Lifecycle

### Problem
The "Create P2A Plan" task card has inconsistent progress display (showing 95% when plan is DRAFT), and drag interactions don't enforce the correct workflow. The user wants a clear, enforced lifecycle where the task card and Gantt activity are always in sync with the actual P2A plan state.

### Desired Lifecycle

```text
State              | Kanban Column  | Progress | Overlay CTA        | Gantt Status
───────────────────┼────────────────┼──────────┼────────────────────┼─────────────
No plan exists     | To Do          | 0%       | "Start P2A Plan"   | Not Started
Draft saved        | In Progress    | 14-86%   | "Continue P2A Plan"| In Progress
Submitted          | Done           | 95%      | "View P2A Plan"    | In Progress
Fully approved     | Done           | 100%     | "View P2A Plan"    | Completed
```

### Changes Required

#### 1. Block drag from Todo → In Progress for P2A tasks (`TaskKanbanBoard.tsx`)
Currently, dragging a P2A card from Todo to In Progress calls `moveTaskToColumn()` which silently moves it. Instead, for P2A tasks that are in "Todo" (no plan started), intercept this drag and open the overlay sheet — guiding the user to click "Start P2A Plan". The card should only move to In Progress when the wizard is actually saved.

**In `handleDragEnd`**: Add a check before the `moveTaskToColumn` call — if the task is a P2A creation task and is in `todo`, open the ORA Activity sheet instead of moving the card.

#### 2. Block drag from In Progress → Done for P2A tasks (already partially done)
Already opens the overlay. Ensure the overlay shows contextual messaging: "Complete all wizard steps and submit the plan to mark this as done." No "Confirm Completed" button for P2A tasks (already implemented).

#### 3. Update ORAActivityTaskSheet P2A section (`ORAActivityTaskSheet.tsx`)
- When no plan exists (status = null): CTA reads **"Start P2A Plan"** with supporting text "Launch the P2A planning wizard to begin."
- When plan is DRAFT: Show **"Draft"** badge, CTA reads **"Continue P2A Plan"**, supporting text "You have a saved draft..."
- When plan is ACTIVE (submitted): Show **"Pending Approval"** badge, CTA reads **"View P2A Plan"**, supporting text about awaiting approval. Add note that no changes are permitted (read-only). Include "Request Changes" option.
- When plan is APPROVED/COMPLETED: Show **"Approved"** badge, CTA reads **"View P2A Plan"**.

The CTA label logic is mostly already there but needs the "Start" vs "Continue" distinction (currently only "Create" vs "Continue").

#### 4. Fix progress resolution in `useUnifiedTasks.ts`
The core bug: when `p2aActivityProgress` returns a stale value (e.g., 95%) and `metaPlanStatus` is `DRAFT`, the guard caps it at 86%. But the guard relies on `metaPlanStatus` from `user_tasks.metadata` which may also be stale. 

**Fix**: Also check the `oraAct` status — if the ora_plan_activity status is `IN_PROGRESS`, force the cap. Additionally, when `p2aActivityProgress` has no entry and the task status is `pending` (todo), default progress to 0 explicitly.

#### 5. Fix Kanban column mapping for P2A tasks (`useUnifiedTasks.ts`)
Currently `mapToKanbanColumn` checks for workflow tasks with plan status APPROVED/COMPLETED → done. But it doesn't map `pending` + `0%` → `todo` explicitly for P2A tasks. The existing logic should handle this, but verify the progress-based override isn't incorrectly pushing 0% tasks to `in_progress`.

#### 6. Gantt Chart sync (`ORPGanttChart.tsx`)
Apply the same progress cap logic for P2A activities in the Gantt chart rendering — if the activity code is `P2A-01` and the linked plan is in DRAFT status, cap progress at 86%.

#### 7. Database trigger cleanup (migration)
The existing `trg_sync_p2a_revert_to_draft` trigger should be verified/updated to ensure it correctly resets both `ora_plan_activities.completion_percentage` and `user_tasks.metadata.plan_status` when the plan reverts to DRAFT. The current trigger looks correct but should also handle the case where the plan was never submitted (staying in DRAFT) — the trigger should be a no-op in that case (already handled by `IF OLD.status = 'DRAFT' THEN RETURN NEW`).

### Files to Edit
1. **`src/components/tasks/TaskKanbanBoard.tsx`** — Intercept P2A drag from Todo→In Progress to open overlay instead
2. **`src/components/tasks/ORAActivityTaskSheet.tsx`** — Update CTA label from "Create" to "Start", improve contextual messaging
3. **`src/components/tasks/useUnifiedTasks.ts`** — Strengthen progress guard, ensure correct kanban column for P2A tasks at 0%
4. **`src/components/tasks/useKanbanDragDrop.ts`** — Add `'open_sheet'` return type for P2A Todo→In Progress intercept
5. **`src/components/orp/ORPGanttChart.tsx`** — Apply progress cap for P2A activities in DRAFT status

### No database migration needed
The existing trigger already handles the DRAFT revert correctly. The issue is purely frontend: stale cache data and missing drag intercepts.

