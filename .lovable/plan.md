

# Fix: Type-Code Sweep Returning 0 Docs (128 vs 255)

## What Happened — Plain English

Selma found 128 documents instead of 255 for DP164. Here's exactly why:

1. **First search** returned 100 docs (Assai's page limit). All had status IFA, plus a few PLN, AFU, IFI, AFC, AFT, AFP.
2. **Status split** worked correctly: searched each of the 7 statuses individually. Got 28 docs from non-IFA statuses + 100 from IFA = 128 unique docs. IFA was still capped at 100.
3. **Type-code sweep** was supposed to break the IFA cap by searching each document type individually. It queried the database, got 578 unique type codes, and tried searching each one. But **every single query returned 0 documents** — Assai returned the empty search form page instead of results.

**Root cause:** Each type-code sweep query calls `initSearch` (GET to `search.aweb`) to get fresh form tokens, then POSTs to `result.aweb`. After ~15-20 rapid `initSearch` calls on the same session cookie, Assai's server-side session state degrades and starts returning the search form page instead of results. The status split worked because it ran early (only 7 calls). The type sweep ran next with 110+ calls and ALL failed.

**Evidence:** Logs show 120 queries used, every sweep response is 40,779 bytes of HTML containing the search form (DOCTYPE, DWR scripts) with no `myCells` data array. The log line `"paginateByStatusSplit: type-code sweep added 0 new docs"` confirms zero recovery.

## The Fix — SEARCH_V10

### Change 1: Re-authenticate Before Type Sweep

Before starting the type-code sweep, call `authenticateAssai()` again to get a **fresh session cookie**. This resets Assai's server-side state. The status split exhausts the original session; the type sweep needs its own.

### Change 2: Batch Re-authentication During Sweep

Every 15 type-code queries, re-authenticate to keep the session fresh. This prevents the same degradation from happening during the sweep itself.

```text
CURRENT (broken):
  Status split (7 queries, works) → Type sweep (110+ queries, ALL fail — stale session)

FIXED:
  Status split (7 queries) → Re-auth → Type sweep (15 queries) → Re-auth → Type sweep (15 more) → ...
```

### Change 3: Combine Status + Type Filters for IFA

Instead of sweeping ALL 578 type codes without a status filter, target specifically the capped status (IFA) combined with each type code. This means searching `status_code=IFA + document_type=XXXX` which produces smaller, more targeted result sets. This reduces the number of queries needed because we only need to find the ~127 missing IFA docs, not search the entire database.

### Change 4: Smart Type Prioritization

Instead of sweeping all 578 codes blindly, first extract the ~23 type codes present in the IFA sample (the first 100 IFA docs). Then only sweep the remaining ~555 codes. The 23 known types are already represented; the missing 127 docs must be in the other types.

### Change 5: Reduce Query Budget to 80, Add Re-auth Budget

With targeted IFA+type searches and session refresh, we need fewer total queries. Set `MAX_TOTAL_QUERIES = 80` with a re-auth every 15 queries (max 5 re-auths). Add a log line tracking re-auth count.

### Change 6: Version Marker

```typescript
console.log('[SEARCH_V10]', { MAX_TOTAL_QUERIES: 80, strategy: 'status+type-combo-with-reauth' });
```

## Technical Detail

In `executeFilteredSearch`, add an optional `freshCookies` parameter. Before the type sweep loop, call:
```typescript
const freshAuth = await authenticateAssai(assaiBase, username, password);
if (freshAuth.success) cookieHeader = freshAuth.cookies;
```

Then inside the sweep loop, every 15 iterations:
```typescript
if (sweepQueryCount % 15 === 0 && sweepQueryCount > 0) {
  const reAuth = await authenticateAssai(assaiBase, username, password);
  if (reAuth.success) cookieHeader = reAuth.cookies;
}
```

For the combined filter approach:
```typescript
// Instead of: executeFilteredSearch(params, { document_type: tc })
// Use: executeFilteredSearch(params, { status_code: 'IFA', document_type: tc })
```

This targets only the capped status, dramatically reducing the search space and query count needed.

## Files Changed

- `supabase/functions/ai-chat/index.ts` — modify `paginateByStatusSplit` internals only

## Impact

- No frontend changes
- No database changes  
- No prompt changes
- Only affects the pagination fallback path when a status hits the 100-doc cap

