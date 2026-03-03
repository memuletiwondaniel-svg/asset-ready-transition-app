

## Diagnosis: Tasks Not Visible on My Tasks Page

### Root Cause

The My Tasks page has three panels (PSSR/P2A, ORA Activities, OWL), each querying a **different, narrow data source**. Tasks that don't match any panel's filter criteria are invisible -- even though they exist in the `user_tasks` table.

**Anuarbek's specific case:** He has a pending "Create ORA Plan" task (source: `ora_workflow`) in `user_tasks`. However:
- **PSSR/P2A Panel** only shows tasks where `metadata.source = 'pssr_workflow'` or `'p2a_handover'`
- **ORA Activities Panel** queries `orp_resources` joined with `orp_plans` (not `user_tasks` at all)
- **OWL Panel** queries `outstanding_work_items` table (not `user_tasks`)

Since the ORA panel doesn't look at `user_tasks`, and neither of the other panels accept `ora_workflow` source, the task is invisible. All three panels report zero items, triggering the "You're all caught up!" message.

**Other affected task types:**
- `pssr_checklist_bundle` / `pssr_approval_bundle` tasks (no `source` metadata) -- also excluded from the PSSR panel's `relevantUserTasks` filter, though they may appear via the separate `usePSSRsAwaitingReview` hook
- Any future task sources will have the same blind spot

### Plan

#### 1. Add an "Action Items" section to the ORA Activities Panel

The ORA Activities panel should also display `user_tasks` where `metadata.source = 'ora_workflow'`. This is the most natural home for ORA-related action items like "Create ORA Plan".

- In `ORPActivitiesPanel.tsx`, import and use `useUserTasks` alongside `useUserORPActivities`
- Filter user tasks for `metadata.source === 'ora_workflow'` and `status !== 'completed'`
- Render these as action items above or alongside the existing ORP resource activities
- Include their count in `onTaskCountUpdate` so the parent correctly calculates total tasks

#### 2. Expand the PSSR Panel to show PSSR bundle tasks

Update the `relevantUserTasks` filter in `PSSRReviewsPanel.tsx` to also include tasks of type `pssr_checklist_bundle`, `pssr_approval_bundle`, `vcr_checklist_bundle`, and `vcr_approval_bundle`. These are PSSR/VCR workflow tasks that currently fall through the filter.

#### 3. Add a catch-all "General Tasks" fallback

To prevent future blind spots, add logic that catches any `user_tasks` not claimed by the three existing panels. Options:
- Add a fourth lightweight section/panel for uncategorized tasks
- Or, extend the PSSR panel (which is already the broadest) to include any tasks that don't match ORA or OWL sources

#### 4. Fix the hidden panel double-mounting issue

The page currently mounts hidden `sr-only` copies of all three panels (lines ~180-210 in `MyTasksPage.tsx`) purely for count reporting. This causes duplicate data fetching and potential count inconsistencies. Instead, the count should come from the visible panels or a single shared query.

### Technical Details

**File changes:**
- `src/components/tasks/ORPActivitiesPanel.tsx` -- Import `useUserTasks`, filter for `ora_workflow` tasks, merge count into `onTaskCountUpdate`, render action items
- `src/components/tasks/PSSRReviewsPanel.tsx` -- Expand `relevantUserTasks` filter to include bundle task types (`pssr_checklist_bundle`, `vcr_checklist_bundle`, etc.)
- `src/pages/MyTasksPage.tsx` -- Remove the hidden `sr-only` duplicate panel mounts; rely on visible panels for counts
- Optionally add a general tasks fallback for uncategorized tasks

