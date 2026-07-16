# Procedures Rebuild — Staged Plan

Scoped against the previous groundwork report. Mirrors the W&H / Training staging discipline.

## Blockers & proposals (flag before touching code)

1. **No `author` / `responsible_user_id`.** Current `p2a_vcr_procedures.responsible_person` is free-text and `created_by` is NULL on every row. The lifecycle pins CTAs and one-owner-per-state RLS on the Author identity.  
   **Proposal:** add `author_user_id uuid REFERENCES profiles(id)`; keep `responsible_person` for legacy display. Backfill by resolving `responsible_person` to a profile where an unambiguous match exists; otherwise leave NULL and, per canon, resolve author via project role at seed time (never invent names).

2. **No discipline linkage on `p2a_vcr_procedures`.** Groundwork confirmed the table has no `discipline_id`. Daniel's spec allows "defaults per discipline if available"; without it, the Submit-for-review modal opens with an empty Approvers list for the Author to add manually (same fallback as Training).  
   **Proposal:** add nullable `discipline_id uuid REFERENCES discipline(id)`; when set, default approvers to the resolved holder of `"<Discipline> TA2 – Project"` via `resolve_project_role_user` (already exists from Training DB-2). Never auto-substitute an Asset TA.

3. **Assai link target.** No real Assai URL contract for E4 (`dms_external_sync` empty, no per-project base URL stored). Groundwork shows the long doc-number convention `6529-BGC-DP300-<DISC>-OA-6039-<seq>-00001` (plus WGEL `PR-SU10/CO10/SD10` variants).  
   **Proposal:** introduce a single configured base pattern `https://client.assaisoftware.com/documents/{doc_number}` (existing `AssaiLink` helper), used for the hyperlink on the Assai doc number itself. Flagged as placeholder base URL; real Assai deep-link contract is a follow-up when Assai integration lands.

4. **Assai-only fields.** Drawer previously read `assai_doc_code`, `doc_code`, `doc_status`, `approval_log` — none exist. The new drawer removes Assai Link / Download / Current Status fields entirely (per spec) and hyperlinks the Assai doc number using `document_number` (real column). No new Assai columns needed.

5. **Free-text drift.** Current `status`: `APPROVED`(6), `complete`(5), `approved`(2), `issued`(2), `to_develop`(2), `in_review`(1). Backfill mapping to the 5-state enum:
   - `to_develop` → `NOT_STARTED`
   - `in_review` → `UNDER_REVIEW`
   - `approved` / `APPROVED` / `complete` / `issued` → `APPROVED`
   - (no legacy value maps to `DRAFT` or `REWORK_REQUESTED`)
   Reported per-row after the migration runs.

6. **`procedure_type` drift** (`startup` vs `STARTUP`, `commissioning` vs `COMMISSIONING`, etc.). Not part of the lifecycle, but the drawer's TYPE row needs consistent casing.  
   **Proposal:** normalise to uppercase tokens (`STARTUP / OPERATING / COMMISSIONING / SHUTDOWN / TESTING`) in the same DB-1 migration; UI renders title-case.

## Staging

### DB-1 — structural (schema + backfill only, permissive RLS placeholders)
- New enum `procedure_status` (`NOT_STARTED, DRAFT, UNDER_REVIEW, REWORK_REQUESTED, APPROVED`).
- `p2a_vcr_procedures`: add `author_user_id`, `discipline_id`, `submitted_at`, `submitted_by`, `approved_at`, `change_type` (`NEW | UPDATE`, default `UPDATE`), normalise `procedure_type`, backfill `status` per §5 with per-row report, then convert column to the enum.
- New tables (all with grants + RLS enabled, placeholder policies):
  - `p2a_vcr_procedure_approvers` (unique `(procedure_id, user_id)`, `decision APPROVED|REJECTED|null`, `comment`, `decided_at`, `markup_attachment_id`).
  - `p2a_vcr_procedure_attachments` (`kind ∈ {draft, markup, evidence}`, `linked_approver_id`).
  - `p2a_vcr_procedure_activity_log` (`action`, `comment`, `from_status`, `to_status`).
- Report: per-row status backfill, per-row `procedure_type` normalisation, count of `author_user_id` resolved vs NULL.

