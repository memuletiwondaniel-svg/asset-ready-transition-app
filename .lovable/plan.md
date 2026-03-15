

## Plan: Remove all activity feed entries for "Commissioning Test Procedures (CTPs)" task

The task `41f92a96-d2f4-45c2-a7a0-53476b4fb776` has 2 entries in `ora_activity_comments` tied to ORA activity ID `e0421a6b-3567-4ee2-8b99-e83ff9a45780`. No entries in `task_comments`.

### Database cleanup (migration)

```sql
DELETE FROM ora_activity_comments
WHERE ora_plan_activity_id = 'e0421a6b-3567-4ee2-8b99-e83ff9a45780';
```

This removes:
1. "Reviewed with comments" (March 9)
2. "New CTP required for Compressor A" (March 9)

No code changes needed.

