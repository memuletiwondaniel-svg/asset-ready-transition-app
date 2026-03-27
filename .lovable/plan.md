

# Fix Bob's Document Search Intelligence

## Problems Identified

1. **Bob searches too broadly** — uses `6529-%` instead of passing `document_type: A02` when user asks for "BfD"
2. **Summary exposes raw wildcard pattern** — users see "Found 25 documents matching 6529-%" which is meaningless
3. **document_type described as "ZV document type code"** — misleads the AI into thinking type codes are vendor-only
4. **No plant/area code mapping** — "DP300" means nothing to Bob; it should map to a unit code segment
5. **Module routing ignores document_type** — A02 (BfD) exists in both DES_DOC and SUP_DOC but routing doesn't consider the type

## Changes

### 1. Fix the search tool description (ai-chat/index.ts ~line 3097-3099)

Change `document_type` parameter description from:
> "Filter by ZV document type code"

To:
> "Filter by document type code. Works for ALL documents, not just vendor. Examples: A02 (Basis for Design), C02 (Specification), B01 (GA Drawing), H02 (ITP). ALWAYS pass this when the user mentions a document type by name."

### 2. Strengthen the system prompt instructions (ai-chat/index.ts ~line 702-704)

Replace the document type lookup section with explicit instructions:

- When the user mentions a document type (BfD, ITP, SDR, etc.), Bob MUST pass the resolved type code as `document_type` parameter — not just use a broad wildcard
- When the user mentions a plant/unit like "DP300", use it in the document_number_pattern as `6529-%-%-%-U40300-%-%-%-%` or similar partial match
- Add a plant code reference: DP300 = U40300, and instruct Bob to ask if uncertain

### 3. Fix the summary line (ai-chat/index.ts ~line 9345)

Change the deterministic summary from:
```
`Found **${total}** documents matching ${lastToolResult.search_pattern}`
```
To a user-friendly version that describes what was searched rather than showing the raw pattern:
```
`Found **${total}** documents`
```
Then append context from `filters_applied` — e.g., if `document_type` was A02, say "Found **25** Basis for Design documents". Build a human-readable description from the filters instead of showing the wildcard.

### 4. Fix module routing to consider document_type (ai-chat/index.ts ~line 6848-6855)

Currently only checks `discipline_code === 'ZV'` or PO digits. Add: when `document_type` is provided and no explicit discipline is set, search BOTH DES_DOC and SUP_DOC (since type codes like A02 can exist in either module). The fallback logic at line 7170 already does this for 0 results, but we should search both proactively when type code is the primary filter.

### 5. Add DP-to-unit-code mapping to system prompt

Add a reference table for known plant/unit codes so Bob can construct specific patterns:
- DP300 → U40300 (unit code segment)
- Other known DP codes from the project

Instruct Bob: "When the user mentions a DP number, map it to the unit code and include it in the search pattern for precision."

### Files Modified
- `supabase/functions/ai-chat/index.ts` — system prompt, tool description, summary builder, module routing

