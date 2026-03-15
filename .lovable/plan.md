

## Plan: Remove all activity feed entries for all To Do tasks

There are 24 tasks in "pending" (To Do) status. Only 2 ORA activity IDs still have comments remaining (the others were already cleared in previous migrations). No `task_comments` entries exist for any of these tasks.

### Entries to delete

| ORA Activity ID | Task | Comments |
|---|---|---|
| `41ab2409-fa4e-4470-ae50-174b6080e719` | Review Process Engineering Flow Schemes (PEFS) | 2 |
| `b11bef29-5783-4c0d-89fa-7bf07d0df020` | Review: Competence Development & Assurance Plan | 2 |

### Database cleanup (single migration)

```sql
DELETE FROM ora_activity_comments
WHERE ora_plan_activity_id IN (
  '41ab2409-fa4e-4470-ae50-174b6080e719',
  'b11bef29-5783-4c0d-89fa-7bf07d0df020'
);
```

This removes the remaining 4 entries. No code changes needed.

| File | Change |
|------|--------|
| New migration SQL | Delete `ora_activity_comments` for the 2 activity IDs above |

