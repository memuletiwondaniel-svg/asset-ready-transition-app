

## Problem
Selma's system prompt only includes the **details** (open in Assai) link format but not the **download** link format. Users want Selma to provide both options when presenting document results.

## Current State
- `prompt.ts` line 47: only mentions `https://eu.assaicloud.com/AWeu578/get/details/BGC_PROJ/DOCS/{document_number}`
- No mention of the download URL pattern in the prompt
- The `assaiLinks.ts` helper already has both `assaiDetailsUrl` and `assaiDownloadUrl` functions, but only the frontend (`StructuredResponse.tsx`) uses them — Selma's LLM doesn't know about the download pattern

## Plan

### 1. Update Selma's system prompt (`supabase/functions/_shared/selma/prompt.ts`)

In the **RESPONSE FORMAT** section (around line 47), update the link format guidance to include both URL patterns:

```
- Assai details link: https://eu.assaicloud.com/AWeu578/get/details/{PROJECT}/DOCS/{document_number}
- Assai download link: https://eu.assaicloud.com/AWeu578/get/download/{PROJECT}/DOCS/{document_number}
- When showing document tables, include both "Open" and "Download" links
- Use the correct project code (BGC_PROJ, BGC_OPS, ISG) — not always BGC_PROJ
```

Also update the table columns line to:
```
- Table columns: Document Number | Title | Rev | Status | Open | Download
```

### 2. Redeploy the `ai-chat` edge function

Deploy to apply the updated prompt.

