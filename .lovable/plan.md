

## Revised Phase 2 Plan — Updated Per Feedback

Two revisions incorporated:

1. **Item 4**: In addition to the regex fallback, the system prompt will instruct the AI to emit follow-up suggestions as a structured JSON block (`"follow_ups": [...]`) within `<structured_response>`. The frontend will extract `follow_ups` from this JSON first; regex is kept only as a last-resort fallback for plain-text responses.

2. **Item 6**: MAX_ITERATIONS stays at 5. The 45-second time guard is the sole loop limiter.

---

### ITEM 1 — Dynamic DP → Project Code Resolution

**File**: `supabase/functions/ai-chat/index.ts`

- Replace static `PROJECTS IN BGC_PROJ` block (~line 9253-9261) with instruction to always resolve DP numbers dynamically via `dms_projects` table.
- Add to WORK PACKAGES section: "Work package codes (ST/DP223) are NOT the same as project IDs (DP223)."
- Add rule: "If you searched for a project reference and found no results, NEVER present results from a different project. Return zero results and explain clearly."

### ITEM 2 — 6-Strategy Cascading Search

**File**: `supabase/functions/ai-chat/index.ts`

- **Bug fix**: Change `formData.set('title', title)` → `formData.set('description', title)` in both `fetchResultPage` and `executeFilteredSearch`. The Assai form field for document title in DES_DOC/SUP_DOC is `description`, not `title`.
- Replace existing multi-strategy protocol in both Bob and Selma prompts with the full 6-strategy escalation:
  1. Precise (type + project + discipline)
  2. Relax discipline (drop discipline)
  3. Title/description keyword (`description="Cathodic"`)
  4. Broad type + semantic title filtering
  5. Related type codes (J01→G01, G02)
  6. Alternative discipline codes (CP→EA, CO, IC, CV)
- Rules: try ≥3 strategies before reporting failure; note which strategy succeeded; suggest concrete next steps when exhausted.
- Update deterministic fallback to also try `description` field and related doc types.

### ITEM 3 — Intent Classification

**File**: `supabase/functions/ai-chat/index.ts`

- Add `INTENT CLASSIFICATION` section to DOCUMENT_AGENT_PROMPT:
  - **RETRIEVAL** → document table
  - **ANALYTICAL** → synthesised summary, group by company_code for vendor queries
  - **CONTENT** → search, then `read_assai_document`, then answer from content

### ITEM 4 — Structured Follow-up Suggestions (JSON-first, regex fallback)

**Two-layer approach**:

**Layer 1 — Backend (system prompt + structured response)**:
- Add to all agent system prompts: "When suggesting follow-up actions, ALWAYS include them as a `follow_ups` array inside your `<structured_response>` JSON block. Example: `{ "type": "document_search", ..., "follow_ups": ["Read the maintenance schedule", "Check for newer revisions"] }`. Maximum 3 suggestions. Each must be specific to what was returned."
- For plain-text responses (no structured_response), instruct the AI to emit a `<follow_ups>["action1", "action2"]</follow_ups>` tag at the end.

**Layer 2 — Frontend extraction** (`src/components/widgets/ORSHChatDialog.tsx` + `src/components/bob/StructuredResponse.tsx`):
- In `parseStructuredResponse`, extract `data.follow_ups` if present and return it.
- In `ORSHChatDialog.tsx`, check for `follow_ups` from structured response first. If none, try extracting `<follow_ups>[...]</follow_ups>` JSON tag from the raw text. Only fall back to regex as last resort.
- Add the colon-terminated header fallback regex as the final catch-all.
- Contextual relevance rules added to prompt: max 3, derived from results, no generic suggestions.

**File**: `StructuredResponse.tsx` — add `follow_ups` to type + parser.
**File**: `ORSHChatDialog.tsx` — 3-tier extraction (structured JSON → `<follow_ups>` tag → regex fallback).

### ITEM 5 — read_assai_document Debugging

**File**: `supabase/functions/ai-chat/index.ts`

- Add detailed `console.log` at each step: search → pk_seq_nr extraction → download URL → response status → content size → analysis call.
- Verify column index mapping for pk_seq_nr/entt_seq_nr from myCells.
- Fix any bugs found in base64 encoding or content type handling.

### ITEM 6 — API Reliability (Revised)

**File**: `supabase/functions/ai-chat/index.ts`

- **Keep MAX_ITERATIONS = 5** (unchanged).
- Add 45-second time guard: record `Date.now()` at function entry; at top of each iteration, if elapsed > 45s, break loop and return accumulated results.
- Add single retry with 30s wait for 429 errors (currently skipped).
- Graceful timeout: if loop exits via time guard, build partial response from accumulated tool results.

---

### Files Summary

| File | Items |
|------|-------|
| `supabase/functions/ai-chat/index.ts` | 1, 2, 3, 4 (prompt), 5, 6 |
| `src/components/widgets/ORSHChatDialog.tsx` | 4 (3-tier extraction) |
| `src/components/bob/StructuredResponse.tsx` | 4 (follow_ups type + parser) |

### Priority Order
1. Item 2 — Fix `description` bug + 6-strategy protocol
2. Item 1 — Dynamic resolution + substitution prohibition
3. Item 4 — JSON-first follow-ups (backend prompt + frontend extraction)
4. Item 3 — Intent classification
5. Item 6 — Time guard (keep MAX_ITERATIONS=5)
6. Item 5 — read_assai_document logging

