

## Plan: Fix PEFS Search Bias, Assai Error Pages, and Strengthen Cross-Discipline Logic

### Root Cause Analysis

**Problem 1 — PEFS returns only vendor documents:**
"PEFS" is NOT in the `dms_document_type_acronyms` table at all. When the agent calls `resolve_document_type("PEFS")`, it finds no acronym match, then falls to Step 2 (name search) with `ilike('%PEFS%')`. Neither "Process Engineering Flow Sheets" (C01) nor "Process Engineering Flow Scheme" (2365) contains the literal string "PEFS", so the function returns "not found." The agent then guesses and picks C01 only.

**Problem 2 — Cross-discipline auto-combine doesn't work:**
Even when a code IS resolved, the cross-discipline query uses `ilike('%Process Engineering Flow Sheets%')` which does NOT match "Process Engineering Flow Scheme" (code 2365) because the names are different. The `ilike` match is too strict — it needs fuzzy/stem matching.

**Problem 3 — Assai error pages on SUP_DOC module:**
The `searchBothModules` fallback calls `initSearch` for `SUP_DOC`, but the Assai session may not support rapid context switches between modules. The error page `<!-- applet:error -->` indicates a server-side session conflict.

**Problem 4 — "Process Safety Design Basis" not found:**
The agent calls `resolve_document_type` which finds nothing, then searches with `6529-%-DP300-%` which also returns nothing because DP300 documents don't have "DP300" literally in their document numbers. The title-based search isn't being used effectively.

---

### Fix 1 — Add PEFS acronym to the database

Create a migration to insert "PEFS" into `dms_document_type_acronyms` with `type_code = 'C01'` and `full_name = 'Process Engineering Flow Sheets'`. This is the immediate fix so the acronym lookup works.

Also add common missing acronyms: "PID" / "P&ID", "PSDB" (Process Safety Design Basis) if applicable.

### Fix 2 — Fix cross-discipline auto-combine to use stem matching

**File**: `supabase/functions/ai-chat/index.ts`

The current cross-discipline query uses the full document name:
```
ilike('document_name', '%Process Engineering Flow Sheets%')
```
This misses "Process Engineering Flow Scheme" (2365).

**Fix**: Extract the stem (first 3-4 significant words) from the document name and use that for the cross-discipline query. For example, extract "Process Engineering Flow" from "Process Engineering Flow Sheets" and search with `ilike('%Process Engineering Flow%')`.

```typescript
// Extract stem: take words up to but not including the last word
const nameWords = typeDetails.document_name.split(/\s+/);
const stem = nameWords.length > 2 
  ? nameWords.slice(0, -1).join(' ')  // "Process Engineering Flow"
  : typeDetails.document_name;
const { data: crossMatches } = await supabaseClient
  .from('dms_document_types')
  .select('code, document_name, document_description, tier')
  .ilike('document_name', `%${stem}%`)
  .eq('is_active', true)
  .limit(5);
```

Apply this stem extraction in BOTH the acronym-match branch (line 7067) and the fullNameMatch branch (line 7136).

### Fix 3 — Fix name_search (Step 2) to also auto-combine

**File**: `supabase/functions/ai-chat/index.ts`, lines 7190-7205

Currently when `name_search` returns a single match, it returns just that one code WITHOUT cross-discipline auto-combine. Add the same stem-based cross-discipline logic here.

Also: when `name_search` returns 1 result, don't ask the user to confirm — just use it (same as acronym path).

### Fix 4 — Re-authenticate for SUP_DOC alt module search

**File**: `supabase/functions/ai-chat/index.ts`

The `searchBothModules` path reuses the same Assai session for both DES_DOC and SUP_DOC searches. Assai's server-side state is module-specific — switching modules within the same session causes error pages.

**Fix**: In the `searchBothModules` block (line 7716), re-authenticate before the alt module search. Call `authenticateAssai` again to get a fresh session, then use the new cookies for the SUP_DOC `initSearch`/`paginateSearch`.

Similarly fix `executeFilteredSearch` (line 7549) — it already calls its own `initSearch` but shares the same `cookieHeader`. Make it accept an optional cookie override, or re-authenticate per call when switching modules.

### Fix 5 — Add PEFS and related acronyms to the database

SQL migration:
```sql
INSERT INTO dms_document_type_acronyms (acronym, type_code, full_name, notes, is_learned)
VALUES 
  ('PEFS', 'C01', 'Process Engineering Flow Sheets', 'Also known as P&ID. BGC code 2365 covers the same concept.', false),
  ('PID', 'C01', 'Piping and Instrument Diagram', 'Vendor P&ID documents', false),
  ('P&ID', 'C01', 'Piping and Instrument Diagram', 'Vendor P&ID documents', false)
ON CONFLICT (acronym) DO NOTHING;
```

---

### Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | Stem-based cross-discipline matching in resolve_document_type (3 locations); re-authenticate for alt module search; fix name_search single-result auto-combine |
| Migration SQL | Insert PEFS, PID, P&ID acronyms |

### Implementation Order
1. Database migration — add PEFS/PID acronyms
2. Fix cross-discipline stem matching (3 locations in resolve_document_type)
3. Fix name_search single-result to auto-combine
4. Re-authenticate for SUP_DOC alt module search
5. Deploy edge function

