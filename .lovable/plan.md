

## P2A Plan Revert — Missing Cascade Rollback

### Problem

When a fully-approved P2A plan is reverted to Draft (dragging from Done → In Progress), the current logic correctly handles:
- Plan status → DRAFT
- Approver records archived and reset to PENDING
- Audit trail entry inserted
- Author task metadata reset to 86% / DRAFT
- EXE-10 ORA activity reset to 86% / IN_PROGRESS

**But it does NOT reverse the approval cascade effects**, leaving orphaned artifacts:

1. **Approver tasks** — The DB trigger `auto_create_p2a_approval_task` created review tasks in approvers' trays. These are not deleted on revert, so approvers still see stale "Review P2A Plan" tasks.
2. **VCR activities & tasks** — `generateVCRActivitiesFromP2A` created Gantt activities (`source_type: 'p2a_vcr'`, `'vcr_delivery_plan'`) and "Create VCR Delivery Plan" user tasks (`type: 'vcr_delivery_plan'`). These remain in the Gantt chart and engineers' task trays.
3. **ORI snapshot** — A `p2a_approval` snapshot was inserted into `ori_scores`. It remains, inflating the readiness score.
4. **Notifications** — `p2a_plan_approved` notifications were sent and remain in `p2a_notifications`.

### Plan

Add cascade rollback steps to the P2A revert block in `src/components/tasks/useKanbanDragDrop.ts` (after line 278, before query invalidation):

**Step 1 — Delete approver review tasks**
Delete `user_tasks` where `type = 'p2a_approval'` and `metadata->>plan_id` matches the plan ID. This removes stale approval tasks from reviewers' Kanban boards.

**Step 2 — Delete VCR Gantt activities and their linked tasks**
- Query `ora_plan_activities` with `source_type IN ('p2a_vcr', 'vcr_delivery_plan')` for the project's ORP plan.
- Delete linked `user_tasks` where `type = 'vcr_delivery_plan'` and `metadata->>plan_id` matches.
- Delete the ORA activities themselves (children first, then parents).

**Step 3 — Delete the ORI snapshot**
Delete from `ori_scores` where `project_id` matches and `snapshot_type = 'p2a_approval'`.

**Step 4 — Mark notifications as void**
Delete or mark as read the `p2a_plan_approved` notifications from `p2a_notifications` for this plan.

**Step 5 — Add query invalidations**
Add invalidation for `['ori-scores']`, `['ora-activities']`, and `['vcr-delivery-plans']` query keys so the Gantt chart and dashboards refresh.

### Files to Edit

- `src/components/tasks/useKanbanDragDrop.ts` — Add rollback logic in the P2A revert block (lines 269-278)

