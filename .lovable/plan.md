

## Plan: Use Assai's Native "All Projects" Search

### Key Insight

The `sync-assai-projects` function already uses `selected_project_codes=""` and `proj_seq_nr=""` (empty strings) to search across all cabinets — and it works (returns 300 rows across BGC_OPS, BGC_PROJ, ISG). The same approach should be applied to `search_assai_documents` and `read_assai_document`.

### What Changes

**Simplification**: Remove the dynamic `proj_seq_nr` / `projectCabinet` resolution logic entirely. Instead, let Assai's server-side hidden fields handle project scoping (which defaults to "All projects" when not overridden), or explicitly set both to empty strings.

---

### Fix 1 — `search_assai_documents`: Use "All projects" default

**File**: `supabase/functions/ai-chat/index.ts`

**Remove** (lines 7290-7314): The entire dynamic project resolution block (DB lookup, patternProjectCode extraction, projSeqNr/projectCabinet variables).

**Replace** with:
```typescript
// Use "All projects" scope — Assai searches across BGC_OPS, BGC_PROJ, ISG
// Document number pattern (e.g. 6523-%) already scopes results to the correct project
```

**Update `fetchResultPage`** (line 7413-7414): Remove the two explicit override lines:
```typescript
// REMOVE: formData.set('proj_seq_nr', projSeqNr);
// REMOVE: formData.set('selected_project_codes', projectCabinet);
```
Instead, do NOT override these fields — let the hidden fields from `initSearch` pass through as-is (server default = "All projects").

**Update sub-query helper** (lines 7559-7561): Same removal — stop overriding `proj_seq_nr` and `selected_project_codes`.

### Fix 2 — `read_assai_document`: Use "All projects" default

**File**: `supabase/functions/ai-chat/index.ts`

**Remove** (lines 6694-6718): The entire project resolution block (DB lookup for projSeqNr/selectedProjectCodes).

**Remove** (lines 6752-6767): The `initSearch` proj_seq_nr extraction and cache-back logic.

**Update search POST** (lines 6787-6788): Remove the explicit overrides:
```typescript
// REMOVE: searchParams.set('proj_seq_nr', projSeqNr);
// REMOVE: searchParams.set('selected_project_codes', selectedProjectCodes);
```
Let hidden fields from `initSearch` pass through (server default = "All projects").

**Same for SUP_DOC fallback searches** (lines 6850-6851, 6876-6877): Remove the overrides there too.

### Fix 3 — System prompt updates

**File**: `supabase/functions/ai-chat/index.ts`

- Line 9246: Change to `All searches use "All projects" scope by default. The document number pattern scopes results to the correct project. Do not set proj_seq_nr or selected_project_codes manually.`
- Keep the "NEVER ask user for project code" rule already added.

### Fix 4 — No changes needed to `sync-assai-projects`

It already uses `selected_project_codes=""` and `proj_seq_nr=""` — this is the correct "All projects" behavior.

---

### Files changed

| File | Changes |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | Remove dynamic proj_seq_nr resolution from both `read_assai_document` and `search_assai_documents`; stop overriding `proj_seq_nr` and `selected_project_codes` in all POST form data; update system prompts |

### Implementation order
1. Remove proj_seq_nr/cabinet resolution from `search_assai_documents`
2. Remove proj_seq_nr/cabinet overrides from `fetchResultPage` and sub-query helper
3. Remove proj_seq_nr/cabinet resolution from `read_assai_document`
4. Remove proj_seq_nr/cabinet overrides from read_assai_document POST calls
5. Update system prompts
6. Deploy edge function

