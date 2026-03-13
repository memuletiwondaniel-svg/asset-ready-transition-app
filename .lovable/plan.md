
Goal: make the rejection-context banner show consistently in the Develop P2A Plan wizard (for any rejecting approver), and harden the flow across frontend, backend logic, and DB so it cannot regress.

Root cause identified
1) Frontend data-source mismatch:
- `P2APlanCreationWizard` reads rejection banner data from `p2a_handover_approvers` where `status='REJECTED'`.
- Rejection cascade in `useUserTasks.ts` immediately archives decisions, then resets all approvers to `PENDING` with null comment/date.
- Result: wizard query returns no rejected row, so no banner.

2) Why Task Detail still shows it:
- `TaskDetailSheet`/`ORAActivityTaskSheet` can fall back to task metadata (`last_rejection_*`), so banner appears there.

3) Backend/DB gap:
- `last_rejection_*` on `p2a_handover_plans` is written only by frontend code path; no DB trigger guarantees it if rejection comes from another path.
- Wizard query also has cache settings that can preserve stale/null result for a short period.

Implementation plan

1) Frontend: unify rejection-context source (single truth)
- Replace wizard’s rejection query with plan/history-based resolver:
  - Primary: `p2a_handover_plans.last_rejection_comment/last_rejected_by_name/last_rejected_by_role` (+ timestamp).
  - Fallback: latest `REJECTED` entry from `p2a_approver_history`.
  - Final fallback: current-cycle `p2a_handover_approvers` rejected row (for backward compatibility).
- Use `staleTime: 0` and `refetchOnMount: 'always'` for rejection context in wizard.
- Keep banner visible for author mode when plan is `DRAFT`, regardless of which approver rejected.

Files:
- `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx`
- (optional shared hook) `src/hooks/useP2ARejectionContext.ts`

2) Backend app logic: ensure rejection context is always persisted + cache invalidation
- In rejection cascade (`syncP2AApproval` in `useUserTasks.ts`):
  - Persist `last_rejection_*` plus `last_rejected_at` (and user id if added).
  - Add strict error handling on plan update (no silent fail).
  - Invalidate wizard-specific keys after rejection:
    - `['p2a-plan-by-project', projectId]`
    - `['p2a-rejection-info', planId]` (or new unified key)
    - existing task/plan keys already invalidated.
- Keep current reset-to-PENDING behavior (needed for full re-approval model).

File:
- `src/hooks/useUserTasks.ts`

3) Database: enforce rejection context at DB layer
- Add migration to:
  - Add `last_rejected_at timestamptz` (and optional `last_rejected_by_user_id uuid`) on `p2a_handover_plans`.
  - Create trigger function on `p2a_handover_approvers` `AFTER UPDATE`:
    - when `NEW.status='REJECTED'`, update parent plan’s last rejection fields from `NEW`.
- Add backfill step:
  - populate missing last-rejection fields from latest `REJECTED` row in `p2a_approver_history`.

Files:
- `supabase/migrations/<new_timestamp>_p2a_rejection_context_hardening.sql`
- `src/integrations/supabase/types.ts` (regen/update typings)

4) Consistency hardening across entry points (“all cards”)
- Ensure `useP2APlanByProject` is deterministic (`order updated_at desc limit 1`) and includes last-rejection fields.
- This prevents stale/wrong plan row resolution when wizard opens from Kanban/Table/List/Gantt/widget entry points.

File:
- `src/hooks/useP2APlanByProject.ts`

Validation plan (end-to-end)
1) Reproduce exact sequence:
- Submit (Round 1) → Roaa rejects (comment A) → resubmit (comment B) → Roaa approves → Abel rejects (comment C).
2) Verify UI:
- Task Detail banner shows Abel rejection.
- Develop P2A wizard top banner shows Abel rejection (same comment/role/date).
- Activity feed chronology unchanged and correct.
3) Verify all launch surfaces:
- TaskDetailSheet card
- ORAActivityTaskSheet CTA
- Kanban/Unified/Table parent-level wizard launch
- Any other wizard entry (e.g., Gantt/widget)
4) DB checks:
- plan row has latest rejection fields
- approvers reset to pending after rejection
- history contains rejected decision row for that cycle

Technical notes
- The key design correction is: rejection banner must not depend on live approver rows, because those rows are intentionally reset in full re-approval workflows.
- Live approvers table = workflow state.
- Plan last-rejection fields + approver history = audit/context state.
- Wizard banner should consume audit/context state.

<lov-actions>
<lov-suggestion message="Test the full rejection/resubmission flow end-to-end across Kanban, Table, and Task Detail to confirm the wizard banner always shows the latest rejection context.">Verify end-to-end behavior</lov-suggestion>
<lov-suggestion message="Implement a shared useP2ARejectionContext hook so TaskDetail, ORAActivityTaskSheet, and P2APlanCreationWizard all read the same rejection source and cannot drift again.">Unify rejection context logic</lov-suggestion>
<lov-suggestion message="Add a database trigger that auto-updates p2a_handover_plans last rejection fields whenever an approver status becomes REJECTED, plus a backfill migration from p2a_approver_history.">Harden DB rejection context</lov-suggestion>
</lov-actions>
