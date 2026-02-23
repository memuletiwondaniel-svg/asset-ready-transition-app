

# Persist PSSR Progress, Category Breakdown, Key Activity Dates, and Item Assignments

## Overview

Currently, the PSSR backend table is missing several key fields that should be stored and automatically updated. This plan adds persistent columns for overall progress, per-category progress, key activity dates, and ensures delivering/approving party assignments are stored per checklist response and linked to user tasks.

---

## What Changes

### 1. Overall % Progress (auto-updated)

**Current state:** Calculated on-the-fly in `useProjectPSSRs.ts` by fetching all responses per PSSR. Not stored in the `pssrs` table.

**Change:** Add a `progress_percentage` integer column (default 0) to the `pssrs` table. Create a database trigger on `pssr_checklist_responses` that recalculates and updates `pssrs.progress_percentage` whenever a response's `status` or `response` value changes.

### 2. Per-Category Progress (auto-updated)

**Current state:** Calculated on-the-fly in `usePSSRCategoryProgress.ts` via multiple queries joining responses to items to categories. Not persisted.

**Change:** Add a `category_progress` JSONB column (default `'{}'`) to the `pssrs` table. The same trigger from Step 1 will also recalculate category-level breakdowns and store them as:
```text
{
  "<category_uuid>": { "completed": 5, "total": 10 },
  "<category_uuid>": { "completed": 3, "total": 8 }
}
```
Frontend hooks (`useProjectPSSRs`, `usePSSRCategoryProgress`) will be updated to read from these persisted columns first, with the existing calculation logic kept as a fallback/initial-seed mechanism.

### 3. Key Activity Dates

**Current state:** The `pssr_key_activities` table already stores `scheduled_date`, `scheduled_end_date`, `location`, and `status`. This is already functional.

**Change:** No database changes needed. Add a `key_activity_dates` JSONB column to `pssrs` as a denormalized summary for quick access in list views (e.g., `{ "kickoff": "2026-02-20", "walkdown": "2026-03-01", "sof_meeting": null }`). A trigger on `pssr_key_activities` will keep this in sync.

### 4. Approving Party per PSSR Item

**Current state:** Each `pssr_checklist_items` row has an `approvers` text column (e.g., "Process TA2, PACO TA2") and `pssr_item_approvals` links responses to roles. However, the `pssr_checklist_responses` table does not store the resolved approving user for that specific PSSR instance.

**Change:** Add `approving_user_id` (UUID, nullable, FK to profiles) and `approving_role` (text, nullable) columns to `pssr_checklist_responses`. During PSSR submission, these will be populated from the item's `approvers` field (or the override from `draft_item_overrides`). The existing `pssr_item_approvals` table remains for multi-party approval workflows.

### 5. Delivering Party per PSSR Item (with Task Creation)

**Current state:** Each `pssr_checklist_items` row has a `responsible` text column (e.g., "Site Engr.") but `pssr_checklist_responses` has no `delivering_user_id`. No automatic task is created for the delivering party.

**Change:**
- Add `delivering_user_id` (UUID, nullable, FK to profiles) and `delivering_role` (text, nullable) columns to `pssr_checklist_responses`.
- During PSSR submission, populate `delivering_role` from the item's `responsible` field (or override).
- Create a database trigger on `pssr_checklist_responses` that, when `delivering_user_id` is set (either during insert or update), automatically inserts a task into `user_tasks` with:
  - `type`: `'pssr_checklist_item'`
  - `title`: The checklist item description
  - `metadata`: `{ pssr_id, checklist_response_id, checklist_item_id }`
  - `status`: `'pending'`
- When a response status changes to `approved`/`YES`, the trigger auto-completes the linked task.

---

## Technical Details

### Database Migration

```text
ALTER TABLE public.pssrs
  ADD COLUMN progress_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN category_progress jsonb DEFAULT '{}',
  ADD COLUMN key_activity_dates jsonb DEFAULT '{}';

ALTER TABLE public.pssr_checklist_responses
  ADD COLUMN delivering_user_id uuid REFERENCES public.profiles(user_id),
  ADD COLUMN delivering_role text,
  ADD COLUMN approving_user_id uuid REFERENCES public.profiles(user_id),
  ADD COLUMN approving_role text;
```

Plus three trigger functions:
1. `update_pssr_progress()` -- on INSERT/UPDATE/DELETE on `pssr_checklist_responses`, recalculates `progress_percentage` and `category_progress` on the parent `pssrs` row.
2. `sync_key_activity_dates()` -- on INSERT/UPDATE on `pssr_key_activities`, updates `pssrs.key_activity_dates`.
3. `manage_delivering_party_task()` -- on INSERT/UPDATE on `pssr_checklist_responses`, creates/completes a `user_tasks` row when `delivering_user_id` is set.

### Frontend Files to Modify

- **`src/hooks/useProjectPSSRs.ts`**: Read `progress_percentage` directly from the `pssrs` select instead of calculating per-response. Remove the N+1 query loop.
- **`src/hooks/usePSSRCategoryProgress.ts`**: Add a fast path that reads `category_progress` JSONB from `pssrs` and only falls back to the full calculation if the column is empty/null.
- **`src/components/pssr/CreatePSSRWizard.tsx`**: During submission (line ~710), populate `delivering_role` and `approving_role` on each checklist response from the item's `responsible`/`approvers` fields (respecting overrides from `draft_item_overrides`).
- **`src/integrations/supabase/types.ts`**: Will auto-update after migration.

### Performance Improvement

The current `useProjectPSSRs` hook runs N+1 queries (one per PSSR to fetch all responses). After this change, progress is a single column read -- eliminating the N+1 pattern entirely.

