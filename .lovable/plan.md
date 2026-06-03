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

## Consolidation: org_role_holders as source of truth

### DONE (2026-06-03)
VCR item editor (`VCRItemsStep.tsx`) + PSSR item editor (`PSSRItemDetailSheet.tsx`) unified onto `org_role_holders` via `useApprovingPartyHolders` shared resolver.
- Resolver reads `org_role_holders` first (authoritative for seeded/global/B2B roles); falls back to `profiles` position/role filter for non-global roles.
- Scope-correct: PSSR pulls Asset-scope TAs, VCR pulls Project-scope TAs.
- B2B pairs collapse to one badged card; "any-one-of-pair-closes" semantics preserved.
- Propagation verified: edits to `org_role_holders` (e.g., swapping a B2B partner) reach both editors instantly.
- The dual-source-of-truth gap for these two editors is CLOSED.

### Remaining consolidation backlog
~15 files still carry private role-matchers, grouped in 3 buckets. Recommended sequencing:
1. **Bucket 3 — Catalog `role_family`** (schema change; do FIRST as its own verified step; may collapse several other files)
2. **Bucket 2 — Needs a `roles.position` primitive built first**
3. **Bucket 1 — Mechanical resolver swaps**

### FLAG: Bucket 3 design questions (resolve before building)
- What are the `role_family` values (the taxonomy)?
- Do all roles fit a family?
- How does `role_family` interact with the Project/Asset scope dimension?

## P2A sequential approval chain — fixes applied (2026-06-03)

### DONE

1. **Submit-status fix.** `persistPlanToDatabase` submit case now writes `status='PENDING_APPROVAL'` (was `'ACTIVE'`). The approvers-write block is gated to `DRAFT` only so submits no longer race the trigger. Draft save unchanged.
   - File: `src/hooks/useP2APlanWizard.ts`

2. **DP-18F repair.** Flipped `ACTIVE` → `PENDING_APPROVAL` on plan `290bbdf6-a112-44af-b5ae-e5ef08df305a`; `trg_create_p2a_ora_lead_review` fired silently; 1 ORA Lead approver row + 1 approval task created (sequential design — remaining approvers fan out only on ORA Lead approval).
   - File: `supabase/migrations/20260603184234_b9cfc009-2f5b-45f7-8d8c-abd61674fdbe.sql`

3. **Centralized plan-status UI mapping.** New `src/lib/p2aPlanStatus.ts` with `getP2APlanUIState(status)` — exhaustive over the `p2a_plan_status` enum (`DRAFT|PENDING_APPROVAL|ACTIVE|COMPLETED|ARCHIVED`), unknown falls back to `DRAFT` (never a permissive 'approved'). `PSSRSummaryWidget` and `P2AWorkspaceOverlay` both derive label/helper/route/`isLocked` from it. Fixed the "approved/Continue/dead-button/draft" fall-through on the workspace card.
   - File: `src/lib/p2aPlanStatus.ts`

4. **Modal renders real persisted records only.** Removed the fallback in `SubmissionSuccessDialog` that fabricated approver counts from wizard state when no persisted rows existed. The modal now renders ONLY what is actually in `p2a_handover_approvers` / `user_tasks`, so an empty plan shows "0 approval tasks" honestly.
   - File: `src/components/widgets/p2a-wizard/SubmissionSuccessDialog.tsx`

5. **Approver-resolution consolidation (P2A scope only).** New single resolver `resolve_p2a_approver` (+ `resolve_p2a_approver_profile` RPC) wrapping the existing lookups (`resolve_project_role_user` for the 4 leads, `find_deputy_plant_director` for the deputy). Both triggers (`create_p2a_ora_lead_review`, `create_p2a_lead_reviews`) and the client roster (`useP2AApproverRoster.ts`) call it; the duplicated client-side deputy branch is removed. B2B deputy = one shared `user_tasks` row (single-holder UUID) surfaced to the partner via `fetchB2BPartnerIds` — no schema change. Verified end-to-end on a throwaway CS-plant plan: sequential fan-out produces 5 rows, deputy as one shared task, either partner closes it once.
   - Files: `supabase/migrations/20260603190832_73dad9ac-8875-4be8-a847-c9fa165a760f.sql`, `src/hooks/useP2AApproverRoster.ts`

### DEFERRED / DEBT

A. `resolve_p2a_approver` is a **contained P2A-specific** resolver that still leans on `find_deputy_plant_director`'s by-name `profiles` scan. This is deliberate debt: the real role-resolution consolidation (Bucket 3 `role_family` → Bucket 2 `roles.position` → Bucket 1 resolver swaps) should **absorb** `resolve_p2a_approver` rather than leave it as a separate island. The Bucket-3 work must fold this in.

B. **Approvals modal still models a flat parallel chain** ("0 of N", all approvers shown as Pending at once) but the backend is **sequential** (ORA Lead stage 1; the other 4 fan out only on ORA Lead approval). Modal redesign owed: show real stages, render the deputy as one B2B card. Queued as the next UI item after Bucket-3 consolidation.

