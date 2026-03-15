

## Plan: Remove all activity feed entries for "Review Process Control Narrative (PCN)"

The task `c02a8e2d-840e-42f6-a1f4-b28265d27cd5` has 2 entries in `ora_activity_comments` tied to ORA activity ID `70008256-ebe9-4ff3-b758-2791f6db7143`. No entries in `task_comments`.

### Database cleanup (migration)

```sql
DELETE FROM ora_activity_comments
WHERE ora_plan_activity_id = '70008256-ebe9-4ff3-b758-2791f6db7143';
```

This removes:
1. "advdsv" (March 9)
2. "Updated today" (March 8)

No code changes needed.

| File | Change |
|------|--------|
| New migration SQL | Delete `ora_activity_comments` rows for activity `70008256-...` |

