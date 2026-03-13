

## UX Recommendation: Workflow-Aware Status Labels in Done Column

### Current State
All cards in the Done column show a generic **"Completed"** pill badge (or "Rejected" for rejected P2A approvals). P2A cards additionally show an approver dot indicator (`2 of 4 approved`), but the top-level pill still says "Completed" even when the plan is only submitted and under review.

### Best Practice (Jira, ServiceNow, Asana, Monday.com)
Leading enterprise SaaS platforms use **workflow-aware status labels** that reflect the actual lifecycle stage rather than a generic completion state:

```text
┌─────────────────────────────────────────────────┐
│  Simple tasks (no approval workflow):           │
│    ✅ Completed                                 │
│                                                 │
│  Tasks with approval workflows (P2A, ORA, etc): │
│    🔵 Under Review     (submitted, pending)     │
│    🟡 2 of 4 Approved  (partial progress)       │
│    ✅ Approved          (all approvers done)     │
│    🔴 Rejected          (any rejection)          │
└─────────────────────────────────────────────────┘
```

This pattern is superior because:
- **Task owners** instantly see whether their submitted work is still pending review or fully approved.
- **Approval progress** is surfaced at the pill level (not buried in a sub-indicator).
- **"Completed"** is reserved for tasks with no approval gate, avoiding misleading status.

### Implementation Plan

**File: `src/components/tasks/TaskKanbanBoard.tsx`** (lines 262-276)

Replace the Done column badge logic:

1. Detect if the task has an approval workflow by checking metadata (`source === 'p2a_handover'` or similar flags for ORA review tasks).
2. For **approval-gated tasks**:
   - `outcome === 'rejected'` → Red **"Rejected"** pill (already exists)
   - All approvers approved (`approved_count === total_approvers`) → Emerald **"Approved"** pill
   - Partial approvals → Blue **"Under Review · X of Y"** pill (merges the current dot indicator into the pill itself)
3. For **simple tasks** (no approval workflow): Keep the current Emerald **"Completed"** pill.
4. Remove the separate approver dot-progress row (lines 295-326) since it's now merged into the pill badge for a cleaner card.

**Colors:**
- Under Review: `bg-blue-100 text-blue-700` (consistent with "Submitted" badge in activity feed)
- Approved: `bg-emerald-100 text-emerald-700`
- Rejected: `bg-red-100 text-red-700` (no change)
- Completed: `bg-emerald-100 text-emerald-700` (no change)

Single file edit, no backend or database changes needed.

