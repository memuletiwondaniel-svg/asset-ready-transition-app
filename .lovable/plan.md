
Goal: Fix the ad-hoc reviewer workflow so when Daniel approves, all three surfaces stay consistent:
1) Task card badge counter (`Under Review · X/Y`)
2) Reviewer status chip (Pending → Approved/Rejected)
3) Activity feed entry showing reviewer decision

What I found (confirmed from code + DB):
- The reviewer decision in `TaskDetailSheet` (for `task.type === 'review'` and `metadata.source === 'task_review'`) currently calls the generic `onApprove/onReject`, which only updates `user_tasks.status`.
- The canonical reviewer state is in `task_reviewers.status` (used by:
  - badge counters in `TaskKanbanBoard.tsx`
  - reviewer chips in `TaskReviewersSection.tsx`).
- Because `task_reviewers` is never updated in that path, DB ends up inconsistent:
  - review task = `completed`
  - reviewer row = `PENDING`
- Activity feed in source task reads `ora_activity_comments`, but reviewer approval from this path does not write a decision event there.
- DB audit confirms one live mismatch now (`review_task completed` while `task_reviewers pending`), so this is currently seen for Daniel, but the bug is systemic for any reviewer using that decision path.

Implementation plan

1) Database + backend consistency (single source of truth)
- Add migration with trigger function on `task_reviewers` UPDATE (decision changes):
  - Scope: only when `NEW.status` changes to `APPROVED` or `REJECTED`.
  - Sync matching reviewer `user_tasks` record (`type='review'`, `metadata.source='task_review'`, `metadata.task_reviewer_id=NEW.id`) to:
    - `status='completed'`
    - metadata outcome fields (`outcome`, `decision_at`, optional `review_comment`)
  - Insert activity event into `ora_activity_comments` for source task context (if source task has `ora_plan_activity_id` + `plan_id`), attributed to reviewer user.
- Add idempotency guards to avoid duplicate comment inserts if status is toggled/re-saved.
- Add backfill SQL in same migration:
  - Find historical mismatches where reviewer task is already completed/cancelled but `task_reviewers` still pending.
  - Update `task_reviewers` to `APPROVED/REJECTED` accordingly.
  - Insert missing activity entries for those corrected rows.

2) Frontend decision path correction (`TaskDetailSheet`)
- For ad-hoc review cards (`isAdHocReview`):
  - Replace generic `onApprove/onReject` path with direct reviewer decision mutation against `task_reviewers` row (`metadata.task_reviewer_id`).
  - Keep generic path for non-ad-hoc workflows (P2A, ORA review, etc.).
- UX polish (enterprise-grade):
  - Button copy for review tasks: “Approve Review” / “Reject Review”
  - Show inline loading state + disable both buttons during submit
  - Success toast reflects final action (“Review approved”, “Review rejected”)

3) Query/cache invalidation to remove stale UI
- In `useTaskReviewers.ts` `submitDecision.onSuccess`, also invalidate:
  - `['user-tasks']`
  - `['task-reviewers-summary']` (kanban counter source)
- In `TaskDetailSheet` ad-hoc decision success:
  - invalidate `['task-reviewers', sourceTaskId]`
  - invalidate `['review-activity-comments', sourceOraActivityId]`
  - invalidate `['user-tasks']`
- This ensures immediate refresh for the acting user.

4) Realtime robustness (cross-user visibility)
- Add lightweight realtime listener for `task_reviewers` changes in `TaskKanbanBoard` (or shared hook), filtered by relevant source task IDs:
  - On insert/update/delete: invalidate `task-reviewers-summary` + `user-tasks`.
- Optional fallback: low-frequency polling when subscription is disconnected.
- This prevents “approved but still 0/2” perception for other users viewing board concurrently.

5) Safety scope / non-regression
- Trigger logic explicitly scoped to `task_review` workflow only.
- No changes to P2A approval path (`p2a_handover_approvers`) and no changes to unrelated task types.
- No schema-breaking table redesign; additive trigger/function + backfill only.

Validation checklist (must pass)
1. Daniel opens his review task and clicks Approve:
   - `task_reviewers.status` becomes `APPROVED`
   - review task becomes `completed`
   - source card badge becomes `Under Review · 1/2`
   - source reviewer list shows Daniel = Approved
   - activity feed includes Daniel approval event
2. Ewan approves afterward:
   - badge becomes `Approved` (or `Under Review · 2/2` then Approved depending current UI rule)
3. Reject path:
   - reviewer row = `REJECTED`
   - source badge = `Rejected`
   - feed logs rejection event
4. P2A “Develop P2A Plan” still behaves unchanged.
5. No new mismatch rows from audit query:
   - `review_task completed + reviewer pending` should be zero.

Technical details (concise)
```text
Current broken flow:
Reviewer TaskDetailSheet approve
  -> updates user_tasks only
  -> task_reviewers unchanged (still PENDING)
  -> counters/chips wrong, no activity event

Planned fixed flow:
Reviewer TaskDetailSheet approve/reject
  -> updates task_reviewers (canonical)
  -> DB trigger syncs reviewer user_task + logs activity
  -> frontend invalidates summary/feed/task queries
  -> all views stay consistent
```
