

## Fix: Analytical Intent Not Firing in Deterministic Fallback (Non-429 Path)

### Root Cause (Confirmed)

Three bugs combine to produce "I didn't find a specific document for **MANY**":

1. **Duplicate STOP_WORDS without analytical terms** (line 9820): The non-429 deterministic fallback defines its own `STOP_WORDS` set that is missing all the analytical words (`MANY`, `PENDING`, `REVIEW`, `STATUS`, `VENDOR`, etc.) that were added to `STOP_WORDS_SHARED` at line 9578. So "MANY" passes the filter and becomes `subjectLabel`.

2. **No analytical intent check in non-429 fallback** (line 9691): The query matches `isDocQuery` because `DOC_KEYWORDS` includes `'VENDOR'` and `'DOCUMENT'`. It then enters the document search path and always builds a raw `document_list`. The analytical detection added at line 10034 only runs in the 429 fallback path — the non-429 fallback at line 9677 has no equivalent check.

3. **Bob's prompt lacks document intent classification**: Bob's `BOB_SYSTEM_PROMPT` has DATA vs NAVIGATION intent classification but does NOT have the RETRIEVAL/ANALYTICAL/CONTENT classification for document queries. That exists only in `DOCUMENT_AGENT_PROMPT` (line 9454). When `detectAgentDomain` routes to Selma (which it does for this query since it contains "document"), Selma's prompt has it — but if the LLM never fires (API error), it's irrelevant.

### Changes

**File**: `supabase/functions/ai-chat/index.ts`

#### Change 1: Replace duplicate STOP_WORDS with STOP_WORDS_SHARED (line 9820)

Replace the local `STOP_WORDS` constant at line 9820 with a reference to `STOP_WORDS_SHARED` (defined at line 9578), which already includes all analytical terms.

#### Change 2: Add analytical intent detection at top of non-429 fallback (line ~9691)

Before entering the document search logic, check for analytical intent using the same patterns from line 10034:

```typescript
// Check for analytical intent BEFORE document search
const analyticalPatterns = [
  /how many/i, /what(?:'s| is) the status/i, /status of/i,
  /pending review/i, /pending approval/i, /are (?:pending|outstanding|overdue)/i,
  /which (?:contractors?|vendors?|companies?) are/i, /breakdown/i, /summary of/i,
  /distribution/i, /count of/i, /total (?:number|count)/i
];
const isFallbackAnalytical = analyticalPatterns.some(p => p.test(lastUserMsg));
```

#### Change 3: Build analytical response when `isFallbackAnalytical` is true

After the search succeeds (line 9785), if `isFallbackAnalytical` is true, build a synthesized summary response (same logic as the 429 analytical path at line 10154) instead of the raw document table. This includes:
- Status counts (pending, approved, cancelled)
- Vendor grouping when the query mentions vendors
- `document_search` type with `status_table` instead of `document_list`

#### Change 4: Add ANALYTICAL classification to Bob's system prompt

Add a brief document intent classification block to `BOB_SYSTEM_PROMPT` (around line 860, after the DATA/NAVIGATION section) so Bob also recognises analytical document queries when the LLM does fire:

```
When handling DOCUMENT queries, classify intent:
- ANALYTICAL ("how many", "status of", "pending", "breakdown") → search broadly, synthesise counts/summaries
- RETRIEVAL ("find the IOM", "show me the P&ID") → search and return document table
- CONTENT ("what does it say", "summarise") → search, read, answer from content
```

### Technical Details

- Single file: `supabase/functions/ai-chat/index.ts`
- 4 changes, all in the deterministic fallback and Bob's prompt
- Reuses existing analytical response builder logic from line 10154
- No frontend changes needed

