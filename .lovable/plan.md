

## Add Reviewers & Approvers to Task Detail Sheet

### Overview
Add a new "Reviewers & Approvers" section to the ORA Activity Task Sheet (between Prerequisites and Recent Activities) that allows task owners to assign colleagues (e.g., ORA Lead, Project Lead) to review/approve their work on simple (non-P2A) tasks. This provides lightweight sign-off capability without the full P2A approval workflow.

### Database Changes

**New table: `task_reviewers`**
```sql
CREATE TABLE public.task_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role_label TEXT NOT NULL,           -- e.g. "ORA Lead", "Project Lead", free-text
  status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED
  comments TEXT,
  decided_at TIMESTAMPTZ,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);
ALTER TABLE public.task_reviewers ENABLE ROW LEVEL SECURITY;
```

RLS policies: authenticated users can SELECT all rows, INSERT/UPDATE/DELETE where they own the parent task or are the assigned reviewer.

### Frontend Changes

**File: `src/components/tasks/ORAActivityTaskSheet.tsx`**

1. **New section** inserted between the Prerequisites block (~line 1007) and the `<Separator>` before Recent Activities (~line 1054):
   - Header: "Reviewers & Approvers" with `UserCheck` icon
   - **Add reviewer control**: A user-search dropdown (query `profiles` table) with an optional role label input. Selecting a user adds a row to `task_reviewers`.
   - **Reviewer list**: Each assigned reviewer shown as a compact row with:
     - Avatar + name + role label
     - Status badge: Pending (gray), Approved (emerald), Rejected (red)
     - Remove button (X) for the task owner
   - Only shown for **non-P2A** tasks (the P2A branch already has its own approval workflow)

2. **Reviewer action**: When the current user is an assigned reviewer, show Approve/Reject buttons inline on their row. On action, update `task_reviewers.status` and `decided_at`, and insert an activity comment (e.g., "Approved" badge in the feed).

3. **Kanban badge integration**: When a Done-column task has `task_reviewers` records, use the same workflow-aware badge logic: "Under Review · X/Y" (blue) or "Approved" (emerald) instead of generic "Completed".

**New hook: `src/hooks/useTaskReviewers.ts`**
- `useTaskReviewers(taskId)` — fetches reviewers with joined profile data
- `addReviewer`, `removeReviewer`, `submitDecision` mutations
- Profiles search query for the user picker

### UI Layout (in the sheet)
```text
┌─ Reviewers & Approvers ──────────────────┐
│  [Avatar] Anuarbek K. · ORA Lead  ✅     │
│  [Avatar] John D. · Project Lead  ⏳     │
│                                          │
│  [+ Add reviewer...]  [Role: ___]        │
└──────────────────────────────────────────┘
```

### Summary of Files
- **SQL migration**: Create `task_reviewers` table + RLS
- **`src/hooks/useTaskReviewers.ts`**: New hook for CRUD + decision actions
- **`src/components/tasks/ORAActivityTaskSheet.tsx`**: Add reviewers section UI
- **`src/components/tasks/TaskKanbanBoard.tsx`**: Extend badge logic to check `task_reviewers`
- **`src/integrations/supabase/types.ts`**: Regenerated after migration

