

## Plan: Remove all activity feed entries for "Alarm Rationalization"

The task has 2 entries in `ora_activity_comments` tied to ORA activity ID `95054378-2c1d-47f8-a75a-00cb29214da7`. No entries in `task_comments`.

### Database cleanup (migration)

```sql
DELETE FROM ora_activity_comments
WHERE ora_plan_activity_id = '95054378-2c1d-47f8-a75a-00cb29214da7';
```

This removes:
1. "Initial Alarm Rationalization report completed" (March 7)
2. "Completed ALarm Rationalization for all the Utility systems" (March 7)

No code changes needed.

| File | Change |
|------|--------|
| New migration SQL | Delete `ora_activity_comments` rows for activity `95054378-...` |

