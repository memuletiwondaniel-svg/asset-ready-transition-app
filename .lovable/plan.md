

# Intelligent Context-Aware Follow-Up Pills

## Problem

The follow-up pills are generated using generic templates like `"Read and interpret the most relevant ${subjectLabel} document"` — which produces awkward suggestions like "Read and interpret the most relevant PES document" even when the user may not know what PES means, or when reading isn't the logical next step for that document type.

The root cause: follow-ups are built from `subjectLabel` and simple conditionals without understanding **what kind of document was found** and **what actions make sense for that type**.

## Solution

Create a **document-type-aware follow-up generator** that maps document categories to meaningful, contextual actions a user would actually want to take.

### Step 1: Build a follow-up intelligence map

**File**: `supabase/functions/ai-chat/index.ts`

Create a `FOLLOWUP_TEMPLATES` lookup keyed by document type category that returns contextually relevant suggestions:

```
Safety docs (HAZOP, SIL, HAC, HEMP) → "Review safety findings", "Check if actions are closed out", "Compare with previous revision"
Specifications (PES, MDS, EDS) → "Extract key design parameters", "Check approval status", "Compare with vendor datasheet"
Drawings (P&ID, SLD, GA, PFD, UFD) → "Check revision history", "Show related drawings for this unit", "Verify approval status"
Test reports (FAT, SAT, PTR) → "Review test results and pass/fail", "Check outstanding punch items", "Show commissioning status"
Vendor docs (MR, VDR, TBE) → "Show vendor submission status", "Check which are still pending review", "List overdue submissions"
IOMs / Manuals (J01) → "Extract maintenance schedule", "Show startup/shutdown procedures", "Check for newer revision"
Transmittals → "Show all documents in this transmittal", "Check acknowledgement status"
```

### Step 2: Replace hardcoded follow-up generation in all 4 code paths

Update the follow-up generation in these locations:
1. **Specific query path** (~line 11332): Replace `"Read and interpret the most relevant ${p1SubjectLabel} document"` with type-aware suggestions
2. **Broad query path** (~line 11375): Replace generic "Filter by discipline" with contextual actions
3. **Deterministic fallback path** (~line 10878): Replace `"Read and interpret the most relevant ${subjectLabel} document"` with intelligent suggestions
4. **Analytical path** (~line 10769 & 11288): Replace static "Show all pending review documents" with query-relevant options

### Step 3: Add a `generateContextualFollowups()` function

A single function that takes:
- `docTypeCode` (e.g., "J01", "G01", "A90")
- `docTypeName` (e.g., "IOM", "P&ID", "HAZOP Report")
- `subjectLabel` (e.g., "HVAC", "Compression")
- `resultStats` (count, statuses found, has multiple revisions, has pending)
- `userIntent` (retrieval / analytical / content)

Returns 3-4 specific, actionable pills. Examples:
- For 5 P&IDs found with mixed statuses → `["Show only approved P&IDs", "Read the latest revision P&ID", "Show related equipment datasheets"]`
- For vendor documents query → `["Show overdue vendor submissions", "Group by vendor/contractor", "Show only documents pending review"]`
- For a single HAZOP found → `["Read and summarize key findings", "Check if action items are closed", "Show related safety documents"]`

### Step 4: Improve the sanity filter on the frontend

**File**: `src/components/widgets/ORSHChatDialog.tsx`

Add additional filters to reject:
- Pills that repeat the exact query the user just asked
- Pills containing unexpanded acronyms without context (e.g., bare "PES" without explanation)
- Duplicate/near-duplicate pills (Levenshtein similarity > 0.8)

## Files Modified

| File | Changes |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | Add `generateContextualFollowups()` function with document-type templates; replace all 4 hardcoded follow-up generation blocks |
| `src/components/widgets/ORSHChatDialog.tsx` | Enhanced sanity filter for near-duplicates and echo detection |

