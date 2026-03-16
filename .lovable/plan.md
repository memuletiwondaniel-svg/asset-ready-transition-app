

## Fix: Gantt Chart Activity Overlay and Progress for Ad-Hoc Review Tasks

### Problem Summary

Two issues when clicking activities in the Gantt chart:

1. **Wrong overlay**: The Gantt builds a synthetic task object (no real `task.id`) so the `ORAActivityTaskSheet` cannot look up `task_reviewers`, approvers, attachments, or activity feed. The My Tasks Kanban passes the real `user_tasks` record which has a valid ID.

2. **Wrong progress/status**: When a task has ad-hoc reviewers and is submitted for approval, the Gantt shows 100%/Completed (from `ora_plan_activities.status = COMPLETED`) instead of 95%/In Progress. The P2A activity already has a cap (86% draft, 95% submitted), but generic activities with reviewers lack equivalent logic.

### Root Cause

In `ORPGanttChart.tsx` `openActivitySheet()` (line 938-974), for generic activities (non-P2A, non-VCR), the code creates a synthetic task with `id: deliverable.id` (which is an `ora_plan_activities` UUID, not a `user_tasks` UUID). The `useTaskReviewers` hook then queries `task_reviewers` with this wrong ID and finds nothing.

Additionally, `ora_plan_activities` marks status as `COMPLETED` when the user clicks "Save & Submit" (setting status to COMPLETED), but the task is actually pending approval. There's no reconciliation for ad-hoc review workflows.

### Solution

#### 1. Resolve real user task ID in Gantt's `openActivitySheet`

In `ORPGanttChart.tsx`, add a query to pre-fetch the mapping from `ora_plan_activity_id` to `user_tasks.id` for all leaf activities in the plan. This avoids per-click async lookups.

**New query** (alongside existing queries in the component):
```ts
const { data: activityTaskMap } = useQuery({
  queryKey: ['ora-activity-task-map', planId],
  queryFn: async () => {
    const { data } = await supabase
      .from('user_tasks')
      .select('id, status, metadata')
      .filter('metadata->>ora_plan_activity_id', 'is', 'not.null');
    // Build map: ora_plan_activity_id → user_task record
    const map: Record<string, { taskId: string; taskStatus: string }> = {};
    for (const t of data || []) {
      const oraId = (t.metadata as any)?.ora_plan_activity_id;
      if (oraId) map[oraId] = { taskId: t.id, taskStatus: t.status };
    }
    return map;
  },
  enabled: !!planId,
});
```

Then in `openActivitySheet` for the generic case (line 947), use the real task ID:
```ts
const realTask = activityTaskMap?.[deliverable.id];
setSelectedOraActivity({
  id: realTask?.taskId || deliverable.id,  // Use real user_task ID
  // ... rest stays the same
  status: realTask?.taskStatus === 'completed' ? 'completed' 
    : realTask?.taskStatus === 'in_progress' ? 'in_progress' : 'pending',
});
```

Apply the same pattern to P2A and VCR branches.

#### 2. Add progress/status reconciliation for ad-hoc review tasks

In `ORPGanttChart.tsx`, add a second pre-fetch query to check which tasks have pending reviewers:

```ts
const { data: tasksWithPendingReviewers } = useQuery({
  queryKey: ['gantt-pending-reviewers', planId],
  queryFn: async () => {
    // Get all task_reviewers with PENDING status, joined to user_tasks
    const { data } = await (supabase as any)
      .from('task_reviewers')
      .select('task_id, status');
    // Group by task_id: if any reviewer exists for a task, it has a review workflow
    const taskMap: Record<string, { total: number; pending: number }> = {};
    for (const r of data || []) {
      if (!taskMap[r.task_id]) taskMap[r.task_id] = { total: 0, pending: 0 };
      taskMap[r.task_id].total++;
      if (r.status === 'PENDING') taskMap[r.task_id].pending++;
    }
    return taskMap;
  },
  enabled: !!planId,
});
```

Then in the Gantt bar rendering and status column, apply reconciliation:
- If an activity's linked user task has pending reviewers and status is COMPLETED in the DB, override display to **"In Progress"** with **95%** progress (mirroring the P2A pattern)
- If all reviewers approved, show **Completed** / **100%**

This affects:
- **Status badge** (line 1289): Check the reviewer map and override `deliverable.status` display
- **Progress bar** (line 1373-1374): Cap at 95% when reviewers are pending

#### 3. Apply same logic in `openActivitySheet` status mapping

When building the synthetic task for the overlay, check the reviewer state to set correct `status` field so the `ORAActivityTaskSheet` renders the right UI (submission comment, reviewer section, etc.).

### Files to Change

1. **`src/components/orp/ORPGanttChart.tsx`**
   - Add `activityTaskMap` query to resolve real user task IDs
   - Add `tasksWithPendingReviewers` query for reviewer-aware status
   - Update `openActivitySheet` generic branch to use real task ID
   - Update status badge and progress bar rendering for reviewer-aware activities

2. **`src/components/orp/utils/statusStyles.ts`** (if needed)
   - May need a new status label like "Under Review" for the Gantt display

### Scope

This applies to **all** activities that have ad-hoc reviewers, not just the specific one shown in the screenshot. The P2A and VCR activities already have their own reconciliation — this extends the same pattern to generic ORA activities.

