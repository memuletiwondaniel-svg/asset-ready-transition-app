

## Fix: Multi-Strategy Intelligent Search for Selma

### Root Cause

Two structural problems prevent Selma from finding the Cathodic Protection IOM:

1. **No title search capability.** The `search_assai_documents` tool only accepts `document_number_pattern`, `discipline_code`, `document_type`, `status_code`, and `company_code`. There is no `title` parameter. Assai's search form has a `title` text field (line 7421 confirms "title uses contains search automatically"), but the tool never populates it. Selma literally cannot search by document title keywords like "Cathodic".

2. **Give-up-on-first-failure prompt.** The system prompt (line 9404) tells Selma: "I searched Assai but found no matching documents. Would you like me to try a broader search?" — asking the user instead of autonomously retrying. There is no instruction to try alternative strategies (broader pattern, title search, different project codes, both modules).

### The user's expected behavior

For "IOM of the Cathodic Protection System in DP223":
- Strategy 1: Resolve IOM → J01, resolve DP223 → 6523, search `document_type=J01, pattern=6523-%` → get all IOMs for that project
- Strategy 2: If too many results, filter by title containing "Cathodic" 
- Strategy 3: If 0 results, broaden to `6523-%` without type filter, search title "Cathodic"
- Strategy 4: Try related project codes (6530) or both DES_DOC and SUP_DOC modules

### Implementation — single file: `supabase/functions/ai-chat/index.ts`

#### Change 1: Add `title` parameter to `search_assai_documents` tool definition (~line 3143)

Add a new optional parameter:
```
title: {
  type: "string",
  description: 'Filter by document title keywords (contains search). Use to narrow results by subject, e.g. "Cathodic", "HVAC", "Compressor". Assai performs automatic contains matching.'
}
```

#### Change 2: Wire `title` into the form submission (~line 7198-7211)

In `fetchResultPage`, extract `title` from args and set it on the form:
```ts
const { document_number_pattern, discipline_code, document_type, status_code, company_code, title } = args;
// ... in fetchResultPage:
if (title) formData.set('title', title);
```

#### Change 3: Add Multi-Strategy Search Protocol to both Bob and Selma system prompts

Replace the "give up" error handling (lines 742, 9404) with a mandatory retry protocol:

```
MULTI-STRATEGY SEARCH PROTOCOL (MANDATORY — NEVER give up after one search):
When a document query returns 0 results, you MUST try at least 3 strategies before telling the user nothing was found:

Strategy 1 (Precise): Resolve doc type + project code → search with both filters
Strategy 2 (Title keyword): Keep project code, drop doc type filter, add title= with subject keywords from the query (e.g. "Cathodic", "HVAC", "Compressor")
Strategy 3 (Broader type): Keep doc type, use broader project pattern (e.g. just the first 4 digits "6523-%") 
Strategy 4 (Cross-module): Repeat Strategy 1-2 in the OTHER module (if you searched DES_DOC, try SUP_DOC and vice versa)
Strategy 5 (Related projects): If the user said DP223, also try adjacent project codes from dms_projects

When results ARE found but numerous (>10), use the title parameter to filter by subject keywords extracted from the user's query.

NEVER ask "Would you like me to try a broader search?" — just DO IT automatically. Only report failure after exhausting all strategies.
```

#### Change 4: Update the deterministic fallback (line 9645-9650) to also try title-based search

After the initial `searchResult` returns 0, add a second attempt using title keywords:
```ts
if (!searchResult?.found || searchResult.total_found === 0) {
  // Extract subject keywords from user message
  const subjectWords = extraTerms.filter(w => !['IOM','BFD','ITP','DOCUMENT','DRAWING'].includes(w));
  if (subjectWords.length > 0) {
    const titleSearchArgs: any = { document_number_pattern: projectPattern || '6523-%', title: subjectWords.join(' ') };
    searchResult = await executeTool('search_assai_documents', titleSearchArgs, supabase);
  }
}
```

### Summary of changes

| Location | What |
|----------|------|
| Tool definition (line 3143) | Add `title` parameter |
| `fetchResultPage` (line 7198) | Wire `title` into Assai form POST |
| Bob prompt (line 742) | Replace "ask user" with multi-strategy protocol |
| Selma prompt (line 9404) | Replace "ask user" with multi-strategy protocol |
| Deterministic fallback (line 9645) | Add title-keyword retry when first search returns 0 |

All changes in `supabase/functions/ai-chat/index.ts`. After deploy, applies to all users permanently.

