

## Plan: Auto-populate `proj_seq_nr` from Assai

### Step 1 — Migration: Add `proj_seq_nr` column + seed DP300

New migration file:
```sql
ALTER TABLE public.dms_projects ADD COLUMN IF NOT EXISTS proj_seq_nr text;
UPDATE public.dms_projects SET proj_seq_nr = '59734' WHERE code = '6529';
```

### Step 2 — New edge function: `sync-assai-projects`

Create `supabase/functions/sync-assai-projects/index.ts`:
- Authenticates with Assai using `dms_sync_credentials` (reuses shared `loginAssai` from `_shared/assai-auth.ts`)
- After login, calls `label.aweb` GET to activate session
- Calls `search.aweb?subclass_type=DES_DOC` GET to get hidden form fields
- POSTs to `result.aweb` with `number=%` (wildcard) to get documents
- Extracts unique `(project_code, proj_seq_nr, project_name, cabinet)` tuples from myCells columns: `[17]` = project code, `[26]` = cabinet, `[27]` = project name, `[36]` = proj_seq_nr
- **Guard**: If zero valid rows returned, abort with error — do NOT upsert or touch `dms_projects`
- Upserts into `dms_projects` matching on `code` — updates `proj_seq_nr`, `project_name`, `cabinet`
- Returns `{ success, projects_synced, projects: [...] }`

### Step 3 — Update `read_assai_document` in `ai-chat/index.ts`

Current code (line ~6694) queries `dms_projects` for `cabinet` only — `proj_seq_nr` is not fetched.

Fix:
1. Add `proj_seq_nr` to the select: `.select('code, cabinet, proj_seq_nr')`
2. If `proj_seq_nr` is found, set it on search params: `searchParams.set('proj_seq_nr', projSeqNr)`
3. If `proj_seq_nr` is NULL/missing: call `initSearch` (GET `search.aweb`) to extract `proj_seq_nr` from hidden fields, then cache it back to `dms_projects` via upsert, then proceed
4. Fall back to hardcoded `59734` only if all else fails

Also: the current `read_assai_document` skips `search.aweb` initialization (unlike `search_assai_documents`). Add `initSearch` call before the result POST to get `form_id` and other hidden tokens — this matches the working search tool pattern and may fix the document-not-found issue.

### Step 4 — Integration Hub "Sync Projects" button

In `IntegrationHub.tsx`, add a "Sync Projects" button next to the existing "Sync Now" and "Test Connection" buttons (line ~1232). When clicked:
- Calls `sync-assai-projects` edge function
- Shows loading spinner with "Syncing..."
- On success: toast "X projects synced from Assai"
- On failure: toast error message
- New state: `syncingProjects` boolean

### Step 5 — Seeding

Migration seeds `6529 → 59734`. DP223 (`6523`) will be auto-discovered via:
- The sync button, OR
- The `read_assai_document` fallback (Step 3 initSearch)

### Column index verification note

The column mapping `[17]=project_code, [26]=cabinet, [27]=project_name, [36]=proj_seq_nr` is documented in the codebase at line 9148-9158 of `ai-chat/index.ts`. The `sync-assai-projects` function will log the full first row on each sync for verification. Both DES_DOC and SUP_DOC use the same column layout per the existing `parseDocuments` helper (line 7316-7331 uses the same indices for both).

### Files changed

| File | Changes |
|------|---------|
| New migration SQL | Add `proj_seq_nr` column, seed `6529→59734` |
| `supabase/functions/sync-assai-projects/index.ts` | New edge function |
| `supabase/functions/ai-chat/index.ts` | Fix `read_assai_document` to use `proj_seq_nr` + `initSearch` |
| `src/components/admin-tools/IntegrationHub.tsx` | Add "Sync Projects" button |

### Implementation order
1. Migration
2. Edge function (`sync-assai-projects`)
3. `read_assai_document` fix
4. Integration Hub button

