

## Plan: Bidirectional Sync Between Gantt Bar Drag and Task Detail Overlay

### Problem

Two gaps exist in the current data flow:

1. **Gantt bar drag does NOT sync dates to `user_tasks`**: When a user drags/resizes a Gantt bar, `handleBarResize` updates `ora_plan_activities` and `wizard_state` but never updates `user_tasks.metadata.start_date` / `end_date`. So the task card still shows old dates (and overdue status persists).

2. **Gantt bar drag does NOT invalidate task queries**: After a successful drag, the Gantt only optimistically updates its own `['orp-plan']` cache. It does not invalidate `['user-tasks']`, `['ora-activity-detail']`, or other task-related caches. If the overlay is reopened, it may show stale data.

The overlay → Gantt direction already works (saves invalidate `['orp-plan']`).

### Fix (single file: `src/components/orp/ORPGanttChart.tsx`)

**In `handleBarResize` (lines 900-974), after the successful DB writes:**

1. **Sync dates to `user_tasks`** — find the linked user_task by `metadata->>ora_plan_activity_id` and update its `metadata` with the new `start_date`, `end_date`:

```typescript
// After ora_plan_activities update succeeds (~line 968):
// Sync dates to linked user_task
try {
  const { data: linkedTasks } = await supabase
    .from('user_tasks')
    .select('id, metadata')
    .filter('metadata->>ora_plan_activity_id', 'eq', dbId);

  if (linkedTasks?.length) {
    for (const lt of linkedTasks) {
      const updatedMeta = {
        ...(lt.metadata as Record<string, any> || {}),
        start_date: startStr,
        end_date: endStr,
      };
      await supabase
        .from('user_tasks')
        .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
        .eq('id', lt.id);
    }
  }
} catch (e) {
  console.error('Failed to sync dates to user_tasks:', e);
}
```

2. **Invalidate task-related query caches** after successful save:

```typescript
queryClient.invalidateQueries({ queryKey: ['user-tasks'] });
queryClient.invalidateQueries({ queryKey: ['ora-activity-detail'] });
```

This ensures:
- Task cards immediately reflect new dates (overdue badge disappears if dates are extended)
- The task detail overlay shows updated dates when reopened
- No stale data between Gantt and Kanban views

### Scope
- Single file change: `src/components/orp/ORPGanttChart.tsx`
- Only the `handleBarResize` callback modified
- No backend/database changes needed — `user_tasks` RLS allows users to update their own tasks, and the approver scenario is handled by the Gantt being read-only for non-assignees

