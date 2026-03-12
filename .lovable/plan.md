

## Plan: Retain Approval History Across Resubmissions

### Problem
When a P2A plan is resubmitted after rejection, old approver records are **deleted** (wizard save, line 489) or **reset** (kanban revert, line 170–172), destroying the audit trail.

### Approach
Create a `p2a_approver_history` table to archive decisions before they're cleared. The activity feed will query both current approvers and archived history, rendering a complete timeline across all submission cycles.

### Steps

**1. Create `p2a_approver_history` table** (SQL migration)

```sql
CREATE TABLE public.p2a_approver_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES p2a_handover_plans(id) ON DELETE CASCADE,
  original_approver_id UUID,
  user_id UUID,
  role_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  status TEXT NOT NULL,
  approved_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ DEFAULT now(),
  cycle INTEGER NOT NULL DEFAULT 1
);
ALTER TABLE public.p2a_approver_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read approver history"
  ON public.p2a_approver_history FOR SELECT TO authenticated USING (true);
```

**2. Archive before delete** — `src/hooks/useP2APlanWizard.ts` (line ~489)

Before the existing `delete` call, insert a query to copy all current approver records (where `status != 'PENDING'` or `approved_at IS NOT NULL`) into `p2a_approver_history` with a calculated `cycle` number. Then proceed with the delete + re-insert as today.

**3. Archive before reset** — `src/components/tasks/useKanbanDragDrop.ts` (line ~170)

Before resetting approvers to PENDING, copy decided records (`approved_at IS NOT NULL`) into `p2a_approver_history`.

**4. Update activity feed** — `src/components/tasks/ORAActivityTaskSheet.tsx`

Add a query for `p2a_approver_history` filtered by `handover_id`. Merge these archived entries into the `activityFeed` as `type: 'approval_action'` entries (same rendering), with an additional subtle "Round N" label for older cycles.

**5. Update Supabase types** — regenerate or manually add the new table type.

### Files Modified
- SQL migration (new table + RLS)
- `src/hooks/useP2APlanWizard.ts` — archive before delete
- `src/components/tasks/useKanbanDragDrop.ts` — archive before reset
- `src/components/tasks/ORAActivityTaskSheet.tsx` — query + render history
- `src/integrations/supabase/types.ts` — add new table type

