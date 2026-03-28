

## Problem Analysis

Bob returned the generic "I wasn't able to process your request" message for "Can you provide the IOM of the HVAC in DP300?". This message is triggered in **two places**:

1. **Backend (line 9548-9552)**: When the Anthropic API returns a non-429 error (e.g. 500, 503, timeout), the function gives up with a generic fallback — even though Bob hasn't attempted any tool calls yet.
2. **Frontend (line 526-532)**: When the streamed response is empty or a "stub" (short text ending in `:` with no newlines), the client replaces it with the same generic error.

The system prompt already instructs Bob to resolve "IOM" → J01 → search vendor docs for DP300 HVAC. The reasoning chain is correct — but it never executes because the API call fails on the first iteration and there's no retry or deterministic fallback.

## Changes

### 1. Backend: Add retry with backoff for API failures (`supabase/functions/ai-chat/index.ts`)

When the Anthropic API returns an error (non-429), retry once after a 2-second delay before falling back. This handles transient 500/503 errors.

```text
Current flow:
  API call → error → generic fallback message

New flow:
  API call → error → wait 2s → retry → error → deterministic fallback
```

Wrap the `fetch` call at line 9494 with a retry helper: if the first call fails with a 5xx error, wait 2 seconds and retry once before proceeding to the fallback logic.

### 2. Backend: Add deterministic document-query fallback (`supabase/functions/ai-chat/index.ts`)

When ALL retries fail and the query appears document-related (contains keywords like IOM, BfD, ITP, PO, vendor, HVAC, or any known acronym), execute a deterministic pipeline without the LLM:

1. Extract potential acronyms from the user message using a regex
2. Call `executeTool('resolve_document_type', { query: acronym })` for each
3. If a document type is resolved (e.g. IOM → J01), extract any unit/plant references (e.g. DP300 → U40300)
4. Call `executeTool('search_assai_documents', { document_type, unit_code, ... })`
5. If results are found, build a `<structured_response>` from the raw tool data (reusing the existing deterministic builder at line 9632+)
6. Return a helpful message like: "I had trouble with my reasoning engine, but I found these J01 (IOM) documents in DP300 for you:" followed by the structured table

This reuses the existing 429-rate-limit fallback pattern (line 9528-9542) but extends it to all API failures.

### 3. Frontend: Improve stub detection message (`src/components/widgets/ORSHChatDialog.tsx`)

The current stub detection (line 526) replaces empty responses with a misleading "rephrase your question" message. Instead:
- Keep the detection logic but improve the message to say: "Bob encountered a temporary issue but is working on it. Please try again in a moment."
- Remove the suggestion to "rephrase your question" — the question was perfectly valid
- Add a "Retry" button that re-sends the same message automatically

### Summary of files to modify

| File | Change |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | Add single retry with 2s backoff for 5xx errors; add deterministic document-query fallback when all retries fail |
| `src/components/widgets/ORSHChatDialog.tsx` | Improve stub/empty response error message; add retry button |

