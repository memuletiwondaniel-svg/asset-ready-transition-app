# Phase 2 continuation — 2.2 → 2.5 + Security triage

Scope acknowledged. Temp instrumentation (`[VCR overlay:*]`, `[PSSRSummaryWidget onClick]`, DP-300 self-test, visible `mode:` badge, `VisibleErrorBoundary`) stays in place until Claude's live click-through confirms 5.1; nothing here removes them.

All new code follows the v8_1 mockup (`ORSH_VCRView_AllTabs_v8_1.html`) as the binding visual reference. Deviations get flagged in the report, not merged.

---

## 2.2 — Parties tab (real data, four groups)

New: `StandardPartiesTab.tsx` — replaces the temporary qualifications-style list that currently lives in the Parties slot.

Four collapsible groups, in this order, matching the mockup:

1. **DELIVERING PARTIES** — muted count in header
2. **APPROVING PARTIES** — muted count in header
3. **SOF APPROVER** — rendered **only when `hasHydrocarbon === true`**; small muted lock glyph BEFORE the group name, muted inline text after: *— unlocks once all VCR items are approved*. Tooltip on the lock explains the HC rationale.
4. **PAC APPROVER** — same lock/inline text treatment; always visible.

Smart-default collapse state, computed once per mount from server data:
- Delivering group expanded while `delivering.completedFraction < 1` (any delivering work still open). Once all delivering parties are complete, initial state flips to **Approving-only expanded**.
- SoF/PAC groups start collapsed until their gate unlocks (all items approved), then default-expanded.

**Row template** (shared across all four groups):
`avatar · full name · role · one live fraction chip · optional B2B badge`
- Fraction chip: `x / y` items where this person is a delivering/approving party. Green (`--em-soft`) when `x === y && y > 0`; muted otherwise. No client-side aggregation — read from a single Supabase query, see technical notes.
- B2B badge only when the pair-collapse rule from `useApprovingPartyHolders` triggers (identical normalized position).

**Explicit non-goals**: no explanatory paragraph boxes, no help text beyond the muted inline lock caption, no per-group action buttons this turn.

## 2.3 — Deliverable tabs to shared row template

Split and normalize seven tabs under `vcr-standard/deliverables/`:

- `SystemsTab.tsx` (Systems only — W&H removed)
- `WitnessHoldsTab.tsx` (new, split from Systems)
- `TrainingTab.tsx`
- `ProceduresTab.tsx`
- `CriticalDocsTab.tsx`
- `RegistersLogsheetsTab.tsx`
- `MaintenanceSystemsTab.tsx`

Shared row template `DeliverableRow.tsx`:
`name · muted context line · one live chip on the right (fraction or ✓) · row click → source detail (existing sheet/route, no new nav)`

Data rules:
- **Today's real data only**. Every chip is derived from a live Supabase query against the existing tables (`p2a_handover_point_systems`, `p2a_vcr_training`, `p2a_vcr_procedures`, `p2a_vcr_critical_docs`, `p2a_vcr_register_selections`, `p2a_vcr_maintenance_deliverables`, W&H rows from `p2a_vcr_prerequisites` filtered to witness/hold categories).
- **No fabricated chips.** INT-1 linked-record chips are explicitly out of scope — reserved for OWL 3.1.
- Planned-but-empty sections render an **honest empty state** ("No X recorded for this VCR yet.") — never a fake 0/0 chip that implies live progress.

Nav counter (left rail) reads from the same source of truth as the tab body.

## 2.4 — Rev counter to server truth

Replace the heuristic Rev derivation with a single join against `vcr_plan_approval_events` (existing table).

- New helper: `useVCRRev(vcrId)` → returns integer `rev` = count of distinct submission events for that handover point (`event_type = 'SUBMITTED'`), or `0` when no submission has occurred.
- Delete the current client-side "Rev = f(status transitions)" fallback in `VCRStandardView` header. If the hook returns `null/undefined`, render `Rev —` rather than guessing.
- The heuristic **must not survive into the qualification build** — grep for `computeRev|rev\s*=` in the vcr-standard tree and remove.

## 2.5 — VCR card rollup bug (VCR-02: 100% vs 21%)

Root-cause first, then fix.

Suspected: the card component (in `PSSRSummaryWidget` / project P2A panel) computes progress from `closed_items / closed_items` or from `p2a_vcr_prerequisites` while the detail view counts `vcr_items`. `useProjectVCRs` uses `prereqs` for `total`/`closed`, but the detail view uses `vcr_items` (57 for VCR-02) — that's the mismatch.

Fix:
- Extend `useProjectVCRs` to compute `total` and `closed` from the same source the detail view uses: `vcr_items` joined via `p2a_vcr_prerequisites` (canonical item list). Verify with a `supabase--read_query` before committing the change.
- Card fraction and ring both bind to `{closed_items, total_items}` from the hook — no local recomputation in the card component.
- Add a server-side spot check in the report: query VCR-02 and confirm hook output matches detail-view total.

## Security findings — LIST ONLY

Run `security--get_scan_results` and report the 7 findings verbatim (severity, table/function, description). **No auto-fix.** Triage happens in a separate turn.

---

## Verification per item

- 2.2: screenshot Parties tab for VCR-02 (non-HC, no SoF group) and VCR-01 (HC, SoF group present, lock caption visible). Confirm fractions match a manual DB count for one delivering-party row.
- 2.3: screenshot left rail counters + each deliverable tab body for VCR-02; confirm counter === row count in tab body; empty state visible on at least one section.
- 2.4: screenshot header showing `Rev N` matching `SELECT count(*) FROM vcr_plan_approval_events WHERE handover_point_id = <VCR-02> AND event_type='SUBMITTED'`.
- 2.5: card fraction/ring for VCR-02 matches detail-view 12/57 · 21% (or whatever server truth returns at run time).

Reports one paragraph per item, DB numbers cited, screenshots referenced. Temp instrumentation left in place; removal only after Claude's live click-through confirms 5.1.

## Technical notes

- New files under `src/components/p2a-workspace/handover-points/vcr-standard/`:
  - `StandardPartiesTab.tsx`, `partiesData.ts` (single hook `useVCRPartiesRollup`)
  - `deliverables/{Systems,WitnessHolds,Training,Procedures,CriticalDocs,RegistersLogsheets,MaintenanceSystems}Tab.tsx`
  - `deliverables/DeliverableRow.tsx`
  - `useVCRRev.ts`
- Modified: `VCRStandardView.tsx` (wire new tabs, remove heuristic Rev, remove temp qualifications-list from Parties slot), `useProjectVCRs.ts` (rollup fix).
- Every new row/chip renders through `VisibleErrorBoundary` — no silent empty panels.
- No RLS/migration changes anticipated; all data reads use existing tables. If a rollup requires a new SQL view, flagged in the report and deferred, not created inline.
