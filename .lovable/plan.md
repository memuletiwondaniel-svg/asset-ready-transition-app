

# Diagnostic: Why "Read and Analyze" Failed Again

## What happened in the screenshot

1. **Who responded**: Selma responded (routed correctly via regex matching "bfd"). The "B" icon is by design — all agents use Bob's visual identity.

2. **Why no links**: Selma skipped the mandatory 3-turn flow. Instead of doing Turn 1 (search → present metadata with links → wait for confirmation), she called `read_assai_document` directly. When the download failed, the tool returned `content_available: false` with metadata but no project cabinet info for links. Selma then presented a failure message without Open/Download links because she never ran `search_assai_documents` (which returns the project context needed for links).

3. **Why the download failed**: This screenshot may be from before the cabinet fix was deployed — OR the cabinet fix is working but there's still an auth/session issue with the REST download endpoint. The `dms_projects` table confirms only `BGC_PROJ` and `ISG` exist as cabinets, so the fix is correct.

4. **Why pills aren't clickable**: The response shows "Alternative approaches" as bold text, not `<follow_ups>` JSON tags.

## Root cause

The 3-turn flow is prompt-instructed but **not enforced architecturally**. The LLM can still call `read_assai_document` on Turn 1, skipping the search-and-confirm step. When it does and the download fails, there's no project context to build links.

## Fix (3 changes)

### 1. Add `read_assai_document` gate in the handler (`handlers.ts`)
When `read_assai_document` returns `content_available: false`, include the Open in Assai and Download links in the response using the cabinet that was attempted. This way, even when download fails, the user gets actionable links.

```
Lines 759-767: When returning failure, add:
  assai_open_link: `https://eu.assaicloud.com/AWeu578/get/details/${bestCabinet}/DOCS/${docNumber}`
  assai_download_link: `https://eu.assaicloud.com/AWeu578/get/download/${bestCabinet}/DOCS/${docNumber}`
```

### 2. Strengthen the prompt to prevent direct `read_assai_document` calls (`prompt.ts`)
Add to Section F, Turn 2:
```
CRITICAL: You MUST NOT call read_assai_document on the same turn the user first asks to read/analyze.
Always search first (Turn 1), present results with links, and wait for confirmation (Turn 2) before calling read_assai_document.
```

### 3. Add links to failure responses in the prompt (`prompt.ts`)
Add instruction that when `read_assai_document` returns `content_available: false`, Selma MUST still include the Open in Assai and Download links from the tool result, and emit `<follow_ups>` tags (not bold text).

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/selma/handlers.ts` | Include `assai_open_link` and `assai_download_link` in all `read_assai_document` responses (success and failure) |
| `supabase/functions/_shared/selma/prompt.ts` | Strengthen Turn 1 gate: forbid calling `read_assai_document` without prior search. Add instruction to always show links from tool result even on failure. |

