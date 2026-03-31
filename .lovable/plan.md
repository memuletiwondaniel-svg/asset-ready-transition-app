

# Revised Plan: Full-Accuracy Breakdown Table

## The Problem You've Identified

You're right — it IS misleading. If Selma says "DP-XXX has 5,000 documents" but the breakdown table only reflects the 500 she fetched, the type/status counts are **wrong**. They represent a biased sample (whatever Assai's default sort returns first), not the real distribution. A table showing "ZV: 47" when the real number is 312 is worse than no table at all.

## Why This Happens

The previous plan capped fetching at 500 documents and built `type_summary`/`status_summary` from only those 500. The `parseTotalCount` gives us the real total (5,000) but we only have metadata from 500 — the breakdown is a partial view presented as if it were complete.

## The Fix: Separate the Metadata Sweep from the Document Display

**Key insight**: Selma doesn't need 5,000 full document objects to build an accurate breakdown table. She just needs the **type_code** and **status** from each row. The detailed document data (title, revision, discipline, download URL) is only needed for the 100 she actually displays.

### Time Budget Analysis

Each page costs ~1s (300ms delay + ~700ms network). The edge function has a 148s time guard.

| Total Docs | Pages (at 100/page) | Pagination Time | Time Left for LLM |
|---|---|---|---|
| 255 | 3 | ~3s | ~145s |
| 1,000 | 10 | ~10s | ~138s |
| 5,000 | 50 | ~50s | ~98s |
| 10,000 | 100 | ~100s | ~48s |

5,000 documents is comfortably feasible. 10,000 is tight but possible. Beyond that, we add a time guard to stop pagination and report partial coverage.

### Revised Change 2 — Two-Tier Pagination

Instead of capping at 500 docs, the rewritten `paginateSearch` will:

1. **Tier 1 — Detailed documents** (first 100): Full document objects with title, revision, discipline, download_url. These go into `documents[]` for display.

2. **Tier 2 — Metadata sweep** (all remaining pages): Continue fetching pages but only extract `type_code`, `status`, and `document_number` from each row. These are lightweight — just three strings per doc. They feed the `type_summary` and `status_summary` builders but are NOT added to the detailed documents array.

3. **Time guard**: Check elapsed time before each page request. If we've used more than 120s of the 148s budget, stop the sweep and mark the breakdown as partial.

```text
Page 1 ──► full docs (up to 100) + metadata
Page 2 ──► metadata only (type, status, doc_number)
Page 3 ──► metadata only
...
Page N ──► metadata only (or stop if time guard hit)

Result:
  documents: [100 full docs for display]
  type_summary: {built from ALL pages' metadata — accurate}
  status_summary: {built from ALL pages' metadata — accurate}
  total_assai_count: 5000 (from parseTotalCount)
  breakdown_complete: true/false
  breakdown_coverage: "5000 of 5000" or "3200 of 5000"
```

### What This Means for the User

- "Show me all documents for DP-XXX" with 5,000 docs → Selma says "DP-XXX has 5,000 documents" and the breakdown table shows **accurate** counts for every type and status, because she swept all 50 pages of metadata. She displays the first 100 documents in detail and offers filter pills.

- If the project has 15,000 docs and pagination hits the time guard at page 80 (8,000 docs), Selma says: "DP-XXX has 15,000 documents. I've analyzed 8,000 for the breakdown below — apply a filter for complete results on a specific category."

### Impact on Previous Changes

**Zero impact on any previously deployed feature.** This revision only changes the internals of `paginateSearch` (Change 2) and the result object (Change 3). Changes 1 (regex fix) and 4 (prompt update) remain identical. The status-split fallback (`paginateByStatusSplit`) is still preserved. No frontend changes, no database changes.

### Why Selma Couldn't Figure This Out Herself

Selma is an LLM — she processes text responses from tools. She has no ability to:
- Inspect Assai's HTML pagination controls
- Know that `parseTotalCount` was returning `null`
- Decide to re-call a tool with different parameters unless explicitly instructed

The fix is entirely in the **tool layer** — give Selma accurate data and she'll report it accurately. After this fix, her prompt (Change 4) will include: *"If breakdown_complete is false, tell the user how many documents were analyzed and suggest filters for complete coverage."*

## Summary of All 4 Changes (Updated)

1. **Change 1** — Fix `parseTotalCount` regex (line 8452) — identical to previous plan
2. **Change 2** — Rewrite `paginateSearch` with two-tier pagination: full docs for first 100, metadata-only sweep for remaining pages, time guard at 120s, no arbitrary 500-doc cap
3. **Change 3** — Add `total_assai_count`, `breakdown_complete`, `breakdown_coverage` to tool result; change `typeSummary.statuses` from `string[]` to `Record<string, number>`
4. **Change 4** — Update `DOCUMENT_AGENT_PROMPT` to use `total_assai_count`, present breakdown table, handle partial coverage messaging

