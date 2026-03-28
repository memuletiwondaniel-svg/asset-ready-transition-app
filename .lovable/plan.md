

## Problem 1: Relevance Filtering Not Applied

The scoring logic runs correctly — documents are split into `relevantDocs` and `otherDocs`. But on line 9704, the code merges them right back together:

```ts
docList = [...relevantDocs, ...otherDocs].slice(0, 30);
```

This means ALL 30 documents still show. The fix: when relevant docs exist, show ONLY those. When none match, show top 10 with explanation.

## Problem 2: Auto-Retry Never Actually Retries

On lines 538-539, the ref is reset to `false` BEFORE `handleSend` is called:

```ts
retryAttemptRef.current = false;  // ← resets flag
handleSend(textToSend);           // ← new call sees flag as false, not as "retry"
```

This means the retry call is treated as a fresh call. If IT also fails, it tries to "retry" again (infinite loop risk), or the timing means the flag state is lost. The fix: keep the flag `true` during the retry call and only reset it on success.

## Changes

### 1. Backend: Show only relevant docs (`supabase/functions/ai-chat/index.ts`)

**Line 9699-9711** — Replace the docList logic:

- If `relevantDocs.length > 0`: set `docList = relevantDocs` (NOT merged with otherDocs). Summary says "Found X documents related to HVAC" and adds a follow-up "Show all Y IOMs including unrelated ones".
- If `relevantDocs.length === 0` and `subjectLabel` exists: set `docList = allDocs.slice(0, 10)`. Summary says "I didn't find a specific IOM for HVAC, but here are the closest X of Y IOMs. None matched HVAC specifically."
- If no subject: show all as before.

### 2. Frontend: Fix auto-retry flag logic (`src/components/widgets/ORSHChatDialog.tsx`)

**Lines 532-541 (stub detection)** and **580-588 (fetch error)**:

- Do NOT reset `retryAttemptRef.current = false` before calling `handleSend`. Instead, keep it `true` so the retried call knows it's a retry.
- Reset to `false` only AFTER a successful response (line 550) or when the retry itself fails (line 542).
- Pass an `isRetry` parameter or use the ref to skip re-entering the retry branch on the second attempt.

Corrected flow:
```text
1st call fails → stub detected → ref = true → show "few more seconds" → handleSend()
2nd call runs → ref is true → if stub again, skip retry, show error → ref = false
2nd call succeeds → ref = false on line 550
```

### Summary

| File | Fix |
|------|-----|
| `supabase/functions/ai-chat/index.ts` | `docList = relevantDocs` only (not merged); show top 10 if no matches |
| `src/components/widgets/ORSHChatDialog.tsx` | Keep `retryAttemptRef = true` during retry; only reset after success or 2nd failure |

