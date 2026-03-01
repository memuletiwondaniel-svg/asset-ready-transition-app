

## Consolidated VCR Delivering Party Task with Progress Tracker

### Overview
Replace the current per-item task creation (14 tasks for 14 items) with a single consolidated task per delivering party per VCR, featuring an embedded progress tracker and mini-checklist.

### Database Changes

**Add columns to `user_tasks`** (migration):
```sql
ALTER TABLE public.user_tasks 
  ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_items jsonb DEFAULT '[]'::jsonb;
```

- `progress_percentage`: 0-100, auto-calculated from sub-item completion
- `sub_items`: JSON array storing linked prerequisite IDs and their completion state, e.g.:
  ```json
  [
    {"prerequisite_id": "uuid", "summary": "Design review complete", "completed": false},
    {"prerequisite_id": "uuid", "summary": "Safety docs submitted", "completed": true}
  ]
  ```

**Create a trigger function** to auto-update the consolidated task when a `p2a_vcr_prerequisites` status changes:
```sql
CREATE OR REPLACE FUNCTION update_delivering_party_task_progress()
```
- Fires on UPDATE of `p2a_vcr_prerequisites`
- Finds the matching `user_tasks` row (type = `vcr_checklist_bundle`, metadata vcr_id match, delivering_party_id match)
- Updates `sub_items` to mark the changed item as completed/uncompleted
- Recalculates `progress_percentage`
- Auto-completes the task when 100%

### Backend Logic Changes

**File: `src/hooks/useORAActivityPlanSync.ts`**

Refactor `generateDeliveringPartyTasks` (lines 549-684):
- Change task type from `vcr_checklist_item` to `vcr_checklist_bundle`
- Instead of creating one task per prerequisite, group by `(userId, delivering_party_id)` and create ONE task per user per VCR
- Title: `"VCR Checklist Items – {vcrLabel}"` with subtitle showing count
- Populate `sub_items` with all actionable prerequisites
- Set `progress_percentage` to 0
- Include `metadata.total_items` and `metadata.completed_items` for quick reads

### UI Changes

**File: `src/components/tasks/ORPActivitiesPanel.tsx`** (or wherever VCR tasks render in My Tasks)

No changes needed here — VCR checklist tasks are type `vcr_checklist_bundle` and would surface through the existing task hooks.

**File: `src/components/tasks/AllTasksTable.tsx`**

- Add `vcr_checklist_bundle` to `CATEGORY_CONFIG`
- Show a progress bar inline in the table row for bundle tasks
- Display "X/Y items" text alongside the progress

**New component: `src/components/tasks/VCRChecklistTaskCard.tsx`**

A reusable card for rendering consolidated VCR tasks in both grid and table views:
- Progress bar (e.g., `10/14 – 71%`)
- Expandable mini-checklist showing each sub-item with check/unchecked state
- Click-through to the VCR overlay for the specific item
- Color-coded progress (green > 75%, amber 25-75%, red < 25%)

**File: `src/hooks/useUserORPActivities.ts`** (or create new hook)

Add a hook or extend existing to fetch `vcr_checklist_bundle` tasks for the current user, including their `sub_items` and `progress_percentage`.

### Implementation Steps

1. Run database migration (add columns + trigger)
2. Refactor `generateDeliveringPartyTasks` to create consolidated bundle tasks
3. Create `VCRChecklistTaskCard` component with progress bar and mini-checklist
4. Integrate bundle tasks into `AllTasksTable` and panel views
5. Wire the DB trigger to keep progress in sync when prerequisites change

