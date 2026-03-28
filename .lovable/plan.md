

# Retrain Bob & Selma — Deep Document Intelligence

## Problem Summary

Bob and Selma are hallucinating document codes and giving poor document search results because:

1. **Selma's system prompt has its own hardcoded doc type list** (lines 9123-9195) — she looks these up instead of calling `resolve_document_type`
2. **Selma's prompt explicitly says** "look up the document type name in the DOCUMENT TYPE CODE REFERENCE at the end of this prompt" (line 9327) — bypassing the dynamic tool entirely
3. **The resolve_document_type and learn_acronym instructions only exist in Bob's prompt** (lines 702-750) — when Selma is activated, she gets DOCUMENT_AGENT_PROMPT which lacks these instructions
4. **Selma's AGENT_CAPABILITIES tool list** (line 3538) does not include `resolve_document_type` or `learn_acronym`
5. **No structured reasoning about document content** — the agents don't understand what each document type actually contains or how to combine project context with document type to build the right search

## Changes

### 1. Add resolve_document_type and learn_acronym to Selma's tool list

In AGENT_CAPABILITIES (line 3538), add `'resolve_document_type'` and `'learn_acronym'` to document_agent's tools array.

### 2. Replace Selma's hardcoded doc type reference with dynamic resolution instructions

In DOCUMENT_AGENT_PROMPT (~line 8982), inject the same critical document resolution instructions currently only in Bob's prompt:

- The full "DOCUMENT TYPE RESOLUTION (CRITICAL)" block (lines 702-750)
- The "INDUSTRY ACRONYM AWARENESS" block
- The "UNKNOWN ACRONYM HANDLING" flow
- The "CRITICAL — resolve_document_type input rules"

This ensures Selma always calls the tool instead of looking at a static list.

### 3. Remove the hardcoded "DOCUMENT TYPE CODES (ZV discipline)" section

Delete or replace the static list at lines 9123-9124 with a note: "Document type codes are resolved dynamically — always call resolve_document_type. Do NOT use any hardcoded code mappings."

### 4. Fix the "FINDING A SPECIFIC DOCUMENT" section

Replace lines 9326-9331. Currently says:
> "Look up the document type name in the DOCUMENT TYPE CODE REFERENCE at the end of this prompt"

Replace with:
> "1. Call resolve_document_type with the EXACT text the user used
> 2. Use the returned code as document_type in search_assai_documents
> 3. Present results with document number, title, revision, status
> 4. If user asks to read/summarise, use read_assai_document"

### 5. Add "Document Intelligence Reasoning" section to Selma's prompt

Add a new section teaching Selma HOW to think about documents:

**Document Search Strategy:**
- When user mentions a document type name/acronym + a project/unit → call resolve_document_type first, then search_assai_documents with the code AND the unit pattern
- When user asks "find the BfD for DP300" → resolve "BfD" → get code 7704 → search with document_type=7704 AND document_number_pattern=6529-%-%-%-U40300-%
- When user asks about document content → first search to find the document number, then call read_assai_document
- When combining filters: project + vendor + type = most specific search possible

**Document Content Understanding:**
- After reading a document with read_assai_document, provide contextual analysis: is this document fit for handover? What's missing? What are the critical specs?
- Relate document content to the document type: a BfD should contain design basis parameters; an ITP should contain inspection hold points; an IOM should contain operating procedures
- Flag discrepancies: if a document claims AFU status but has open comments, flag it

### 6. Add the document resolution instructions to Bob's prompt for routing

Bob (copilot) sometimes handles document questions before routing to Selma. Ensure the resolve_document_type instructions in Bob's prompt (already there at lines 702-750) also include a note: "If you detect this is a document query, route to Selma (document_agent) who has the full Assai knowledge base. Pass through the user's exact query."

### Files Modified
- `supabase/functions/ai-chat/index.ts` — AGENT_CAPABILITIES, DOCUMENT_AGENT_PROMPT, hardcoded doc type removal, search strategy instructions
- Redeploy ai-chat edge function

