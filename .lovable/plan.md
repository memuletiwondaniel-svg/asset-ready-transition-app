

## Plan: Remove all activity feed entries for "Review Cause & Effect" task

The task `3b09727f-3cdf-428d-a417-2b7224924f66` ("Review Cause & Effect – DP-300") has 3 legacy activity entries in `ora_activity_comments` tied to ORA activity ID `5cf9e286-8f6b-4a78-8861-cebd2abec8aa`. There are no entries in `task_comments` for this task.

### Database cleanup (migration)

Delete the 3 rows from `ora_activity_comments` for this activity:

```sql
DELETE FROM ora_activity_comments
WHERE ora_plan_activity_id = '5cf9e286-8f6b-4a78-8861-cebd2abec8aa';
```

This removes:
1. "Status changed to Completed" (March 13)
2. "Completed" (March 15)
3. "Hi Ewan and Daniel, please find attached CD&A for your kind approval" (March 15)

No code changes needed — the feed will render empty once the underlying data is removed.

