

# Fix: IFA Type-Split Missing Documents (137 vs 255)

## Root Cause Analysis

**Who is responding?** Selma. Confirmed — logs show `search_assai_documents` tool calls, not Bob.

**Why 137 instead of 255?** The status-split works correctly for 6 of 7 statuses (PLN=2, AFU=2, IFI=6, AFC=5, AFT=6, AFP=7 = 28 docs). The problem is IFA, which has ~227 docs but the split only recovers 109.

**The specific bug:** When IFA hits the 100-doc cap, the code extracts type codes from those 100 results and sub-searches each type. But there are only 23 type codes in the first 100 IFA docs. The remaining ~118 IFA docs have type codes that DON'T appear in that 100-doc sample — so they're never searched.

**Why parseTotalCount will never work:** The Assai HTML contains `getCount("100", "100", null, true, ...)` — these are pagination display parameters, NOT the total count. The real total is loaded client-side via DWR/AJAX, which server-side HTML scraping cannot access.

**Why page-2 pagination doesn't work:** Assai's `result.aweb` with `start_row=101` returns HTML without a `myCells` JavaScript array (70KB of HTML but 0 parseable rows). Assai doesn't support simple offset pagination — it relies on DWR session state.

## The Fix

### Change 1 — Use DMS Reference Table for Type-Split (not sample data)

When a status hits the 100-doc cap and has only 1 discipline, instead of extracting type codes from the 100-doc sample, query `dms_document_types` from Supabase to get ALL known type codes. This guarantees every possible type is searched.

In `paginateByStatusSplit`, replace the current type-split logic:

```text
CURRENT (broken):
  IFA hits 100 cap → extract 23 types from sample → search each → miss types not in sample

FIXED:
  IFA hits 100 cap → query dms_document_types for ALL active type codes (~100-200 codes)
  → filter to codes that COULD exist (skip types already fully retrieved)
  → search each remaining type code
  → merge and deduplicate
```

### Change 2 — Increase Query Budget to 80

With ~100+ type codes to try, 50 queries isn't enough. The time budget allows ~100 queries (each ~1s, within 120s guard). Increase `MAX_TOTAL_QUERIES` from 50 to 80 to accommodate a full type sweep while staying within the time guard.

### Change 3 — Remove Dead parseTotalCount Diagnostics

Since Assai's total is provably NOT in the HTML, remove the 30+ lines of diagnostic logging in `parseTotalCount` that fire on every single search. Keep the function but simplify it — if it ever matches a pattern, great; otherwise return null silently. This reduces log noise.

### Change 4 — Add Version Marker for Deployment Verification

Add a console.log at the top of the search handler:
```typescript
console.log('[SEARCH_V3]', { MAX_TOTAL_QUERIES: 80, strategy: 'dms-type-sweep' });
```
This lets us confirm the deployed version matches the code.

## Technical Detail

The `dms_document_types` table has ~991 active type codes. The query would be:
```typescript
const { data: allTypes } = await supabaseClient
  .from('dms_document_types')
  .select('code')
  .eq('is_active', true);
const allTypeCodes = [...new Set(allTypes.map(t => t.code))];
```

Then for the IFA cap-hit case, instead of `typeCodesInCap` (23 codes from sample), iterate `allTypeCodes` minus already-found types. Most will return 0 docs quickly, but the ones with data will be captured.

## Impact

- Only changes `paginateByStatusSplit` internals in `ai-chat/index.ts`
- No frontend changes
- No database changes
- No prompt changes needed

