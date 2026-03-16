

## Fix: Stale Rejection Banner After Revert to Draft

### Root Cause

When a task is dragged from Done → In Progress, the revert logic writes a `REVERTED` entry to `p2a_approver_history` with the void reason, but:
1. The `last_rejection_comment` / `last_rejected_by_*` fields on `p2a_handover_plans` are **never updated** — they still hold the old rejection data from the Commissioning Lead.
2. `useP2ARejectionContext` reads plan-level fields first and returns immediately, never reaching the history fallback.
3. Even the history fallback only queries `status = 'REJECTED'`, missing `'REVERTED'` entries entirely.

### Solution

**Concept: Unified "Draft Context" banner** — replace the rejection-only banner with a context-aware banner that shows the most recent reason the plan is in DRAFT, whether from a rejection or a manual revert.

#### 1. Update revert logic to persist context on the plan (`useKanbanDragDrop.ts`)

When reverting a P2A plan, update the plan-level fields to reflect the revert:
```
last_rejection_comment → voidReason (the user's comment)
last_rejected_by_name  → current user's name
last_rejected_by_role  → 'Reverted'  (new sentinel value to distinguish from rejection)
last_rejected_at       → now()
```

This ensures `useP2ARejectionContext` always returns the **latest** context regardless of source.

#### 2. Update `useP2ARejectionContext` to also check REVERTED history entries

Change the history fallback query from `status = 'REJECTED'` to `status IN ('REJECTED', 'REVERTED')` so if plan-level fields are ever stale, the history fallback still catches reverts.

Add a `type` field to the return interface: `'rejected' | 'reverted'` — derived from the `last_rejected_by_role === 'Reverted'` sentinel or history `status`.

#### 3. Redesign the banner UI for both contexts

**Rejected banner** (existing, red/destructive):
- Icon: `XCircle` — "Plan rejected by Commissioning Lead"
- Quote of the rejection comment
- "Please address the feedback and resubmit for approval."

**Reverted banner** (new, amber/warning — modern enterprise style):
- Icon: `RotateCcw` — "Plan reverted to Draft by [Name]"
- Quote of the revert reason
- "The plan has been returned to draft for further changes."
- Subtle amber background with left accent border (modern SaaS pattern)

Both banners share the same data source but render differently based on `type`.

#### 4. Files to edit

| File | Change |
|------|--------|
| `src/components/tasks/useKanbanDragDrop.ts` | Update P2A revert block to write `last_rejection_*` fields with revert context |
| `src/hooks/useP2ARejectionContext.ts` | Add `type` to interface, query `REVERTED` status, detect sentinel role |
| `src/components/tasks/ORAActivityTaskSheet.tsx` | Update banner to render amber revert vs red rejection variant |
| `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx` | Update wizard banner to show revert variant |
| `src/components/tasks/TaskDetailSheet.tsx` | Update P2A rejection banner to support revert variant |

#### 5. Banner design spec (amber revert variant)

```text
┌─────────────────────────────────────────────────────┐
│ 🔄  Plan reverted to Draft by Anuarbek Kakimov      │
│     "Need to update the commissioning sequence..."   │
│     Mar 16, 2026                                     │
│     You can continue editing and resubmit when ready.│
└─────────────────────────────────────────────────────┘
```
- Background: `bg-amber-50 dark:bg-amber-950/30`
- Border: `border-amber-200 dark:border-amber-800`
- Left accent: 3px solid amber-500
- Icon: `RotateCcw` in amber-600

