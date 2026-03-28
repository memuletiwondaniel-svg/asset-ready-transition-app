

## Fix: Non-Clickable Follow-ups & Unit/Project Confusion

### Problem 1: Follow-up suggestions render as plain text bullets

The structured response builder (PART 1, line 9858) correctly generates clickable follow-up pills, but it only triggers when `lastToolName === 'search_assai_documents'`. When the AI calls additional tools after the search (e.g., `resolve_document_type` in a later iteration), `lastToolName` gets overwritten, so PART 1 never fires. The AI then formats its own free-text markdown response with plain bullet suggestions.

**Fix**: Track `search_assai_documents` results separately so they aren't lost when subsequent tools run.

### Problem 2: Bob confuses Unit codes with Project IDs

The system prompt (line 734-738) explicitly tells Bob that `DP300 = U40300`, treating the Project ID as a unit code alias. This is incorrect:
- **DP300** (or DP-300) = Project ID, resolves to project code `6529` via `dms_projects`
- **U40300** = Unit code for "Compression" — a completely different concept from `dms_units`

Bob then displays "Unit: U40300 (DP300)" which conflates two distinct DMS concepts.

---

### Implementation — `supabase/functions/ai-chat/index.ts`

#### Change 1: Persist search tool results across iterations

Around line 9796 where `lastToolName = toolName`, also track the search result separately:

```ts
// After line 9797
if (toolName === 'search_assai_documents' && toolResult?.found && toolResult?.total_found > 0) {
  searchToolResult = toolResult;
}
```

Initialize `searchToolResult` alongside other state variables (line ~9484):
```ts
let searchToolResult: any = null;
```

Then update the PART 1 condition (line 9858) to use either:
```ts
if (searchToolResult && searchToolResult.found && searchToolResult.total_found > 0) {
  // Use searchToolResult instead of lastToolResult throughout PART 1
```

This ensures the structured response is always built when a search returned results, even if the AI made additional tool calls afterward.

#### Change 2: Fix the DP-to-Unit mapping in the system prompt

Replace lines 734-738:

**Before:**
```
PLANT/UNIT CODE MAPPING (use when user mentions DP numbers or plant areas):
DP300 = U40300, DP200 = U40200, DP100 = U40100, DP400 = U40400, DP500 = U40500.
When the user mentions a DP number, map it to the unit code and include it in the document_number_pattern for precision.
Example: "Find the BfD for DP300" → look up BfD code from the reference table, use document_number_pattern="6529-%-%-%-U40300-%"
If you don't know the DP-to-unit mapping, ask the user to clarify.
```

**After:**
```
PROJECT ID vs UNIT CODE — CRITICAL DISTINCTION:
- "DP300" (or "DP-300" or "DP 300") is a PROJECT ID. It resolves to a project CODE (e.g., 6529) via the dms_projects table (project_id column). It is NOT a unit code.
- Unit codes (e.g., U40300 = Compression, U11000 = Acid Gas Removal) are process unit identifiers from the dms_units table. They occupy segment 5 of the document number.
- These are completely independent concepts. Never equate a DP number to a unit code.
When the user mentions a DP number (e.g., "documents for DP300"), resolve it to the project code via dms_projects and use that as the project prefix in the document_number_pattern (e.g., "6529-%").
When the user mentions a unit or system (e.g., "HVAC", "Compression"), look up the unit code from dms_units and include it in segment 5 of the pattern (e.g., "6529-%-%-%-U40300-%").
```

Also fix line 9100 to be more descriptive:
```
5. Unit code (U40300 = Compression — from dms_units table. NOT a project ID)
```

#### Change 3: Enrich structured response document object with vendor/unit metadata

The `document` object in the structured response only has `document_number`, `title`, `revision`, `status`. When a single document is found, Bob tries to add vendor/unit info via free text. Instead, extract these from the document number segments and include them in the structured response:

In the PART 1 builder, when `filteredDocList.length === 1`, parse the document number to extract originator code and unit code. Add optional `vendor` and `unit` fields to the structured response.

Update `StructuredResponseData` interface in `StructuredResponse.tsx` to include optional `vendor` and `unit` in the `document` object, and render them as bullet points in the document header card.

---

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | (1) Track search results separately so PART 1 always fires. (2) Fix DP/Unit confusion in system prompt. (3) Add vendor/unit to structured response for single-doc results. |
| `src/components/bob/StructuredResponse.tsx` | Add optional `vendor` and `unit` fields to document header card rendering. |