C. **B2B badge consolidation** — four separate inline B2B-badge implementations exist with no shared component: `ApprovalSetupStep.tsx` (clickable, real approver swap, Radix tooltip), `VCRItemsStep.tsx` and `PSSRItemDetailSheet.tsx` (non-interactive Badge, native `title` "either holder can close the approval"), and `SubmissionSuccessDialog.tsx` (non-interactive after the 2026-06-03 fix). Each re-derives pair detection locally (`isB2BPairUsers` / `isB2BPairMembers` / inline normalize / `partnerByRole` memo); `useB2BPartner` exists but none of the four use it. Consolidate into one `B2BBadge` component (props: `pair`, optional `onSwap`, tooltip mode) backed by a single pair-resolution hook (`useB2BPartner` / `useApprovingPartyHolders`). Fold into the role-resolution consolidation effort alongside `resolve_p2a_approver`, not as a standalone tail task.

## M11 closure — explicit residuals

### Residual (UI-layer, deferred)
- **Parent/child expand in My Tasks / Activity List / Gantt** — the three read
  surfaces bind to `ora_activity_plan_v` and render parent rollup % correctly,
  but they nest children via the legacy `sub_items` jsonb column, NOT via
  `parent_task_id` FK rows. R18 / R20 / R22b parents and their data-derived
  children therefore appear as flat sibling rows rather than as a collapsible
  tree under the parent. Data + rollup are verified correct end-to-end; only
  the visual nesting affordance is missing. Fix when budgeted: group by
  `parent_task_id` + disclosure widget across the three surfaces.

### Cosmetic known item (informational)
- `profiles.position` displays the stale string "Snr. ORA Engr." in a few places.
  The actual role resolution uses `profiles.role` (UUID FK → `roles.id` →
  `roles.name = 'Sr ORA Engr'`), which is already canonical and aligned with RLS.
  The display label is cosmetic only; no functional mismatch.

### Data-entry UI follow-up (informational)
- `p2a_vcr_critical_docs`, `p2a_vcr_cmms`, `p2a_vcr_spares` were added so the
  R18/R20 fan-out can derive sub-task count from real rows (1:1 with
  training/procedures/registers). No data-entry UI exists yet for these three
  tables. Zero rows produces zero children — that is the correct behavior, not
  a defect — but a Sr ORA Engr cannot currently populate them outside the
  harness or direct SQL. Add screens analogous to the existing VCR training /
  procedures editors when the workflow needs them.

### Systems-assignment: preliminary (P2A) vs final (VCR)
- One source of truth: `p2a_handover_point_systems` keyed by `handover_point_id`.
- P2A "Assign Systems (Preliminary)" is optional, labelled as a draft seed.
- New columns on `p2a_handover_points`: `systems_finalized_at`, `systems_finalized_by`.
- VCR Systems step shows a Finalize action; finalizing makes the VCR plan the
  authoritative owner of its system list.
- P2A re-submit (`useP2APlanWizard.persistP2APlan`) preserves any VCR with
  `systems_finalized_at IS NOT NULL` — skips deleting that VCR row and its
  mappings, and skips re-inserting it (seed-once, then independent).
- VCR Execution Plan submit (`VCRDetailOverlay`) is blocked until the VCR has
  at least one system AND `systems_finalized_at` is set. Readiness panel now
  shows a Systems row.

## Known cosmetic drift (org-role seeding, 2026-06-03) — not blocking
- `Static TA2 - Project` email handle: `BGC-ENG-LEAD-MECHANICAL-TA2` (says MECHANICAL, role is STATIC).
- `Process TA2 - Asset` email handle: `BGC-Head-of-Process-Optimzation` (typo "Optimzation"; doesn't say "Process TA2").
- `Dep. Plant Director - UQ` email handle: `BGC-UQ-Senior-Ops-Engineer` (doesn't say "Deputy-Director").
- `Engr. Manager - Asset` (profiles.position) vs canonical `Engr. Manager (Asset)` (roles.name) — uses ` - ` vs ` (…)`. Resolver agnostic; logged for future normalization.
- `Plant Director - CS` = profile "TBC Director" — known vacancy, intentionally un-seeded in org_role_holders.
- `MCI TA2 - Project` — no holder; intentionally un-seeded.

## Design principle — COLOR-KEY RULE (settled)

One color system per screen, mapped to what THAT screen is about (Option A).

- Color is a categorization KEY; it only works if it maps to ONE dimension per screen.
- The active color key = the categorization the screen is FOR. Everything else on that screen goes neutral, so two keys never compete.
- Examples: Step 3 (Assign Systems to VCRs) → VCR-color is the key (VCR chips/pills colored, systematic, stable); Step 4 (Define Phases) → PHASE-color is the key (phase card/pill + assigned-VCR left accent colored), VCR ID chips NEUTRAL there.
- Within a screen, the color key is systematic + derived from stable identity (same entity = same color, not per-render).
- NOT Option B: VCR color is not a global persistent identity across all screens — it's the active key only where VCR is the subject. So a given entity's color may differ by screen, and that's intended (the screen's purpose dictates the key).
- Default when unsure: neutral. Add a color key only when the screen has one clear categorization the user scans by.
