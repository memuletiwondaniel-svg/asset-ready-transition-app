# ORSH Task-Generation: Gap Closure Plan (M1–M11) — Final, with Implementation Conditions

Sr Developer green-lit Rev 3 design. This revision adds the four implementation/reporting conditions; the design itself is unchanged.

## Implementation Conditions (HOW this is built and reported)

1. **Atomic, ordered migrations.** Apply the seven migrations in strict sequence. After each one, verify the live Lovable Cloud schema matches intent — columns, UNIQUE/CHECK constraints, FK cascades, RLS policies, `trg_rollup_completion` trigger, and the `ora_activity_plan_v` view — before moving to the next. No partial-sync state at any checkpoint.
2. **Build-clean gate before "done".** `tsc` + `vite build` + full vitest suite (including the M11 E2E harness) must pass before any milestone is declared complete. No "done" on a tree that doesn't compile.
3. **M11 is the acceptance artifact.** The per-rule (1–22) and per-cross-cutting (A–H) pass/fail table is the deliverable that proves correctness — not prose. Any failing rule is fixed in the **implementation**; the test is never adapted to current behavior.
4. **Sequence:** M1–M10 → first M11 run → report results table → fix any failing rules → re-run M11 → final report. No scope expansion beyond the Out of Scope list.

## Change Set (Rev 3, unchanged)

### M1 — Title standardization
All generated titles → `DPXX: {label}` / `DPXX: ... VCR-XX` across every generator.

### M2 — P2A phase gating
ORA Lead approval is a hard gate before the 4 parallel P2A lead approval tasks fan out.

### M3 — Per-approver state (the one real defect fix)
- `plan_approvals(plan_id, plan_type, approver_role, status, decided_at, decided_by)` — ORA (2 required), P2A (4 required)
- `vcr_approvals(vcr_id, approver_role, status, decided_at, decided_by)` — VCR (4 required)
- `approve-ora-plan`, `approve-p2a-plan`, `approve-vcr-plan` all rewritten around per-approver rows
- Join gate: `COUNT(approved) = required_count`
- Old plan-level enum status becomes derived from approval rows

### M4 — CMMS Lead role resolution
Add CMMS Lead to role registry; assign Rule 20 deliverables to it.

### M5 — Rejection flow (ORA / P2A / VCR)
- (a) `DPXX: Revise [plan]` → Sr ORA Engr
- (b) Sibling pending approval rows → `status = cancelled`
- (c) Their tasks → `status = cancelled`; all surfaces filter uniformly by status (no UI-level hiding)

### M6 — Idempotency
`user_tasks.dedupe_key` UNIQUE on `project_id | plan_id | plan_version | vcr_id | task_type | assignee_role`. Audited against all 22 rules; deliverables 18a–e differ by `task_type`. Generators use `INSERT ... ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`; null returns logged.

### M7 — Plan versioning
`version INT` on `ora_plans`, `p2a_plans`, `vcr_plans`. Tasks carry `source_plan_version`. Revisions bump version.

### M8 — Diff-based reconciliation
- Diff key: stable per-item UUIDs (`ora_plan_items.id`, `vcr_items.id`) — survives rename/reorder
- Unchanged → keep task + progress; New → create at new version; Removed → `cancelled_superseded` (no delete)
- ORA-Lead-only re-approval of revisions
- Rejected revision → prior approved version stays live, new Revise task issues, no limbo

### M9 — DB-side rollup & canonical view
- `trg_rollup_completion` fires on child **INSERT and UPDATE** of `user_tasks`
  - INSERT establishes parent denominator immediately
  - UPDATE recomputes numerator
- Completed-child definition:
  - **ITP sub-tasks (rule 22b): `confirmed_by_sr_ora_engr = true`** (Commissioning Lead submit alone does NOT count)
  - All other sub-tasks: `status = 'completed'`
- View `ora_activity_plan_v` over `user_tasks` filtered by `status != 'cancelled'`
- Activity List, Gantt, and My Tasks all bind to this view

### M10 — RLS hardening
- Policies on `plan_approvals` / `vcr_approvals`: INSERT/UPDATE only when `has_role(auth.uid(), approver_role)` matches the row's slot
- Service-role bypass permitted **only for test-harness provisioning and teardown** — never for approval writes, in any environment

### M11 — Automated E2E harness
- New edge function `test-workflow-e2e` + vitest suite, single-command run
- Scoped to `is_test_project = true` projects only; RLS blocks the harness from real projects
- One test user per role; flows run **as each role's JWT** so M10 RLS is actually exercised
- Service role used only for provisioning + teardown — never approval writes
- Teardown: try/finally + unconditional `test_run_id` sweep on mid-run failure
- Asserts per-rule (1–22) and per-cross-cutting (A–H)
- Edge cases: rejection at each level, double-fire idempotency, revision diff (rename/add/remove)
- Highest-risk rules to read first: join gates (ORA=2, P2A=4, VCR=4) and the ITP confirmation handshake (22b)

## Out of Scope
No UI redesign beyond data-source rebinding; no non-ORSH widget changes; no auth/provider changes.

Approve to begin.