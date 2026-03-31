

# Fix: BfD Variant Handling + Zero-Result Template + Pill Filter

## Assessment

**FIX 1 (Column names)**: NOT needed. The code already uses the correct columns (`acronym`, `type_code`, `full_name`) in all queries against `dms_document_type_acronyms`. The `document_type_code`/`document_type_name` references are in the search result formatting object (line 12243), not in acronym table queries.

## Actual Fixes Required

### FIX A — Intercept regex: Add missing BfD variants (edge function, line 11181)

Add `basis of design|design basis` to the intercept regex so all four query forms are caught deterministically. Currently only `bfd|basis for design` is listed.

Also add to the `detectAgentDomain` regex at line 3842: add `basis of design|design basis`.

### FIX B — Keyword-based full_name matching (edge function, ~line 7365-7370)

The `ilike('full_name', '%Basis of Design%')` query fails when the user says "Basis for Design" (stored as "Basis of Design") or vice versa. Replace the exact substring match with keyword extraction:

1. Extract significant words from the query (strip prepositions: "of", "for", "the", "a", "an", "and", "in", "on")
2. If 2+ keywords remain, query with the first keyword via `ilike('full_name', '%Basis%')` then filter results in TypeScript to also contain the second keyword ("Design")
3. This handles all permutations: "Basis of Design", "Basis for Design", "Design Basis"

### FIX C — Zero-result template (edge function, lines 11271 and 11330)

Replace the generic "If no results, say so clearly" instruction in both system injection points with a structured template:

```
If no results were found, respond with exactly this structure:
- Opening: "I searched for [doc type] ([code]) for [project] in Assai but found no documents."
- **What I searched**: project code, document type with code, search pattern used
- **Why no results**: At least one sentence explaining the specific reason (e.g., "No documents with type code 7704 exist under project 6550 in Assai"). NEVER leave this empty.
- **This could mean**: 3-4 bullet points of possible reasons
- Follow-up suggestions via <follow_ups> tag
```

### FIX D — Pill sanity filter (frontend, ~line 1242)

Currently the minimum pill length is 5 characters. Strengthen:
- Increase minimum length from 5 to 15 characters
- Add a check: reject pills that start with a number or project code fragment (e.g., `33A`, `DP-`)
- Add a check: require first word to be a capital letter followed by a verb/question word pattern (What, Check, Search, Show, Find, Browse, View, Try, List, Read, Review, Compare)

### FIX E — Database seed (optional)

Insert "Basis for Design" as a second full_name variant for BFD in `dms_document_type_acronyms`. This is a belt-and-suspenders measure — Fix B already handles the mismatch, but having both variants in the DB improves direct lookups.

## Files Changed
1. `supabase/functions/ai-chat/index.ts` — intercept regex, keyword matching in resolve_document_type, zero-result template
2. `src/components/widgets/ORSHChatDialog.tsx` — pill sanity filter hardening
3. Database: INSERT into `dms_document_type_acronyms`

