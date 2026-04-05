

# Implementation Plan: Selma Improvement Roadmap (P3 → P1 → P2 → P4)

Based on the Senior Developer's assessment and our validated counter-analysis, this plan addresses the confirmed gaps in priority order. Every change is additive — no existing functionality is modified or removed.

---

## Phase 1: Fix the Data Pipeline (P3) — Unlocks Everything

**Problem confirmed**: `executeSearch` returns `strategies_tried: string[]` but no `cascade_depth: number`. The metrics logger at line 7623 tries `lastToolResult?.cascade_depth` (never set), falls back to `1` for all searches. The scorer computes `first_stage_hit_rate` and `strategy_efficiency` against this permanently-wrong field. Additionally, the scorer uses a 24h window — with only 29 interactions total (all from April 1), it finds nothing on subsequent days.

### Changes

**File: `supabase/functions/_shared/selma/search-engine.ts`**
- Add `cascade_depth: strategiesTried.length` to both return objects (line 886 for no-results, line 912-933 for success)
- Add `strategy_stages: strategiesTried` alongside `strategies_tried` for the metrics logger compatibility (line 7623 checks `strategy_stages?.length`)

**File: `supabase/functions/selma-performance-scorer/index.ts`**
- Change scoring window from 24h to rolling 7 days
- Add a `last_scored_at` check: query the latest `selma_kpi_snapshots` entry and skip re-computation if the data hasn't changed
- Add cumulative (all-time) KPI snapshots alongside period KPIs
- Add per-strategy success tracking: group interactions by `cascade_depth` to compute which cascade levels are resolving queries

---

## Phase 2: Fix Pagination Coverage (P1)

**Problem confirmed**: `paginateByStatusSplit` line 476 extracts status codes only from `firstDocs` (page 1 results). If a project has documents in status `RLM` or `ASB` that don't appear in the first 500 results, those statuses are never queried. There are 15 active status codes in `dms_status_codes` but page 1 might only contain 4-5.

### Changes

**File: `supabase/functions/_shared/selma/search-engine.ts`**
- In `paginateByStatusSplit`, replace line 476 with a query to `dms_status_codes` for all active codes (same pattern already used at line 525 for `dms_document_types`)
- Keep the existing `firstDocs` status extraction as a fallback if the DB query fails
- Add progress logging via `emitStatus` callback: "Scanning status AFU... 142 found" so users see activity during long sweeps

---

## Phase 3: Resolution Failure Tracking (P2) — Closes the Real Feedback Loop

**Problem**: When `resolve_document_type` returns `found: false`, the failure is silently swallowed. The same acronym can fail hundreds of times with no learning. This is the correct target for the self-improvement loop — not cascade strategy reweighting.

### Changes

**Migration: Create `selma_resolution_failures` table**
```
id, query_text, cleaned_query, levenshtein_top3 (jsonb), 
occurrence_count, first_seen, last_seen, resolved (boolean), 
resolved_as (text), created_at
```
With RLS policies for admin read access.

**File: `supabase/functions/_shared/selma/handlers.ts`**
- In the `resolve_document_type` handler, when `found: false`, upsert to `selma_resolution_failures`:
  - Increment `occurrence_count`, update `last_seen`
  - Store Levenshtein top-3 matches from the existing fuzzy matching logic
- Fire-and-forget (no impact on response latency)

**File: `supabase/functions/selma-performance-scorer/index.ts`**
- Add a new KPI: `resolution_failure_rate` — count of failed resolutions vs total resolution attempts in the period
- Add aggregation: group `selma_resolution_failures` by `cleaned_query` where `occurrence_count >= 3` and auto-insert into `selma_learned_strategies` with `strategy_type: 'acronym_suggestion'`

---

## Phase 4: Dashboard Enhancements (P4) — Surfaces Everything

**Depends on**: P3 data flowing correctly.

### Changes

**File: `src/pages/admin/SelmaAnalytics.tsx`** (or the Selma agent page component)
- Add "Unresolved Acronyms" card: query `selma_resolution_failures` where `resolved = false` and `occurrence_count >= 3`, show with one-click "Add to Dictionary" action that inserts into `dms_document_type_acronyms`
- Add "Run Scorer Now" button that invokes `selma-performance-scorer` via `supabase.functions.invoke()`
- Add interaction timeline: show the 29+ existing metrics with outcome color-coding (green=success, yellow=partial, red=error)
- Surface audit trail: who queried what, when (already in `selma_interaction_metrics.user_id`)

**File: `src/hooks/useSelmaAnalytics.ts`**
- Add `useSelmaResolutionFailures()` hook
- Add `useSelmaAuditTrail()` hook

---

## What We Will NOT Do (and Why)

| Suggestion | Why Not |
|---|---|
| `activateApplet.aweb` injection | Speculative — could break working sessions |
| Context window compression | 100-doc cap + separate Claude calls already manage this |
| Per-user Assai credentials | Users don't have Assai accounts |
| Cascade strategy reweighting | Sequential fallback, not ranked-choice — reweighting is architecturally nonsensical |
| A2A protocol (P5) | Deferred — correct architecture identified (internal edge function + shared secret) but not urgent until core data pipeline works |

---

## Implementation Order

1. **P3**: search-engine.ts (add `cascade_depth`) + scorer (7-day window) — deploy and trigger
2. **P1**: search-engine.ts (all status codes in pagination) — deploy
3. **P2**: Migration + handlers.ts (resolution tracking) + scorer enhancement — deploy
4. **P4**: Dashboard UI — no deployment risk

## Risk Assessment

- **P3**: Zero risk — adding a field to return objects, widening a query window
- **P1**: Zero risk — additive query in a fallback path, existing logic preserved as fallback
- **P2**: Zero risk — fire-and-forget inserts, new table, no existing code modified
- **P4**: Zero risk — read-only UI components

Total files modified: 4 existing + 1 new table. All changes are additive.

