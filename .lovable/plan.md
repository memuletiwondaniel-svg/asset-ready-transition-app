

## Plan: Fix My Tasks Loading Performance

### Root Cause Analysis

After investigating the full data pipeline, the 60-second delay stems from **multiple compounding issues**, not one single bottleneck:

1. **Missing database index**: `user_tasks` has NO index on `user_id` — every query filters by `user_id` and the RLS policy checks `auth.uid() = user_id`, forcing a full table scan (52 rows now, will get worse). Same for `status`.

2. **Render-blocking director check**: `MyTasksPage` renders a full-page skeleton until `useUserIsDirector` completes — which makes 2 sequential queries (profiles → roles) before ANY task data is even shown.

3. **Sequential query waterfalls**: `fetchUserTasks` runs P2A activity progress as an async IIFE with up to 3 chained queries inside what looks like a `Promise.all` block. Also, `useUserORPActivities` runs 2 sequential queries.

4. **Too many parallel hooks**: `useUnifiedTasks` fires 5 independent hooks (PSSR, P2A approvals, ORA activities, OWL items, user tasks), each establishing separate Supabase connections. Tasks don't render until ALL 5 complete — the slowest hook bottlenecks everything.

5. **No prefetching**: Data fetching only starts when the My Tasks page mounts. No warm-up on login or navigation.

### Proposed Changes

#### 1. Add missing database indexes (Migration)
```sql
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_status ON user_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_type ON user_tasks(user_id, type);
CREATE INDEX IF NOT EXISTS idx_p2a_approval_workflow_approver ON p2a_approval_workflow(approver_user_id, status);
CREATE INDEX IF NOT EXISTS idx_orp_resources_user ON orp_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_outstanding_work_items_assigned ON outstanding_work_items(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);
```

#### 2. Stop blocking render on director check (`MyTasksPage.tsx`)
Remove the `if (isDirectorLoading) return <Skeleton>` guard. Instead, default to the normal view and swap to the director view once the check completes. This lets task hooks start immediately.

#### 3. Flatten the P2A waterfall (`useUserTasks.ts`)
The P2A activity progress lookup (lines 107-148) runs up to 3 sequential queries inside Promise.all. Refactor to run the `orp_plans` lookup in parallel with the direct `ora_plan_activities` lookup instead of sequentially.

#### 4. Prefetch task data on auth (`AuthProvider` or layout)
Add a `queryClient.prefetchQuery` call for `user-tasks` when the user authenticates, so data is already cached when they navigate to My Tasks.

#### 5. Show tasks incrementally (`useUnifiedTasks.ts`)
Currently, the `isLoading` flag blocks ALL cards until every hook completes. Change to show cards from hooks that have already resolved — e.g., if `userTasks` finishes first, show those cards while PSSR/OWL/P2A continue loading.

### Files to Edit
1. **Database migration** — Add indexes on key columns
2. **`src/pages/MyTasksPage.tsx`** — Remove director loading block
3. **`src/hooks/useUserTasks.ts`** — Flatten P2A waterfall queries
4. **`src/components/tasks/useUnifiedTasks.ts`** — Incremental loading (show partial results)
5. **`src/components/enhanced-auth/AuthProvider.tsx`** (or layout) — Prefetch user-tasks on auth

### Impact
- Indexes: faster DB queries as data grows
- Remove director block: saves 1-3 seconds of blank screen
- Flatten waterfall: saves 1-2 round trips
- Incremental loading: cards appear within 500ms of first hook resolving
- Prefetching: near-instant on navigation to My Tasks

