

## Plan: Fix Real-Time Task Updates After Approval

### Root Cause

The Realtime subscription in `useUserTasks` filters by `user_id=eq.${user.id}`. When Daniel approves, the database trigger updates Anuarbek's task metadata (e.g., `progress_percentage`, subtitle text), but Supabase Realtime postgres_changes with an `eq` filter only fires if the filter column value matches **after** the change. The issue is that the trigger likely updates the `user_tasks` row belonging to Anuarbek — which should match — but the metadata fields being updated (like `meta` JSONB) may not trigger the subscription reliably, or the trigger updates a *different* table first.

### Changes

#### 1. `src/hooks/useUserTasks.ts` — Broaden Realtime + reduce polling

- Add a subscription to the `p2a_plan_approvers` table (approval status changes) that also triggers `scheduleRefresh`
- Add a subscription to `task_reviews` table changes (for the ad-hoc review workflow)
- Reduce polling fallback from `30000ms` → `15000ms` for snappier catch-all
- Reduce `staleTime` from `2 minutes` → `30 seconds` so refocusing the tab picks up changes faster
- Enable `refetchOnWindowFocus: true` (currently disabled) — this is the standard behavior users expect

#### 2. Verify trigger writes

Confirm that the approval trigger actually modifies the `user_tasks` row for the task owner (Anuarbek), not just the approver's row. If it does, the current `user_id` filter should work — the fix is just ensuring the subscription is healthy.

### Files to modify
1. `src/hooks/useUserTasks.ts`

