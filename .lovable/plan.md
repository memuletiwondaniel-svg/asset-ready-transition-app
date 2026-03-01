

## Progressive Activation for Approving Party VCR Tasks

### Concept
Create `vcr_approval_bundle` tasks immediately during the VCR execution cascade in a `waiting` state. The task is visible but greyed out, showing passive progress as delivering parties complete items. It transitions to `pending` (active/actionable) only when **all** delivering party items for that VCR have been submitted for review.

### Changes Required

#### 1. Database: Update trigger to handle waiting → pending transition
**Migration** — Modify `update_delivering_party_task_progress()` to:
- When a `vcr_checklist_bundle` task reaches 100%, find the matching `vcr_approval_bundle` tasks for the same VCR and transition their status from `waiting` to `pending`
- Track `items_ready_for_review` count in approval bundle metadata as delivering parties complete items

#### 2. Task Generation: Change approval bundle initial status
**File: `src/hooks/useORAActivityPlanSync.ts`** (line ~824)
- Change `status: 'pending'` → `status: 'waiting'` in `generateApprovingPartyTasks`
- Add `metadata.items_ready_for_review: 0` to track how many items have been submitted

#### 3. Hook: Include `waiting` status tasks
**File: `src/hooks/useUserVCRBundleTasks.ts`** (line ~47)
- Currently filters `.neq('status', 'completed')` — this already includes `waiting`, so no change needed

#### 4. UI: Greyed-out waiting state in AllTasksTable
**File: `src/components/tasks/AllTasksTable.tsx`**
- Add `isWaiting` field to `UnifiedTask` interface
- Pass `task.status` through from bundle tasks
- Apply `opacity-50 pointer-events-none` styling to waiting rows
- Show "Waiting for deliverables" label instead of progress bar when status is `waiting`
- Show a subtle "X/Y items ready" counter from metadata

#### 5. UI: Waiting state in VCRChecklistTaskCard
**File: `src/components/tasks/VCRChecklistTaskCard.tsx`**
- Add visual distinction for `waiting` status: greyed-out card, "Awaiting deliverables" badge
- Disable the "Open VCR" action button when in waiting state

### Implementation Steps
1. Update `generateApprovingPartyTasks` to use `status: 'waiting'`
2. Update DB trigger to transition approval bundles from `waiting` → `pending` when all delivering items are submitted
3. Add waiting-state UI styling in `AllTasksTable` and `VCRChecklistTaskCard`

