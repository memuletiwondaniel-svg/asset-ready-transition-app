

# Server-Side Gate: Force 3-Turn Flow for Document Reading

## Why This Keeps Happening

The 3-turn flow is **prompt-only** — a soft instruction the LLM routinely ignores. There is zero server-side enforcement. When Selma receives "Read and analyze the BfD for DP300", the model calls `read_assai_document` directly on turn 1, skipping search and confirmation. The download fails, links are missing, and the user gets a broken response.

**Prompt instructions cannot prevent tool calls.** The fix must be architectural.

## The Fix: Intercept at the Tool Execution Layer

**File: `supabase/functions/ai-chat/index.ts`** (~line 7342)

Before executing `read_assai_document`, check whether `search_assai_documents` was called earlier in the **same conversation**. If not, **block the call** and instead run `search_assai_documents` automatically, returning the search results with metadata and links — forcing the LLM into Turn 1 behavior.

### How it works

1. Track whether `search_assai_documents` has been called in this session by checking `allToolCallNames` (which accumulates all tool calls across iterations) AND scanning prior conversation messages for evidence of a previous search.

2. When `read_assai_document` is called **without a prior search in the conversation**:
   - Extract `document_number` from the tool args
   - Automatically call `search_assai_documents` with that document number instead
   - Return the search results with a message: *"I found this document. Please confirm you'd like me to read and analyze it."*
   - Include `assai_open_link` and `assai_download_link` in the result
   - Include `follow_ups: ["Read and analyze this document", "Search for a different document"]`

3. When `read_assai_document` is called **after a prior search exists** (user confirmed on Turn 2):
   - Execute normally — download and analyze

### Implementation detail

```text
Tool execution flow (line ~7342):

  if toolName === 'read_assai_document'
    AND 'search_assai_documents' NOT in allToolCallNames
    AND no prior search found in conversationMessages
  → intercept: run search_assai_documents instead
  → return search results + links + follow_up pills
  → LLM sees search results, presents metadata (Turn 1 complete)

  else
  → execute read_assai_document normally (Turn 3)
```

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | Add gate before `read_assai_document` execution (~line 7342): intercept if no prior search, redirect to `search_assai_documents` |

### What this guarantees
- **Impossible** for Selma to skip Turn 1 — the server blocks it
- Links (Open in Assai, Download) always appear because search results include project cabinet context
- Follow-up pills are included in the intercepted result
- No prompt changes needed — this is architectural enforcement

