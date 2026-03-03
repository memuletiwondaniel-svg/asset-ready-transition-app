

## Plan: Restrict "My Backlog" to Daniel & Add Task Groups

### 1. Sidebar Visibility — Restrict to Daniel Memuletiwon

In `src/components/sidebar/SidebarContent.tsx`, the `navigationItems` array is static. We need to make it dynamic by:
- Adding `currentUserId` to the `SidebarContentProps` (passed from `OrshSidebar.tsx`)
- Filtering out the `my-backlog` nav item unless `currentUserId === '05b44255-4358-450c-8aa4-0558b31df70b'` (Daniel's UUID)
- Also apply the same filter in the collapsed sidebar icon rendering

### 2. Database Schema — Add `backlog_groups` Table

Create a new `backlog_groups` table and add a `group_id` FK to `personal_backlog`:

```sql
CREATE TABLE public.backlog_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backlog_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own groups"
  ON public.backlog_groups FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.personal_backlog
  ADD COLUMN group_id UUID REFERENCES public.backlog_groups(id) ON DELETE SET NULL;
```

Existing backlog items get `group_id = NULL` (ungrouped) which is fine.

### 3. New Hook — `useBacklogGroups`

Create `src/hooks/useBacklogGroups.ts` with CRUD operations:
- `groups` query (fetch all groups for current user, ordered by `sort_order`)
- `addGroup` mutation (insert new group)
- `renameGroup` mutation
- `deleteGroup` mutation (items become ungrouped)

### 4. Update `usePersonalBacklog` Hook

- Accept optional `groupId` filter parameter
- Update `addItem` to accept a `group_id`
- Query now also orders/groups by `group_id`

### 5. Redesign `BacklogPage.tsx`

Replace the flat list with a grouped, collapsible layout:

```text
┌─────────────────────────────────────┐
│ My Backlog                          │
│ 5 pending · 2 done                  │
├─────────────────────────────────────┤
│ [+ New Group]  [All|Pending|Done]   │
├─────────────────────────────────────┤
│ ▼ Sprint Tasks (3)            [···] │
│   ☐ Fix homepage logo               │
│   ☐ PSSR workflow button             │
│   ☑ Update sidebar                   │
│   [+ Add task...]                    │
├─────────────────────────────────────┤
│ ▼ Backlog Ideas (2)           [···] │
│   ☐ VCR/PSSR dependencies           │
│   ☐ Schedule improvements            │
│   [+ Add task...]                    │
├─────────────────────────────────────┤
│ ▼ Ungrouped (1)                     │
│   ☐ Misc item                        │
│   [+ Add task...]                    │
└─────────────────────────────────────┘
```

- Each group is a collapsible section (using Collapsible component)
- Group header has rename/delete via dropdown menu
- Inline "add task" input at bottom of each group
- Ungrouped items shown in a default section
- Existing filters (All/Pending/Done) still work globally

### 6. Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/...` | Create `backlog_groups` table, add `group_id` to `personal_backlog` |
| `src/hooks/useBacklogGroups.ts` | New — CRUD for groups |
| `src/hooks/usePersonalBacklog.ts` | Add `group_id` support to queries and mutations |
| `src/pages/BacklogPage.tsx` | Rewrite with grouped collapsible UI |
| `src/components/sidebar/SidebarContent.tsx` | Accept `currentUserId`, filter nav items |
| `src/components/OrshSidebar.tsx` | Pass `currentUserId` to `SidebarContent` |

