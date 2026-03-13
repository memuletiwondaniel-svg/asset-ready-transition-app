

## Root Cause

The P2A approval history is bleeding into non-P2A task cards because of **stale React Query cache leakage**:

1. User opens a P2A task (e.g., "Develop P2A Plan") → queries for `p2aApproverDecisions` and `p2aApproverHistory` fire and cache results keyed by the plan ID.
2. User closes that sheet, opens a different task (e.g., "Review Process Engineering Flow Schemes") → `isP2AActivity` is `false`, so the queries are `enabled: false` — but React Query **retains the previously cached data** in `p2aApproverDecisions` and `p2aApproverHistory`.
3. The feed merger at line ~1038 unconditionally merges `p2aApproverDecisions` and `p2aApproverHistory` arrays into the activity feed — it never checks whether the current task is actually a P2A activity.

**Secondary issue**: The query key `['p2a-plan-exists-sheet', projectId]` is shared across all tasks in the same project, so `existingP2APlan` may also be stale/cross-contaminated.

## Fix

**ORAActivityTaskSheet.tsx** — Two changes:

1. **Guard the feed merger**: Only include approver entries and history entries in the unified activity feed when `isP2AActivity` is true:
   ```typescript
   const approverEntries = isP2AActivity ? (p2aApproverDecisions || []).map(...) : [];
   const historyEntries = isP2AActivity ? (p2aApproverHistory || []).map(...) : [];
   ```

2. **Reset stale query data when task changes**: When the sheet opens with a non-P2A task, explicitly clear the P2A-specific query data to prevent leakage. This can be done by making the query keys task-specific (include `task?.id`) OR by adding an effect that resets the data when the sheet opens for a non-P2A activity.

   Preferred approach — scope query keys to include task ID:
   - `['p2a-plan-exists-sheet', projectId, task?.id]`
   - `['p2a-approver-decisions', existingP2APlan?.id, task?.id]`
   - `['p2a-approver-history', existingP2APlan?.id, task?.id]`

   This ensures each task card gets its own cache entry and data doesn't bleed across tasks.

**TaskDetailSheet.tsx** — Same pattern:
- Guard the `P2AActivityFeed` render so it only shows when `isP2aTask || isP2aApprovalTask` is true (verify current guards are correct).

## Files to Edit

- `src/components/tasks/ORAActivityTaskSheet.tsx` — Guard feed merger with `isP2AActivity` check; scope query keys to task ID
- `src/components/tasks/TaskDetailSheet.tsx` — Verify P2AActivityFeed render guards (likely already gated but confirm)

No database or backend changes needed — this is purely a frontend cache/rendering bug.

