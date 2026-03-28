

## Plan: Fix Document Reading, Cross-Discipline Search Bias, and File Upload

### 6 Changes in Order

---

### 1. Fix dangling variable crash + download hardening (`read_assai_document`)

**File**: `supabase/functions/ai-chat/index.ts`

**Line 6870**: Replace `docProjectCode` and `selectedProjectCodes` with literal strings:
```
console.error(`read_assai_document: pk_seq_nr="${pkSeqNr}" entt_seq_nr="${enttSeqNr}" — document not found in Assai (All projects scope)`);
```
**Line 6874**: Fix reason string similarly.

**Line 6895**: Reduce timeout from 25000 to 15000.

**Line 6940**: Update timeout message from "25s" to "15s".

**Lines 6921-6937**: After reading bytes, add HTML error page detection — check if first bytes start with `<` (0x3C) or match `<!DOCTYPE` or `<html` and return `content_available: false` with "Assai returned an error page instead of the document file" before attempting base64 conversion.

---

### 2. Cross-discipline auto-combine in `resolve_document_type`

**File**: `supabase/functions/ai-chat/index.ts`

**Lines 7025-7051** (acronym match single-result branch): After fetching `typeDetails`, add a cross-discipline query to `dms_document_types` using `ilike('document_name', '%<full_name>%')`. Collect all matching codes into a Set, combine with `+`, return combined instruction.

**Lines 7071-7091** (fullNameMatch single-result branch): Same cross-discipline auto-combine logic.

**ZV bias confirmation**: Line 7285 (`discipline_code === 'ZV'`) only triggers when the user explicitly passes `discipline_code='ZV'`. All other ZV references in the file are documentation/examples in prompt strings. No default ZV filter exists — the bias was caused solely by `resolve_document_type` returning a single vendor code.

---

### 3. File upload — frontend (`ORSHChatDialog.tsx`)

**File**: `src/components/widgets/ORSHChatDialog.tsx`

**handleSend (lines 436-458)**: Before `uploadFilesToStorage`, check if the first attached file is a document (PDF/image). If so:
- Validate size (reject >10MB with toast)
- Validate type (accept only `application/pdf`, `image/png`, `image/jpeg`, `image/webp`; reject others with toast)
- Read as base64 via `FileReader`
- Store as `filePayload: { file_data, file_name, file_type }`
- Skip `uploadFilesToStorage` for this file
- Clear `attachedFiles`

**User message (lines 460-466)**: Set `content` to user's text only (no `documentTexts` appended). Add `fileNames` from `filePayload` so the UI shows the attachment chip.

**API call (lines 486-493)**: Add `file_data`, `file_name`, `file_type` to the JSON body.

**Message interface (line 87)**: No change needed — `fileNames` already exists.

**Display (lines 1154-1169)**: Already renders `📄 filename` chip via `FileText` icon — works as-is. The key fix is ensuring `documentTexts` (raw text) is never appended to `content` for document files sent via base64.

---

### 4. File upload — edge function handler

**File**: `supabase/functions/ai-chat/index.ts`

**Line 9050**: Destructure `file_data`, `file_name`, `file_type` from request body.

**After line 9067** (before personalization context loading): Add early-return block:
```typescript
if (file_data && file_name) {
  // Direct file analysis — bypass entire Assai tool loop
  const mediaType = file_type || 'application/pdf';
  const userText = messages.filter(m => m.role === 'user').pop()?.content || 'Analyze this document';
  const analysisPrompt = "A document has been directly uploaded..."; // full prompt from plan
  
  // SSE streaming call to Claude with document content block
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: analysisPrompt,
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: mediaType, data: file_data } },
        { type: "text", text: userText }
      ]}],
      stream: true,
    }),
  });
  
  // Stream SSE response back (same pattern as main loop)
  // Transform Anthropic SSE to OpenAI-compatible SSE format
  return new Response(streamBody, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}
```

This block is placed BEFORE the agent loop initialization (line 9700), ensuring no tools are initialized.

---

### 5. System prompt updates

**File**: `supabase/functions/ai-chat/index.ts`

Add to DOCUMENT_AGENT_PROMPT (after search escalation protocol):
```
PARALLEL SEARCH STRATEGY (CRITICAL):
When searching for a named document (e.g., "Process Safety Design Basis"):
1. ALWAYS run a title/keyword search IN PARALLEL with the type-code search
2. Pass the key phrase in the 'title' parameter of search_assai_documents
3. Do NOT give up after type-code search alone
```

---

### 6. Deploy edge function

Deploy `ai-chat` after all changes.

---

### Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | Fix dangling vars; reduce timeout; add HTML guard; cross-discipline auto-combine; file upload handler with SSE streaming; prompt updates |
| `src/components/widgets/ORSHChatDialog.tsx` | File size/type validation; base64 reading; clean message content; send file_data in API body |

### Implementation Order
1. Fix dangling variable crash + download hardening
2. Cross-discipline auto-combine in `resolve_document_type`
3. File upload frontend (validation + base64 + clean display)
4. File upload edge function handler (early return + SSE streaming)
5. System prompt title-search strategy update
6. Deploy edge function

