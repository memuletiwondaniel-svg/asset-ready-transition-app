

## Plan: Add "Submitted for Approval" Entry to Activity Feed

### Problem
The comments/activity feed currently shows approver decisions (Approved/Rejected) and regular comments, but doesn't show when someone submitted the plan for approval. This creates a gap in the chronological audit trail.

### Data Source
The `p2a_handover_approvers` table records are created at submission time. We can derive the submission timestamp from `MIN(created_at)` of the approvers for a given `handover_id`. The submitter is the `created_by` on `p2a_handover_plans`. We already fetch `existingP2APlan` with `id` and `status` — we'll expand it to also fetch `created_by`.

### Implementation

**File: `src/components/tasks/ORAActivityTaskSheet.tsx`**

1. **Expand the `existingP2APlan` query** (line ~207) to also select `created_by` from `p2a_handover_plans`.

2. **Add a new query** to fetch submission metadata: query `p2a_handover_approvers` for `MIN(created_at)` grouped by `handover_id` to get the submission timestamp. Also resolve the submitter's profile (name + avatar) from `profiles` using `created_by`.

3. **Add submission entry to the unified feed** (line ~993): If submission data exists, inject a new entry with `type: 'submission'`, a blue/indigo "Submitted for Approval" badge, the submitter's avatar and name, and the submission timestamp.

4. **Update the rendering block** (line ~1053): Add a third condition for `entry.type === 'submission'` that renders a blue/indigo pill badge reading "Submitted for Approval", styled as `bg-blue-100 text-blue-700` / `dark:bg-blue-900/30 dark:text-blue-400`.

### Visual Design
- Blue/indigo pill badge: **"Submitted for Approval"**
- Submitter's avatar + name + relative timestamp
- Appears chronologically between regular comments and approval decisions

### Files Modified
- `src/components/tasks/ORAActivityTaskSheet.tsx`

