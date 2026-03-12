

## Problem

Review/approval tasks (e.g., "Review & Approve P2A Plan") only show Approve/Reject buttons. Approvers cannot open or view what they are approving. The root cause is that the `TaskDetailSheet` does not recognize P2A approval tasks as P2A-related, so it never renders a "View" or "Review" CTA.

This affects:
1. **P2A approval tasks** (`type: 'approval'`, `metadata.source: 'p2a_handover'`) — no way to view the P2A plan
2. **PSSR approval tasks** already work (they check `pssrId` in metadata)
3. **ORA review tasks** already work (dedicated `ora_plan_review` type)

## Plan

### 1. Detect P2A approval tasks in TaskDetailSheet

Add a new boolean `isP2aApprovalTask` that checks `task.type === 'approval' && metadata?.source === 'p2a_handover'`. This is distinct from `isP2aTask` (which is the creator's task).

### 2. Add "Review P2A Plan" CTA for P2A approval tasks

When `isP2aApprovalTask` is true:
- Fetch the P2A plan using `metadata.plan_id` and project info using `metadata.project_id`
- Show a "Review P2A Plan" button that opens the `P2APlanCreationWizard` in a **read-only review mode** (or `P2AWorkspaceOverlay` for viewing)
- Keep the Approve/Reject buttons below the CTA so the approver can review first, then decide

### 3. For ORA Lead review tasks, enable editing

The ORA review flow already opens the wizard in `mode="review"` which allows the ORA Lead to make edits. This already works correctly — no changes needed here.

### 4. Make the pattern generic for future review task types

Structure the code so that any `approval`-type task with a `source` metadata field can route to the appropriate viewer. This means:
- P2A approval → opens P2A workspace/wizard in view mode
- PSSR review → already handled via `pssrId`
- ORA review → already handled via `ora_plan_review` type
- Future types can follow the same `source`-based routing pattern

### Files to modify

- **`src/components/tasks/TaskDetailSheet.tsx`**: Add `isP2aApprovalTask` detection, fetch plan/project data for approval tasks, render "Review P2A Plan" CTA that opens the workspace overlay before the approve/reject section.

