

# Re-Approval Context for Reviewers

## Problem
When a plan is rejected and resubmitted, re-approvers (like Roaa) receive a new approval task but have no immediate context about **why** they need to re-approve or **what changed**. They must dig into the activity feed to understand.

## Recommended Approach: Contextual Banner + Activity Feed Reference

Industry best practice (ServiceNow, Jira Service Management) is a **contextual rejection banner** at the top of the reviewer's task detail sheet, surfacing:
1. Who rejected and why (the rejection comment)
2. The resubmission round number
3. A note that the plan was revised and resubmitted
4. A direct pointer to the activity feed for full history

This avoids duplicating a full "change summary" (which would require diff tracking infrastructure) and instead leverages the existing activity feed as the single source of truth — which is the standard pattern in enterprise SaaS.

## Implementation Plan

### 1. Store resubmission context on approval tasks (`useP2APlanWizard.ts`)
When submitting for approval (including resubmissions), write contextual metadata to each auto-created approval task:
- `resubmission_round` (cycle number, e.g. 2)
- `last_rejection_by` (name of rejector)
- `last_rejection_comment` (the rejection reason)
- `last_rejection_role` (role of rejector)

This data is already available in the author's task metadata (`last_rejection_comment`, `last_rejection_role`, `last_rejection_at`). On resubmission, propagate it to the `p2a_handover_plans` table or directly into each new approval task's metadata via the submission flow.

### 2. Render "Resubmission Context" banner in `TaskDetailSheet.tsx`
For P2A approval tasks where `metadata.resubmission_round > 1`, render a prominent banner **above** the "Review P2A Plan" button:

```text
┌─────────────────────────────────────────────┐
│ 🔄 Round 2 — Resubmitted for Re-approval   │
│                                             │
│ Previously rejected by Abel Maouche         │
│ (Construction Lead):                        │
│ "Valve specifications need updating for     │
│  System 4B"                                 │
│                                             │
│ 📋 View full history in Activity Feed below │
└─────────────────────────────────────────────┘
```

Styling: Soft blue/indigo background with border, matching existing banner patterns (like the rejection outcome banner already at line 507-525).

### 3. Persist rejection context on `p2a_handover_plans` table (`useUserTasks.ts`)
During the rejection flow (already at line 434-437), also write `last_rejection_comment`, `last_rejected_by_name`, and `last_rejected_by_role` to the `p2a_handover_plans` row. This makes it queryable when new approval tasks are created by the DB trigger.

### 4. Read rejection context into new approval tasks
In the submission flow (`useP2APlanWizard.ts` `submitForApproval`), read the plan's `last_rejection_comment` / `last_rejected_by_name` fields and calculate the round number from `p2a_approver_history` max cycle. Store these in each approval task's metadata so `TaskDetailSheet` can render the banner without extra queries.

### Files to Edit
- **`src/hooks/useUserTasks.ts`** — Write rejection context to `p2a_handover_plans` during rejection
- **`src/hooks/useP2APlanWizard.ts`** — Read rejection context during resubmission, propagate to approval task metadata
- **`src/components/tasks/TaskDetailSheet.tsx`** — Render resubmission context banner for re-approval tasks
- **`supabase/migrations/`** — Add `last_rejection_comment`, `last_rejected_by_name`, `last_rejected_by_role` columns to `p2a_handover_plans`

