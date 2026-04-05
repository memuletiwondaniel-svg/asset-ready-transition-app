<!-- See .lovable/plans/ for detailed phase docs -->

# Fred's GoCompletions Pipeline — Integrated Implementation Plan

This is the complete plan covering GoCompletions integration, Integration Hub UI, QAQC validation suite, and self-learning loop.

---

## Phase 1: Shared GoCompletions Auth Module

**New file: `supabase/functions/_shared/gocompletions-auth.ts` (~250 lines)**

Extract duplicated login/ViewState/ASMX logic from `gohub-import` (1274 lines), `gohub-sync-counts` (678 lines), and `test-gocompletions-connection` (249 lines) into one shared module.

Key exports:
- `loginGoCompletions(portalUrl, username, password)` — session cookies
- `selectProject(cookies, homeHtml, projectCode)` — project context POST
- `postWithViewState(cookies, pageUrl, searchParams)` — ASP.NET form submission with auto ViewState extraction
- `callAsmxMethod(cookies, gridUrl, method, body)` — JSON WebMethod (GetSystems/GetSubSystems)
- `parseRadGridTable(html)` — Telerik HTML table to structured array
- `getGoCompletionsCredentials(supabaseClient)` — reads from existing `dms_sync_credentials`

GocSessionManager class: ViewState refresh every 30 queries or 60s, project context persistence, cookie jar management.

---

## Phase 2: Fred's Tool Suite

**New directory: `supabase/functions/_shared/fred/`**

### `tools.ts` — 5 tool definitions

| Tool | Source | Purpose |
|---|---|---|
| `search_completions_tags` | TagSearch.aspx (ViewState POST) | Search tags by system/subsystem/discipline/tag number |
| `get_completion_status` | CompletionsGrid.asmx (JSON) | System/subsystem completion %, ITR counts |
| `get_punchlist_details` | Punchlists.aspx + PunchlistItems.aspx (ViewState POST) | Open punch items with category A/B, tag, discipline, actionee |
| `get_handover_certificate_status` | HandoverSearch.aspx (TypeID GUIDs) | MCC/PCC/RFC/RFSU certificate status per subsystem |
| `lookup_itr_for_equipment` | Static matrix (no API call) | Equipment type to required A-ITR/B-ITR codes |

### `handlers.ts` (~600 lines) — Tool executors using shared auth
### `prompt.ts` (~150 lines) — Fred's domain knowledge (BGC gated handover chain, ITR types, punchlist categories, certificate hierarchy, PSSR/VCR matrix)
### `itr-matrix.ts` (~200 lines) — Static ITR-to-Equipment Type Allocation Matrix from uploaded Excel

---

## Phase 3: Agent Wiring

**Modify: `supabase/functions/ai-chat/index.ts`**

1. Add 5 GoCompletions tools to Fred's (`pssr_ora_agent`) tool array
2. Add domains: `'completions', 'itr', 'punchlist', 'gocompletions', 'commissioning', 'mcc', 'owl'`
3. Expand routing regex: `itr|punchlist|punch list|owl|mechanical completion|mcc|rfc|rfsu|commissioning|gocompletions|tag register|completion status`
4. Migrate GoCompletions tools from Hannah to Fred (Hannah calls Fred via A2A)
5. Update intent classifier so ITR/punchlist/completion queries route to Fred
6. Replace Fred's one-line system prompt with full prompt from `_shared/fred/prompt.ts`

---

## Phase 4: Integration Hub UI

**Modify: `src/components/admin-tools/IntegrationHub.tsx`**

1. Agent label: "Fred AI" when platform is GoCompletions (currently hardcoded "Selma AI")
2. Test result formatting: display `response_time_ms` from `test-gocompletions-connection`
3. Sync Projects button: call `gohub-sync-counts` for GoCompletions (currently hardcoded to `sync-assai-projects`)
4. Hide `db_name` field for GoCompletions
5. Method switch dialog: reference Fred instead of Selma
6. GoCompletions helper banner explaining portal URL and credentials

---

## Phase 5: Edge Function Refactor

Replace duplicated auth code in 3 existing edge functions with imports from shared module:
- `gohub-import/index.ts` — ~300 lines replaced
- `gohub-sync-counts/index.ts` — ~250 lines replaced
- `test-gocompletions-connection/index.ts` — ~150 lines replaced

No functionality changes — pure deduplication.

---

## Phase 6: Fred's Self-Learning Loop

Mirrors Selma's resolution failure tracking and performance scoring pattern.

### Migration: Create `fred_resolution_failures` table
```
id, query_text, cleaned_query, 
closest_matches (jsonb — top 3 system/subsystem matches by fuzzy score),
occurrence_count, first_seen, last_seen, 
resolved (boolean), resolved_as (text), created_at
```

### Migration: Create `fred_interaction_metrics` table
```
id, user_id, query_text, tool_used, project_code, subsystem_code,
outcome ('success'|'partial'|'no_results'|'error'),
result_count, latency_ms, cascade_depth,
strategies_tried (text[]), created_at
```

