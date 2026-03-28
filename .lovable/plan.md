

## Plan: Fix 5 Critical Failures — Dynamic Project Resolution

### Summary of Root Causes

1. **Sync returns 0 projects**: `row[17]` (project code column) is empty in most Assai rows. Also, `onConflict: 'code'` fails because `dms_projects.code` has no UNIQUE constraint (duplicates exist across cabinets).

2. **`read_assai_document` can't find documents**: `authenticateAssai(baseUrl, ...)` is called with `baseUrl = 'https://eu.assaicloud.com'` (line 6667) — missing the `/AWeu578` instance path. All subsequent URLs (`search.aweb`, `result.aweb`, `download.aweb`) hit the wrong endpoint. Compare with `search_assai_documents` which correctly uses `assaiBase = baseUrl + instancePath`.

3. **`search_assai_documents` hardcodes project 59734**: Lines 7284-7285 hardcode `projSeqNr = '59734'` and `projectCabinet = 'BGC_PROJ'`. Cross-project searches always return DP300 results. The `fetchResultPage` and `executeFilteredSearch` helpers don't set `proj_seq_nr` explicitly — they rely on hidden fields from `initSearch`, which only carry the server's default project context.

4. **System prompts hardcode 59734**: Lines 9172, 9211, 9261 tell the AI that `proj_seq_nr=59734` is required for all searches.

5. **Bob asks user for project code**: No instruction in `BOB_SYSTEM_PROMPT` to auto-resolve DP numbers.

---

### Fix 1 — Migration: Add composite unique constraint

New migration SQL:
```sql
ALTER TABLE public.dms_projects 
  ADD CONSTRAINT dms_projects_code_cabinet_unique UNIQUE (code, cabinet);
```

This enables upserts with `onConflict: 'code,cabinet'`. Existing duplicates (same code, different cabinets) are preserved correctly.

---

### Fix 2 — `sync-assai-projects`: Extract project code from document number

**File**: `supabase/functions/sync-assai-projects/index.ts`

Changes in the extraction loop (lines 244-261):
- Replace `stripHtml(row[17])` with `stripHtml(row[3]).split('-')[0]` — extract project code from the first segment of the document number (e.g., `6529` from `6529-ABBE-C017-...`)
- Use composite key for the Map: `projectCode + '|' + cabinet`
- Update upsert (line 295) to use `onConflict: 'code,cabinet'`

---

### Fix 3 — `read_assai_document`: Fix URL construction

**File**: `supabase/functions/ai-chat/index.ts`

The critical bug: line 6667 passes `baseUrl` (no instance path) to `authenticateAssai`, and all subsequent URLs use `baseUrl + '/search.aweb'` etc.

Changes:
- After line 6642 (`baseUrl` assignment), add:
  ```typescript
  const dbName = creds.db_name || 'eu578';
  const assaiBase = baseUrl + '/AW' + dbName;
  ```
- Line 6667: Change `authenticateAssai(baseUrl, ...)` to `authenticateAssai(assaiBase, ...)`
- Lines 6736, 6785, 6791, 6830, 6848, 6874, 6880, 6936: Replace all `baseUrl + '/...'` with `assaiBase + '/...'`
- Line 6757: Change `onConflict: 'code'` to `onConflict: 'code,cabinet'` and include cabinet in the upsert

---

### Fix 4 — `search_assai_documents`: Dynamic project resolution

**File**: `supabase/functions/ai-chat/index.ts`, lines 7282-7285

Replace hardcoded values with 3-tier fallback:

```typescript
// Extract project code from search pattern
const patternProjectCode = document_number_pattern.split('-')[0].replace(/%/g, '');
let projSeqNr = '59734'; // tier 3 fallback
let projectCabinet = 'BGC_PROJ';

// Tier 1: DB lookup
if (patternProjectCode && /^\d{4}$/.test(patternProjectCode)) {
  const { data: projLookup } = await supabaseClient
    .from('dms_projects')
    .select('cabinet, proj_seq_nr')
    .eq('code', patternProjectCode)
    .not('proj_seq_nr', 'is', null)
    .limit(1);
  if (projLookup?.[0]?.proj_seq_nr) {
    projSeqNr = projLookup[0].proj_seq_nr;
    projectCabinet = projLookup[0].cabinet || 'BGC_PROJ';
  }
}
```

Then inject `proj_seq_nr` and `selected_project_codes` into the search flow:
- In `fetchResultPage`: add `formData.set('proj_seq_nr', projSeqNr)` and `formData.set('selected_project_codes', projectCabinet)` after the hidden fields are set
- In `executeFilteredSearch`: same two lines added
- Tier 2 (initSearch hidden fields) is implicit — the server returns `proj_seq_nr` in hidden fields, but we override it explicitly now

---

### Fix 5 — System prompt updates

**File**: `supabase/functions/ai-chat/index.ts`

- Line 9172: Change `proj_seq_nr: 59734 (internal ID — required in all search POSTs)` → `proj_seq_nr: resolved dynamically per project from dms_projects table. Do not hardcode.`
- Line 9211: Change `All searches also require: proj_seq_nr=59734, start_row=1` → `All searches also require: proj_seq_nr (resolved dynamically), start_row=1`
- Line 9261: Change `[36] = proj_seq_nr (59734)` → `[36] = proj_seq_nr (dynamic)`
- Add to `BOB_SYSTEM_PROMPT` (after line 304, META-COGNITION section):
  ```
  PROJECT CODE RESOLUTION (CRITICAL):
  NEVER ask the user for a project code or proj_seq_nr. When a user mentions a project
  by DP number (e.g. DP223, DP300), resolve it to a project code automatically using
  the dms_projects table (e.g. DP-223 → code 6523, DP-300 → code 6529). If resolution
  fails, report the failure — never ask the user to look it up.
  ```

---

### Files changed

| File | Changes |
|------|---------|
| New migration SQL | Add `UNIQUE(code, cabinet)` constraint |
| `sync-assai-projects/index.ts` | Extract project code from `row[3]` first segment; composite upsert key |
| `ai-chat/index.ts` | Fix `read_assai_document` URL construction; add dynamic `proj_seq_nr` to `search_assai_documents` + helpers; update system prompts |

### Implementation order
1. Migration (composite unique constraint)
2. Fix `sync-assai-projects` (column extraction + upsert)
3. Fix `read_assai_document` (URL construction + upsert conflict key)
4. Fix `search_assai_documents` (dynamic resolution in main flow + helpers)
5. Update system prompts
6. Deploy both edge functions

