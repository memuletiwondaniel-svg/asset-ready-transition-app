

## Plan: Remove all activity feed entries for "Work Execution Flow Scheme (WEFS) - ORA Review"

The task `3f16859d-a11e-43c1-ab99-41c4ad581e05` has 6 entries in `ora_activity_comments` tied to ORA activity ID `2d1e6e89-316f-475a-abe5-5e0878a0745f`. No entries in `task_comments`.

### Database cleanup (migration)

```sql
DELETE FROM ora_activity_comments
WHERE ora_plan_activity_id = '2d1e6e89-316f-475a-abe5-5e0878a0745f';
```

This removes all 6 entries (status changes and duplicate submission messages). No code changes needed.

| File | Change |
|------|--------|
| New migration SQL | Delete `ora_activity_comments` rows for activity `2d1e6e89-...` |