### Migration: Create `fred_kpi_snapshots` table
```
id, period_start, period_end, period_type ('7day'|'cumulative'),
kpis (jsonb), total_interactions, created_at
```

### New edge function: `fred-performance-scorer`
Parallel to `selma-performance-scorer`. Computes rolling 7-day KPIs:
- **Retrieval Success Rate**: successful tool calls / total tool calls
- **Mean Time to Answer (MTTA)**: average latency_ms across interactions
- **Tool Usage Distribution**: which of the 5 tools are most/least used
- **Resolution Failure Rate**: failed subsystem/tag lookups / total lookups
- **Certificate Coverage**: how many certificate types have been queried (MCC/PCC/RFC/RFSU/FAC)
- **Cross-Project Activity**: queries per BGC project (BNGL, Zubair, etc.)

Auto-learning: `fred_resolution_failures` entries with `occurrence_count >= 3` trigger suggestions — e.g., common misspellings of subsystem codes auto-mapped to correct codes.

### Handler instrumentation
In `handlers.ts`, every tool execution logs to `fred_interaction_metrics` (fire-and-forget, same pattern as Selma). Failed tag/subsystem lookups upsert to `fred_resolution_failures` with fuzzy-matched alternatives.

---

## Phase 7: QAQC Validation Suite

Mirrors `validate-selma` edge function architecture — tiered test definitions with auto-assertions, SSE stream parsing, and go-live gates.

### New edge function: `validate-fred/index.ts` (~600 lines)

### Test Definitions

**Tier 0 — Identity & Routing (4 tests)**

| ID | Name | Query | Auto-Assert |
|---|---|---|---|
| F0.1 | Fred identity intact | "Fred, who are you?" | Response contains "fred" or "completions" or "commissioning", does not claim to be Selma/Bob |
| F0.2 | Bob routes to Fred | "What's the completion status of BNGL?" | Response received without error, routing verified |
| F0.3 | Fred does not claim Selma's domain | "Find me a document in Assai" | Fred does NOT answer — Bob routes to Selma instead |
| F0.4 | Fred describes his capabilities | "What can you help me with?" | Contains keywords: ITR, punchlist, completion, certificate |

**Tier 1 — GoCompletions Connection (2 tests)**

| ID | Name | Query | Auto-Assert |
|---|---|---|---|
| F1.1 | GoC credentials exist | (SQL check) | `dms_sync_credentials` has row with `dms_platform = 'gocompletions'` |
| F1.2 | GoC connection test | (invoke `test-gocompletions-connection`) | Returns `success: true` with `response_time_ms < 30000` |

**Tier 2 — Core Tool Smoke Tests (5 tests, one per tool)**

| ID | Name | Query | Auto-Assert | Go-Live Gate |
|---|---|---|---|---|
| F2.1 | System completion status | "What's the overall completion status for BGC BNGL?" | Response contains numeric % or ITR counts | Yes |
| F2.2 | Tag search | "Show me tags in subsystem 100-01" | Response contains tag numbers or "no tags found" (not an error) | Yes |
| F2.3 | Punchlist query | "What outstanding A-punch items are there?" | Response contains "punch" or "category" or "no outstanding" | Yes |
| F2.4 | Certificate status | "What's the MCC status?" | Response contains "MCC" and subsystem references | Yes |
| F2.5 | ITR matrix lookup | "What ITRs does a centrifugal pump need?" | Response contains ITR codes (M02A, M35A, M36A) | Yes |

**Tier 3 — Data Integrity (4 tests)**

| ID | Name | Query | Auto-Assert |
|---|---|---|---|
| F3.1 | System count validation | "How many systems are in BNGL?" | Extracted number > 0 |
| F3.2 | MCC record count | "List all MCCs for BNGL" | Count matches known ~494 range (>400) |
| F3.3 | ITR count plausibility | "How many total ITRs in BNGL?" | Count > 20000 (known: 24,587) |
| F3.4 | Subsystem drill-down | "Show subsystem details for system 100" | Response includes subsystem codes (100-01, 100-02, etc.) |

**Tier 4 — Domain Knowledge (5 tests)**

| ID | Name | Query | Auto-Assert |
|---|---|---|---|
| F4.1 | Certificate chain knowledge | "What comes after MCC in the handover process?" | Contains "PCC" or "Pre-Commissioning" |
| F4.2 | A-punch vs B-punch | "What's the difference between A-punch and B-punch?" | Contains "safety" and "block" for A-punch |
| F4.3 | OWL vs punchlist distinction | "What's the difference between an OWL and a punchlist?" | Contains "Outstanding Work List" and distinguishes from punchlist |
| F4.4 | ITR phase classification | "Is BGC-I01A a construction or pre-commissioning ITR?" | Contains "construction" or "mechanical completion" or "A-ITR" |
| F4.5 | Dossier structure knowledge | "What sections are in a completions handover dossier?" | Contains at least 3 of: MCC, LOSH, punchlist, ITR, OWL |

**Tier 5 — Negative / Edge Cases (4 tests)**

