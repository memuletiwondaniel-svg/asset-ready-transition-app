

## Root Cause

The relevance filtering code exists **only in the deterministic fallback path** (lines 9640-9710) — the code that runs when the AI/Anthropic API **fails**. 

When the AI succeeds (the normal, happy path), PART 1 (lines 9836-9972) builds the structured response by taking **all documents raw from the tool result** with no filtering:

```ts
// Line 9861 — no filtering at all
const docList = (lastToolResult.documents || []).slice(0, maxDocs).map(...)
```

This means relevance filtering only ever worked when Bob had an API error. Under normal operation, users always get 30 unfiltered documents. This is why the fix keeps "reverting" — it was never applied to the main path.

## Fix

Apply the **same** subject-keyword relevance filtering from the fallback path into the **PART 1 success path** (lines 9859-9870). This is the only file that needs changing.

### File: `supabase/functions/ai-chat/index.ts`

**After** building `docList` on line 9861, add the relevance filtering block:

1. Extract subject keywords from `lastUserMessage.content` using the same `SUBJECT_KEYWORDS` map (HVAC, Electrical, Generator, Fire, etc.)
2. Split `docList` into `relevantDocs` (title contains keyword) and `otherDocs`
3. If `relevantDocs.length > 0`, replace `docList` with only relevant docs and update the summary to say "Found **N** documents related to **HVAC**" instead of "Found 30 documents"
4. If no matches, show top 10 with an explanatory note

**Move `SUBJECT_KEYWORDS` to a shared constant** above both paths so it's defined once and reused in both the fallback and the success path.

**Update `buildSearchSummary`** to accept an optional subject label and count override, so the summary reflects filtered results (e.g., "Found **2** IOM documents related to **HVAC** in DP223") instead of "Found **30** IOM documents".

### Specific changes in PART 1 (lines 9859-9870):

```ts
// After building raw docList...
const msgForFilter = (lastUserMessage?.content || '').toUpperCase();
let subjectLabel = '';
let subjectKeywords: string[] = [];

for (const [label, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
  if (keywords.some(kw => msgForFilter.includes(kw))) {
    subjectLabel = label;
    subjectKeywords = keywords;
    break;
  }
}

let filteredDocs = docList;
let otherCount = 0;
if (subjectKeywords.length > 0) {
  const relevant = docList.filter(d => 
    subjectKeywords.some(kw => (d.title || '').toUpperCase().includes(kw))
  );
  const others = docList.length - relevant.length;
  if (relevant.length > 0) {
    filteredDocs = relevant;
    otherCount = others;
  }
}
// Use filteredDocs instead of docList in the structured response
```

**Update the summary** in the structured response to reflect filtered count and subject when applicable.

**Update follow-ups** to include "Show all N documents" when filtering was applied.

### Summary

| Location | Problem | Fix |
|----------|---------|-----|
| PART 1 success path (line 9861) | No relevance filtering — shows all 30 raw docs | Add same keyword filtering from fallback |
| `SUBJECT_KEYWORDS` constant | Duplicated only in fallback | Hoist to shared scope |
| `buildSearchSummary` | Doesn't reflect filtered results | Add subject/count parameters |
| Follow-ups | Generic | Add "Show all N documents" when filtered |

Single file change: `supabase/functions/ai-chat/index.ts`. After deploying, this applies to all users permanently — no frontend/session/localStorage dependency.