### DB-2 — behaviour + seeds + QAQC
- RPC `advance_procedure_status(procedure_id, action, payload)` — state machine with one-owner-per-state task lifecycle: closes current owner's `user_tasks` row, opens next owner's (dedupe on `procedure_id + step + user`). Reuses `resolve_project_role_user` from Training DB-2.
- Approver fan-in: one review task per approver; ALL approve → `APPROVED`; ANY reject → `REWORK_REQUESTED`, remaining review tasks cancelled, Author gets rework task, approver rows reset on resubmit.
- Owner-gated RLS replaces placeholders: decide → own PENDING approver row; transitions → status owner (Author for `NOT_STARTED/DRAFT/REWORK_REQUESTED`, each approver for `UNDER_REVIEW`).
- **VCR-DP300-02 seeds** — one procedure per status (5 total, absorb existing DP300-02 rows, no duplicates): `NOT_STARTED`, `DRAFT`, `UNDER_REVIEW` (with pending approver tasks), `REWORK_REQUESTED` (with rework task for author), `APPROVED` (with full Option-A activity thread: submit → review comment → revision → approvals). Real resolved holders only; Assai doc numbers per §3.
- QAQC **P-family**: status ↔ exactly-one-open-task ↔ correct-owner per procedure; approver rows consistent with review tasks; no legacy status values remain.

### FE-1 — Procedures tab list + drawer shell
- New `ProcedureStatusChip` (5 enum values, single source of truth) — fixes current bug where `complete` renders "To deliver".
- List ordering: `NOT_STARTED → DRAFT → REWORK_REQUESTED → UNDER_REVIEW → APPROVED`, then `display_order`.
- Drawer shell rebuilt from mockup: eyebrow `PROCEDURE` + title + single status pill top-right; remove close X, remove type subtext, remove `OVERVIEW` header, remove duplicate Status field.
- ~18px section rhythm; row TYPE + `Change type` (values `New` / `Update to existing`) / `Reason` / `Applicable systems` (SYS-code chip + name, never uuid — resolve via `p2a_systems`) / `Delivered` date when `APPROVED`.
- DOCUMENT section: document title (medium) + Assai doc number as hyperlink (`https://client.assaisoftware.com/documents/{document_number}`, flagged placeholder base). No Assai Link / Download / Current Status fields.

### FE-2 — Author + Approvers block + Activity
- AUTHOR row (avatar + name + role).
- APPROVERS label with muted `N of M decided`; approver rows stacked full-width, no separators (spacing only), avatar + name-over-role left, decision chip right (Pending neutral outline, Approved green, Rejected red).
- ACTIVITY section (renamed from "Approval log"), collapsible, collapsed by default, Option-A thread standard (per `mem://design/activity-log-layout.md`).

### FE-3 — Owner-gated CTAs + modals
- `Start draft` (Author, `NOT_STARTED`).
- `Submit for review` modal (Author, `DRAFT`): approver multi-select defaulting to discipline TA2-Project holder when discipline set, else empty; optional comment.
- `Review` modal (Approver, `UNDER_REVIEW`): identical pattern to Training review — read-only document context, `Comments*` mandatory for BOTH decisions, Approve/Reject muted until comments entered with colour-on-hover, Reject red with slim confirm "Return to `<author>` for rework?", optional attachments.
- `Resubmit for review` (Author, `REWORK_REQUESTED`): reopens Submit-for-review flow, resets approver decisions.
- Every CTA gated on resolved-owner check — verified against RLS.

### FE-4 — Task-chip routing + W&H retrofit
- `InboxTaskLauncher` recognises `procedure_action` / `procedure_review` task types and routes into the new drawer.
- **Retrofit:** W&H drawer's WITNESSED & ACCEPTED BY section adopts the same stacked, no-separator approver-row treatment (replacing its 2-col grid). Isolated to that section; no behaviour change.

## QAQC + verification per sub-turn
- Full QAQC + typecheck after each of DB-1, DB-2, FE-1..FE-4.
- Per-section reports: schema diff, backfill map, task/RLS matrix, seed manifest, P-family results.

## Out of scope
- Real Assai deep-link contract / sync (flagged blocker §3 — placeholder base URL only).
- Author identity resolution for legacy rows where `responsible_person` doesn't match a profile (left NULL; seeds use real resolved holders only).
- Procedure creation UI (`AddProcedureSheet`) — untouched this pass.
