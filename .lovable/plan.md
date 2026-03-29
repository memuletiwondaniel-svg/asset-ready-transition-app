

# Improving Selma's Document Intelligence Quality

## Root Cause Analysis

After a deep review of the 11,000-line `ai-chat/index.ts` edge function, I've identified **six root causes** behind the issues you described:

### Problem 1: Selma doesn't truly "understand" the DMS configuration
The system prompt hardcodes some DMS knowledge (status codes, discipline codes, company codes) but does NOT inject the live configuration from the database tables at runtime. Selma has no awareness of:
- The **261 projects** across BGC_PROJ (138) and ISG (123) cabinets
- The **991 active document types** and their actual names
- The **30+ disciplines** with their real names (e.g., MH = HVAC, not just "Mechanical")
- The **16+ units** (U11000 = Acid Gas Removal, U40300 = Compression, etc.)
- The **15 status codes** with their actual descriptions

**Fix**: Inject a concise DMS configuration snapshot into Selma's system prompt at runtime — loaded from the live database tables. This gives her ground-truth knowledge of every project, discipline, unit, and status code.

### Problem 2: Cross-project confusion (mixing projects)
The `resolve_project_code` tool uses `ilike` with partial matching. For example, "DP25" matches DP-025, DP-250, DP-259. Some DP numbers exist in BOTH cabinets (ISG and BGC_PROJ) with different Assai codes. The tool just returns the first match.

**Fix**: Improve project resolution with exact-match-first logic, cabinet-aware results, and disambiguation when multiple projects match.

### Problem 3: Timing out / never responding
The agent loop correctly runs up to 140 seconds, but there are scenarios where:
- The loop finishes with `finalTextContent = ''` (Claude returned only tool_use blocks with no text on the final iteration)
- The heartbeat/status events work, but if the final text is empty, the frontend shows nothing

**Fix**: Add a guaranteed response builder — if the loop ends with empty `finalTextContent` but `searchToolResult` has data, synthesize a response from the tool results. Never return an empty stream.

### Problem 4: "Document not found" when it exists
The `read_assai_document` tool searches DES_DOC first, then falls back to SUP_DOC. But the SUP_DOC fallback has a bug: it tries to reuse `hiddenFieldsRead` from the DES_DOC session (stale form tokens) instead of using the fresh SUP_DOC session fields it just fetched. This causes silent failures on vendor documents.

**Fix**: Correct the SUP_DOC fallback to use its own freshly-fetched hidden fields, and add a re-authentication step before the SUP_DOC search (same pattern as `search_assai_documents`).

### Problem 5: Acronym resolution gaps
The acronym table has 27 entries, but there are hundreds of industry acronyms Selma encounters. When `resolve_document_type` returns `found: false`, the LLM is instructed to ask the user, but often it either skips the ask or the follow-up `learn_acronym` call fails silently.

**Fix**: Pre-seed common oil & gas acronyms, and add a "fuzzy match" fallback that uses Levenshtein-style similarity to suggest close matches instead of a hard "not found".

### Problem 6: Multi-tiered search lacks persistence
The 6-strategy escalation protocol is well-documented in the system prompt, but it relies entirely on the LLM choosing to call the tool multiple times. If the LLM decides to give up after one search (especially under time pressure or high token counts), the escalation doesn't happen.

**Fix**: Move the escalation logic INTO the `search_assai_documents` tool itself — the tool should automatically try relaxed searches before returning 0 results, rather than depending on the LLM to orchestrate retries.

---

## Implementation Plan

### Step 1: Inject live DMS configuration into Selma's system prompt

Load from database at request time and append to `DOCUMENT_AGENT_PROMPT`:
- **Projects**: All 261 projects as a compact lookup table (code → DP number → name → cabinet)
- **Disciplines**: All 30 active discipline codes with names
- **Units**: All unit codes with names
- **Status codes**: All 15 with descriptions and revision suffixes
- **Originators**: Company codes with names

This replaces the hardcoded static lists currently in the prompt and ensures Selma always has current data.

### Step 2: Fix project resolution to prevent cross-project confusion

In `resolve_project_code`:
- Try exact match first (`project_id = 'DP-300'`) before falling back to partial match
- Return ALL matching projects (across cabinets) with cabinet info
- When multiple matches exist, include a disambiguation instruction
- Add a `get_all_projects` tool so Selma can look up by project name, not just DP number

### Step 3: Guarantee a response is always returned

At the end of the agent loop (after line 10773), add:
- If `finalTextContent` is empty AND `searchToolResult` exists with results → build a structured response from the tool data (same logic as the deterministic fallback)
- If `finalTextContent` is empty AND no tool results → return a clear "I wasn't able to complete the search — here's what I tried" message listing the tools that were called
- Never return an empty SSE stream

### Step 4: Fix `read_assai_document` SUP_DOC fallback

Lines 6813-6884: The SUP_DOC search currently reuses DES_DOC session tokens. Fix:
- Re-authenticate before SUP_DOC search (fresh session)
- Use the SUP_DOC-specific hidden fields from the fresh `search.aweb` call
- Add `label.aweb` warmup before SUP_DOC search (matching the pattern used in `search_assai_documents`)

### Step 5: Build automatic search escalation into the tool

Move escalation logic from the system prompt into `search_assai_documents` itself:
- If initial search returns 0 results AND `document_type` was specified:
  1. Retry without `discipline_code`
  2. Retry with `title` (description) keyword from original query
  3. Try the alternate module (DES_DOC ↔ SUP_DOC)
- Return `strategies_tried` in the response so the LLM knows what was attempted
- This ensures escalation happens deterministically, not probabilistically

### Step 6: Pre-seed acronym table and add fuzzy matching

- Insert ~50 additional common oil & gas acronyms (MDS, MRB, TBE, TBA, VDR, ESDV, PFD, FEED, EPC, etc.)
- In `resolve_document_type`, when exact match fails, add Levenshtein/similarity matching against the acronym table (e.g., "BFD" matches "BFD" even if user typed "BfD" — already handled, but "PSBD" should fuzzy-match "PSDB")
- When fuzzy match found with confidence > 0.8, use it directly rather than asking

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | All six fixes: DMS config injection, project resolution, guaranteed response, SUP_DOC fix, auto-escalation, fuzzy acronyms |

## Technical Notes

- The DMS config injection adds ~2KB to the system prompt (~500 tokens) — well within Claude's context window
- The auto-escalation in the tool adds at most 2-3 extra Assai queries but prevents wasted LLM iterations
- Project lookup table is loaded once per request (cached alongside `dynamicTypeDescs`)
- The guaranteed response builder reuses the existing structured response logic from PART 1

