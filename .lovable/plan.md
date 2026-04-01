

# Fix Selma's "Read and Analyze" — Root Cause and 2-Step Redesign

## The Problem (Why Downloads Always Fail)

The `read_assai_document` handler fetches project codes from `dms_projects.code` (values like `0000`, `1001`, `3101`) and uses them in the download URL: `/get/download/{code}/DOCS/{doc_number}`. But the URL expects the **cabinet name** (`BGC_PROJ`, `BGC_OPS`, `ISG`), not the numeric project code. Every single attempt returns 404. The hardcoded fallback `['BGC_PROJ', 'BGC_OPS', 'ISG']` is never reached because the DB query returns 30+ rows.

## The Solution (Two Parts)

### Part 1: Fix the Download — Use Cabinets, Not Codes

**File: `supabase/functions/_shared/selma/handlers.ts`** (lines 559-571)

Replace the project code lookup with distinct **cabinet** values from `dms_projects`:

```sql
SELECT DISTINCT cabinet FROM dms_projects WHERE is_active = true
```

This returns `['BGC_PROJ', 'ISG']` — the exact values the download URL expects. Keep `['BGC_PROJ', 'BGC_OPS', 'ISG']` as fallback. Also prioritize the cabinet that matches the document's originator (e.g., doc starting with `6529-BGC-...` → try `BGC_PROJ` first).

### Part 2: Redesign as a 3-Turn Conversational Flow

Instead of Selma attempting search → download → analyze all in one tool call (which times out and fails silently), split into a **confirm-before-download** pattern:

**Step 1 — User asks to read/analyze a document**
Selma searches for the document using `search_assai_documents` and presents metadata with:
- Document Number, Title, Revision, Status, Discipline
- 📂 Open in Assai link
- ⬇️ Download link
- Suggestion pill: **"Read and analyze this document"**

**Step 2 — User confirms**
Only then does Selma call `read_assai_document` to download and analyze.

**Step 3 — Selma reports analysis**
Returns the Claude analysis with follow-up pills like **"Extract tag list"** or **"Check revision completeness"**.

This is already partially instructed in the prompt (Section F), but the `read_assai_document` tool itself still does everything in one giant pipeline. The fix:

**a) Prompt update** (`supabase/functions/_shared/selma/prompt.ts`):
- Strengthen Section F to make the 2-step mandatory and explicit
- Add instruction that on confirmation, Selma should call `read_assai_document` with the confirmed document number
- Add instruction to include actionable suggestion pills at each step

**b) Handler fix** (`supabase/functions/_shared/selma/handlers.ts`):
- Lines 559-571: Replace `dms_projects.code` lookup with `SELECT DISTINCT cabinet FROM dms_projects WHERE is_active = true`
- Prioritize cabinet based on document originator extracted from the document number
- Keep existing REST + legacy fallback flow, just with correct project scope values

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/selma/handlers.ts` | Fix project scope: use `cabinet` column instead of `code`; prioritize by doc originator |
| `supabase/functions/_shared/selma/prompt.ts` | Strengthen 3-turn flow instructions with explicit pill suggestions at each step |

### Expected Outcome
- Downloads will use correct URLs like `/get/download/BGC_PROJ/DOCS/6529-BGC-...` instead of `/get/download/1001/DOCS/...`
- Users get fast metadata confirmation before any download attempt
- Timeouts eliminated by splitting the pipeline across conversation turns

