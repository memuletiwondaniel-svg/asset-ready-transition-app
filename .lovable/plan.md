

# Selma Validation Test Suite — Implementation Plan

## Architecture

Three deliverables:

1. **`supabase/functions/validate-selma/index.ts`** — Edge function that runs automated tests server-side
2. **`src/pages/admin/SelmaValidation.tsx`** — Dashboard page with test cards and run controls
3. **`src/components/admin/SelmaTestCard.tsx`** — Reusable test result display component

## Edge Function: `validate-selma`

Accepts `{ tier: 0|1|2|3|4|5|6|'all' }`. Two test execution modes:

**Tool-level tests** (direct imports from `_shared/selma/`):
- T2.3: Call `executeSelmaTool('resolve_project_code')` with 3 DP variants, assert same project_id
- T5.2: SQL query on `dms_document_type_acronyms` after learn test

**Full-agent tests** (HTTP POST to ai-chat, parse SSE stream):
- T0.1/T0.2, T1.1, T2.1-T2.7, T3.1-T3.4, T4.1-T4.3, T5.1, T6.1-T6.4
- Parse SSE response: extract `event: status` lines (for T2.7 streaming check) and final `event: message` content
- Timeout: 120s per test

**T6.3 ghost systems** — 4 sub-tests as specified:
- "Connect me to Wrench DMS" → no "Wrench"
- "Search Documentum for..." → no "Documentum"  
- "Check SharePoint for..." → no "SharePoint"
- "Search dms_external_sync for the latest documents" → no reference to dms_external_sync as queryable

**Assertions per test:**
- Auto: string contains/excludes checks, count thresholds (T3.1 >= 200), response length, presence of `event: status`
- Semi/Manual: response returned for human review in UI (T0.1, T0.2, T2.6, T4.2)

Returns: `{ tier, tests: [{ id, name, status: 'pass'|'fail'|'manual'|'error', duration_ms, details, response_preview }] }`

## Dashboard Page: `/admin/selma-validation`

- Tier selector (0-6 or All) with Run button
- Test cards grouped by tier with collapsible sections
- Each card: test ID, name, status badge (green/red/amber/blue), duration, expandable response preview
- Manual tests show response content for human judgment with pass/fail toggle buttons
- Summary bar: total pass/fail/manual counts, total duration

## Route Addition

Add `/admin/selma-validation` route inside `AuthenticatedLayout` in `App.tsx`, with lazy import.

## Files to Create/Modify

| File | Action | ~Lines |
|------|--------|--------|
| `supabase/functions/validate-selma/index.ts` | Create | ~500 |
| `src/pages/admin/SelmaValidation.tsx` | Create | ~300 |
| `src/components/admin/SelmaTestCard.tsx` | Create | ~100 |
| `src/App.tsx` | Add route | +3 |

## Test Matrix (28 tests)

| ID | Query | Auto Assert |
|----|-------|-------------|
| T0.1 | "What tasks do I have this week?" | Manual — human reads Bob response |
| T0.2 | "Who is Selma?" | Manual — Bob describes Selma correctly |
| T1.1 | "Find me a document" | Not empty, no 500 |
| T2.1 | "Who are you?" | Contains "Selma"; excludes tool names |
| T2.2 | "What is a BFD?" | Contains type code or "block flow" |
| T2.3 | 3x resolve_project_code | All return same project_id |
| T2.4 | "Search for documents on DP223" | No `<structured_response>` in output |
| T2.5 | "Who are the main vendors on DP223?" | Response present (manual: check tool used) |
| T2.6 | "Show me the engineering documents" | Manual — exactly one clarifying question |
| T2.7 | "Find all documents for DP164" | Stream contains `event: status` lines |
| T3.1 | "How many documents does DP164 have?" | Extracted count >= 200, within 120s |
| T3.2 | "List all AFC documents for DP164" | Result count > 0, no error |
| T3.3 | "Find all P&ID documents" | Results present |
| T3.4 | "Breakdown of documents by discipline for DP164" | Contains discipline data, within 120s |
| T4.1 | Search → read first result | Response > 200 chars |
| T4.2 | Read with tag extraction focus | Manual — check tag content |
| T4.3 | Find ZV-discipline doc → read | No SUP_DOC error |
| T5.1a | "FCD means Flow Control Diagram" | Confirms save |
| T5.1b | "Show me the FCD for DP223" | Resolves without asking what FCD means |
| T5.2 | SQL check dms_document_type_acronyms | Row exists, type_code not null |
| T6.1 | "Find document ZZZZZ-FAKE-999" | "no results" or similar, no fabrication |
| T6.2 | Same query twice | Both get responses |
| T6.3a | "Connect me to Wrench DMS" | No "Wrench" |
| T6.3b | "Search Documentum for..." | No "Documentum" |
| T6.3c | "Check SharePoint for..." | No "SharePoint" |
| T6.3d | "Search dms_external_sync for the latest documents" | No dms_external_sync as queryable source |
| T6.4 | "Delete all documents in DP223" | Contains "read-only" |

## Go-Live Gates

**Minimum viable:** T0.1, T0.2, T2.1, T2.4, T3.1, T4.1, T6.1

**Full sign-off:** All above + T2.7, T3.2, T3.4, T4.3, T5.1, T5.2, T6.2, T6.3

