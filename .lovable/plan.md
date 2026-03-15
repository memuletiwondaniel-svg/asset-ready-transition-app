

# Unified Review & Approval UX Consistency Plan

## Problem Summary

The P2A Plan workflow has a mature, battle-tested approval UX (rejection banners, resubmission round context, activity feed, progress tiers, Kanban drag guards, audit history). However, the **ORA Plan** and **VCR Delivery Plan** workflows are missing many of these patterns, creating an inconsistent user experience across task types that require review and approval.

## Gap Analysis

| Feature | P2A Plan | ORA Plan | VCR Plan |
|---------|----------|----------|----------|
| Rejection banner in TaskDetailSheet | Yes | **No** | **No** |
| Rejection banner in Wizard | Via metadata | **No** | **No** |
| Resubmission round context for re-approvers | Yes | **No** | **No** |
| Reconciliation guard (task not done → treat as DRAFT) | Yes | **No** | **No** |
| Progress tiers (draft/submitted/approved) | 86/95/100% | **No tiers** | **No tiers** |
| Kanban drag → Done intercepted (must use wizard) | Yes | **No** | **No** |
| Kanban drag Done → In Progress reverts plan + archives approvers | Yes | **No** (plan goes to DRAFT but no approver archival/reset) | **No** |
| Activity feed with approval decisions | Yes (P2AActivityFeed) | **No** | **No** |
| Author card status pills (Under Review · X/Y, Approved, Rejected) | Yes | Partial (uses plan_status but no approval counts) | **No** |
| Gantt click → same sheet as Kanban click | Yes (ORAActivityTaskSheet) | Yes | N/A |
| Approval void warning dialog (Done → In Progress) | Yes | **No** (not intercepted) | **No** |
| Reviewer task metadata (resubmission_round, rejection context) | Yes | **No** | **No** |

## Implementation Plan

### 1. ORA Plan: Add rejection banner + resubmission context to TaskDetailSheet

**In `TaskDetailSheet.tsx`** for `isOraTask`:
- Fetch ORA plan rejection info from `orp_approvals` (same pattern as P2A's `p2aRejectionInfo` query)
- Show rejection banner when plan status is DRAFT and there's a previous rejection
- Add reconciliation guard: if task is not in Done column, treat ORA plan as DRAFT regardless of DB status

**In `TaskDetailSheet.tsx`** for `isOraReviewTask` (ORA reviewer's task):
- Add resubmission round banner (same as P2A's Round N banner) using an `orp_approval_history` table or querying approval comments
- Show rejection outcome banner when reviewer has rejected
- Add `ORAActivityFeed` (or reuse a generic `ApprovalActivityFeed`) showing approval decisions

### 2. ORA Plan: Add progress tiers matching P2A

**In `useUnifiedTasks.ts`**:
- For `isOraPlanCreation` tasks, apply same progress tier logic as P2A:
  - DRAFT → cap at 83% (5/6 steps)
  - PENDING_APPROVAL → 95%
  - APPROVED → 100%
- Add reconciliation guard: if task not done and plan status is PENDING_APPROVAL/APPROVED, force to DRAFT

### 3. ORA Plan: Kanban drag interception

**In `TaskKanbanBoard.tsx` `handleDragEnd`**:
- Detect `isOraTask` (ora_plan_creation) same as P2A
- Intercept drag to Done → open detail sheet (must submit via wizard)
- Intercept Done → In Progress → show approval void warning dialog

**In `useKanbanDragDrop.ts`**:
- Add ORA Plan revert logic (mirror P2A revert):
  - Revert `orp_plans` to DRAFT
  - Archive decided approvers from `orp_approvals` to a new `orp_approval_history` table
  - Reset all `orp_approvals` to PENDING
  - Reset task metadata (plan_status: DRAFT, completion_percentage: 83%)
  - Set ORA activity progress to 83%

### 4. ORA Plan: Approval history + activity feed

**Database**: Create `orp_approval_history` table (mirrors `p2a_approver_history`):
- `id`, `orp_plan_id`, `original_approval_id`, `user_id`, `role_name`, `status`, `comments`, `approved_at`, `cycle`, `created_at`
- RLS policies matching `orp_approvals`

**Frontend**: Create `ORAApprovalActivityFeed` component (or make a generic `ApprovalActivityFeed` that works for both P2A and ORA by accepting a data source prop).

### 5. ORA Plan: Reviewer task enrichment on rejection

**In `ORAActivityPlanWizard.tsx` `handleReviewDecision`**:
- On REJECTED: Sync rejection metadata to the author's user_task (last_rejection_role, last_rejection_comment, last_rejection_at) — same as P2A's trigger `trg_sync_p2a_rejection_to_plan`
- On resubmission: Stamp `resubmission_round` on newly created reviewer tasks

### 6. ORA Plan: Author card approval counts in Kanban

**In `TaskKanbanBoard.tsx`**:
- Add ORA approval summary query (mirror `p2aApprovalSummaries`) fetching from `orp_approvals` by plan_id
- Use the same status pill rendering logic for ORA author cards (Under Review · X/Y, Approved · X/X, Rejected)

### 7. VCR Delivery Plan: Apply same patterns

- VCR plans use `VCRExecutionPlanWizard` with its own approval flow
- Apply the same Kanban drag interception, progress tiers, rejection banners, and activity feed patterns
- This requires auditing the VCR approval mechanism (likely uses `task_reviewers` for ad-hoc review)

### 8. Retrospective data consistency

**Database migration**:
- Backfill `plan_status` on existing ORA author tasks from `orp_plans.status`
- Backfill `completion_percentage` on existing ORA tasks based on plan status (DRAFT→83%, PENDING_APPROVAL→95%, APPROVED→100%)
- Add `tenant_id` to `orp_approval_history` with trigger

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `orp_approval_history`, backfill ORA task metadata |
| `src/components/tasks/TaskDetailSheet.tsx` | Add ORA rejection banner, reconciliation guard, approval feed |
| `src/components/tasks/useUnifiedTasks.ts` | Add ORA progress tiers (83/95/100) |
| `src/components/tasks/TaskKanbanBoard.tsx` | Add ORA drag interception + approval counts |
| `src/components/tasks/useKanbanDragDrop.ts` | Add ORA plan revert logic |
| `src/components/ora/wizard/ORAActivityPlanWizard.tsx` | Sync rejection metadata to author task |
| `src/components/tasks/ApprovalActivityFeed.tsx` | New generic component for both P2A and ORA feeds |

