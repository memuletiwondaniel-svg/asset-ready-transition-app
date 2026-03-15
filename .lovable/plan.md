
Goal: fix the recurring root-cause issues so each task card shows only its own data, submissions show correctly as a single “Submitted + comment” event, attachments are visible to approvers, and Done → In Progress always requires a confirmation reason.

1) What I found (root causes)
- Wrong overlay is opened for review tasks in multiple places:
  - `TaskKanbanBoard`, `UnifiedTaskList`, and `TaskTableView` currently treat any task with `metadata.ora_plan_activity_id` as an ORA activity and open `ORAActivityTaskSheet`.
  - Review tasks also carry `ora_plan_activity_id`, so approvers are being routed to the wrong UI.
- That wrong UI uses `useORAActivityComments`, which intentionally merges comments across related tasks/activity IDs, causing “inherited” feeds across cards.
- Submission is logged as two separate ORA comments (`Completed` and then the free-text note), so feed shows two entries instead of one combined submission event.
- The “Completed” label appears because ORA overlay feed is rendering status text directly, not a submission event type.
- Database data confirms this exact split event now: one `ora_activity_comments` row with `Completed`, another with the submission text for the same timestamp/user.

2) Frontend plan (simplify and isolate by task)
A. Fix task routing (critical)
- In all 3 task launch points:
  - `TaskKanbanBoard.tsx`
  - `UnifiedTaskList.tsx`
  - `TaskTableView.tsx`
- Only open `ORAActivityTaskSheet` for true author/activity tasks (`type === 'ora_activity'` or `action === 'complete_ora_activity'` or `action === 'create_p2a_plan'`).
- Explicitly exclude `metadata.source === 'task_review'` so reviewer cards always open `TaskDetailSheet` (where source attachments and source task activity are already handled correctly).

B. Use task-scoped feed in activity sheet
- Replace ORA merged feed usage in `ORAActivityTaskSheet` with task-scoped comments (`task_comments`, keyed by task_id) for card-level feed rendering.
- Keep ORA plan-level aggregate history in `ApprovalActivityFeed` (plan review context), not in card-level activity sheets.

C. Single submission event rendering
- In `ORAActivityTaskSheet`, on submit-for-approval:
  - stop writing separate `Completed` + separate comment feed entries.
  - write one submission event (with comment) so UI shows a single row: badge “Submitted” + note text.
- Update feed renderer to treat this as “Submitted” (blue badge), not “Completed”.

D. Done → In Progress confirmation for all task types
- In `TaskKanbanBoard` drag handling, intercept all Done → non-Done transitions and show the warning dialog with mandatory reason + acknowledgement.
- Keep specialized messaging for review/protected workflows, but apply a generic reopen warning for normal tasks too.
- Ensure move call always passes reason, and always writes an audit feed entry for reopen action.

3) Backend + database plan (make behavior permanent and consistent)
A. Canonical per-card event model
- Standardize card-level history on `task_comments` (already per-task, no need for “one table per card”).
- Add/standardize `comment_type` usage for:
  - `submission`
  - `status_change`
  - `reopened`
  - existing reviewer decision/void types.
- Update DB trigger/RPC path so submission creates one canonical `submission` event row.

B. Submission API/RPC (atomic)
- Add a DB RPC (or secure function) to atomically:
  1) mark source task completed,
  2) ensure reviewer tasks exist,
  3) insert one `task_comments` submission event (with mandatory comment),
  4) optionally mirror to `ora_activity_comments` only for plan-level legacy views.
- Frontend `ORAActivityTaskSheet` uses this RPC instead of multiple ad-hoc writes.

C. Reopen audit
- On Done → In Progress, log one `task_comments` row with `comment_type='reopened'` and user reason.
- Existing protected-workflow reversion logic remains, but now all task types get mandatory rationale and auditable trail.

4) Retrospective fix for old cards/data
- Add backfill migration script to repair historical split submissions:
  - detect near-simultaneous pairs (`Completed` + free-text by same user/task/activity),
  - create a single `task_comments` submission event if missing.
- Add frontend collapse fallback for legacy rows so old cards also display as one “Submitted + note” event even before/without full backfill.

5) Validation plan (end-to-end)
- Author submits ORA activity with attachment + comment:
  - Approver opens review task and sees source attachment under “Submitted Documents”.
  - Feed shows one “Submitted” entry with the author’s note (not separate Completed).
- Create two tasks under same ORA activity:
  - verify their card feeds are isolated (no inherited entries).
- Drag Done → In Progress for:
  - simple task,
  - ORA/P2A workflow task,
  - review task.
  - confirm dialog always appears, reason mandatory, status actually reverts, audit entry written.
- Regression check: reviewer tray creation still works on submission and remains visible cross-user.

Technical notes
- I will not create per-task physical tables; that would be unscalable and unnecessary. The correct root-cause-safe model is one normalized `task_comments` table keyed by `task_id`, with strict event typing and task-scoped UI queries.
- This plan addresses frontend routing/rendering, backend write paths, and database event consistency + historical remediation.
