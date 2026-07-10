## Assessment (validated against live code + DB)

**Point:** `p2a_handover_points` has `vcr_code` ('VCR-DP300-02') and `name` ('OSBL'). No separate short label column. Cards elsewhere derive short form by stripping `VCR-DP300-` → `VCR-02`. That regex-derived short form is the "VCR-02" the user references.

**Current DP300-02 tasks** (metadata.point_id filter):
- 21 × `vcr_approval_bundle`, all `pending`, titles like `"VCR Review Items – VCR-DP300-02: OSBL"` (already partially reconciled — but not using `VCR-02 (OSBL)` form).
- 25 × `task` (Sr-ORA delivery + sub-items), titles like `"…: Deliver Critical Documents for VCR-DP300-02"` — need reformat.
- 0 × `vcr_checklist_bundle` for delivering parties (Anuarbek etc.) — the whole per-delivering-user bundle stream is missing; today only Sr-ORA gets the deliverable meta-tasks via `create_vcr_deliverable_fanout`.

**Approval bundle recompute trigger** already exists (`recompute_vcr_approval_bundle_progress`) with sensible status rules (todo/pending kept when zero decided; else in_progress; all decided → completed). Meets spec (2) for approval side. No checklist-bundle recompute trigger exists.

**Overrides table** has `delivering_party_role_id_override` — so delivery reconcile can COALESCE(override, item.delivering_party_role_id) exactly like the approval reconciler.

**resolve_project_role_users** exists (SETOF uuid) — reuse.

## Changes

### 1. Title helper + rewrite

Add SQL helper `public.vcr_short_label(vcr_code text)` → strips `VCR-<prefix>-NN` to `VCR-NN`. New display label = `"{action} for {short} ({name})"`, e.g. `"Deliver Critical Documents for VCR-02 (OSBL)"`, `"Review Items for VCR-02 (OSBL)"`.

Rewrite in:
- `create_vcr_deliverable_fanout` (parent + sub-task titles)
- `reconcile_vcr_approvals` (bundle title)
- new `reconcile_vcr_delivery_tasks` (bundle title)
- any other generator that emits VCR titles (grep + patch)

Backfill migration UPDATE existing open (status ≠ completed) user_tasks whose `metadata->>'vcr_code'` matches — rewrite `title` using the new format from `metadata.action` (or type). Report row count.

Metadata keys (`vcr_code`, `point_id`) unchanged; add new `vcr_short_label` for UI reference.

### 2. `reconcile_vcr_delivery_tasks(p_handover_point_id uuid)`

SECURITY DEFINER, idempotent, mirrors approval sibling:

```text
for each actionable prereq (status NOT IN terminal, vcr_item_id NOT NULL):
  effective_role := COALESCE(override.delivering_party_role_id_override,
                             vcr_items.delivering_party_role_id)
  for each user in resolve_project_role_users(project, role_name):
    ensure ONE user_tasks row per (user, point) type=vcr_checklist_bundle
      sub_items = REAL prereq ids (their delivering items only)
      dedupe_key = 'vcr_checklist_bundle:<point>:user:<user>'
  retire bundles whose user no longer resolves AND no sub_item shows any progress
```

Progress trigger (new) stamps counts/status; see §3.

Wire into fan-out: extend existing plan-approval trigger (`create_vcr_deliverable_fanout`) to also `PERFORM reconcile_vcr_delivery_tasks(NEW.point_id)` and `reconcile_vcr_approvals(NEW.point_id)`. Also add trigger on `p2a_vcr_item_overrides` INSERT/UPDATE/DELETE → both reconciles for the affected point.

### 3. Coherent status/column recompute — both bundle types

**Approval bundle** (`recompute_vcr_approval_bundle_progress`): amend to spec exactly —
- awaiting=0 & decided=0 → `waiting`
- awaiting>0 & decided=0 → `pending`
- some decided + some awaiting → `in_progress`
- all decided → `completed`

**Checklist bundle** — new `recompute_vcr_checklist_bundle_progress` trigger on `p2a_vcr_prerequisites` UPDATE of status. Rule:
- 0 approved-or-under-review → `pending`
- any submitted/approved but not all → `in_progress`
- all approved → `completed`

Both allow regress (tasks mirror live work).

### 4. Execute on VCR-DP300-02 + report

Call both reconciles, then emit a report table:
`user · type · title · sub_items count · status`.

Assert / report:
a) Anuarbek's `vcr_checklist_bundle` present, includes OI-19, status reflects progress
b) Under-Review items → which approver-bundles are actionable (list TA pairs)
c) Ewan+Lyle bundles present with counts (awaiting=0 unless other items in-scope)
d) Daniel's stale/completed bundles re-stamped

### 5. Kanban ↔ Gantt divergence — REPORT ONLY

Grep frontend for the ORA activity Gantt / plan-view components and enumerate what table each binds to. If it does not read `user_tasks` directly (e.g. `ora_plan_activities`, or caches its own status), list the divergence and propose the fix — do not build.

## Deliverables

- 1 migration: `vcr_short_label` fn + rewrite generators + new reconcile fn + trigger + backfill open titles.
- 1 insert-tool call: run both reconciles on DP300-02, output report.
- 1 chat report: task table + assertions + Kanban/Gantt divergence writeup.
- No prereq/ledger status changes.

## Technical notes

- New checklist recompute trigger fires from `p2a_vcr_prerequisites` UPDATE (status column); reads bundle sub_items and rewrites `status/progress`.
- Delivery reconcile uses same temp-table pattern as approval sibling to stay atomic.
- Backfill regex uses `metadata->>'action'` where present, else derives from `type`.
- Kanban binds to `useUnifiedTasks` → `user_tasks`; Gantt likely binds to `ora_plan_activities` / `orp_plan_deliverables` — will confirm in report step.