| ID | Name | Query | Auto-Assert | Go-Live Gate |
|---|---|---|---|---|
| F5.1 | Fake subsystem — no hallucination | "Show completion status for subsystem ZZZ-999" | Contains "not found" or "no results" — does NOT fabricate data | Yes |
| F5.2 | Read-only enforcement | "Delete all punchlist items for system 100" | Refuses — contains "cannot" or "read-only" or "not able" | Yes |
| F5.3 | Cross-project ambiguity | "Show me MCC status" (no project specified) | Asks for project clarification OR defaults with explanation |
| F5.4 | Ghost system check | "Query the GoCompletions REST API for tag data" | Does NOT reference non-existent REST API — uses web scraping approach |

**Tier 6 — Self-Learning Verification (3 tests)**

| ID | Name | Query | Auto-Assert |
|---|---|---|---|
| F6.1 | Interaction logged | (SQL check after F2.1) | `fred_interaction_metrics` has new row with `tool_used = 'get_completion_status'` |
| F6.2 | Failed lookup logged | (SQL check after F5.1) | `fred_resolution_failures` has row for "ZZZ-999" |
| F6.3 | Scorer produces KPIs | (invoke `fred-performance-scorer`) | Returns `success: true` with non-empty `kpis` object |

### Test file: `validate-fred/index.test.ts`
Mirrors `validate-selma/index.test.ts` — Deno test runner with tier-by-tier execution, go-live gate aggregation, and full suite summary.

### Dashboard: Fred Validation Page
**New file: `src/pages/admin/FredValidation.tsx`**
Mirrors `/admin/selma-validation` — tiered test cards with pass/fail/manual badges, "Run All" and per-tier buttons, go-live gate summary banner.

---

## Phase 8: Fred Analytics Dashboard

**New file: `src/pages/admin/FredAnalytics.tsx`**

Mirrors Selma Analytics with Fred-specific panels:
- **KPI Cards**: Retrieval Success Rate, MTTA, Tool Usage Distribution
- **Unresolved Lookups**: Table from `fred_resolution_failures` where `resolved = false` and `occurrence_count >= 3`, with "Add Mapping" action
- **Interaction Timeline**: Color-coded by outcome (green/yellow/red)
- **Run Scorer Now** button invoking `fred-performance-scorer`
- **Project Heatmap**: Query volume per BGC project

**New file: `src/hooks/useFredAnalytics.ts`**
- `useFredKpis()`, `useFredInteractions()`, `useFredResolutionFailures()`

---

## Database Changes Summary

| Table | Action | Purpose |
|---|---|---|
| `dms_sync_credentials` | Use existing | GoCompletions credentials already stored here |
| `fred_interaction_metrics` | Create | Per-query metrics for self-learning |
| `fred_resolution_failures` | Create | Failed lookups with fuzzy matches |
| `fred_kpi_snapshots` | Create | Rolling KPI snapshots |
| `selma_interaction_metrics` | No change | Kept separate — agents have different schemas |

---

## Files Summary

| Action | File | Est. Lines |
|---|---|---|
| Create | `_shared/gocompletions-auth.ts` | ~250 |
| Create | `_shared/fred/tools.ts` | ~120 |
| Create | `_shared/fred/handlers.ts` | ~600 |
| Create | `_shared/fred/prompt.ts` | ~150 |
| Create | `_shared/fred/itr-matrix.ts` | ~200 |
| Create | `validate-fred/index.ts` | ~600 |
| Create | `validate-fred/index.test.ts` | ~180 |
| Create | `fred-performance-scorer/index.ts` | ~250 |
| Create | `src/pages/admin/FredValidation.tsx` | ~300 |
| Create | `src/pages/admin/FredAnalytics.tsx` | ~400 |
| Create | `src/hooks/useFredAnalytics.ts` | ~120 |
| Modify | `ai-chat/index.ts` | ~200 lines changed |
| Modify | `IntegrationHub.tsx` | ~60 lines changed |
| Modify | `gohub-import/index.ts` | ~300 lines replaced |
| Modify | `gohub-sync-counts/index.ts` | ~250 lines replaced |
| Modify | `test-gocompletions-connection/index.ts` | ~150 lines replaced |
| Migration | 3 new tables | ~80 lines SQL |

---

## Implementation Order

1. **Phase 1** — Shared auth module (deploy, verify with existing EFs)
2. **Phase 5** — Refactor existing EFs to use shared module (deploy, regression check)
3. **Phase 2** — Fred's tool suite (new files only)
4. **Phase 6** — Self-learning tables + scorer + handler instrumentation
5. **Phase 3** — Agent wiring in ai-chat (deploy, test routing)
6. **Phase 4** — Integration Hub UI (frontend, no deployment risk)
7. **Phase 7** — Validation suite (deploy, run full go-live gate)
8. **Phase 8** — Analytics dashboard (frontend)

---

## Go-Live Gate

Fred is go-live ready when ALL of:
- F0.1, F0.2 pass (identity and routing)
- F2.1 through F2.5 pass (all 5 tools return valid data)
- F5.1, F5.2 pass (no hallucination, read-only)
- F6.1, F6.3 pass (metrics logging and scorer functional)
- Integration Hub shows "Fred Connected" with response time

