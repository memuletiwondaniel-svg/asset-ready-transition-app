

## Problems to Fix

1. **API fails → Bob gives up instead of auto-retrying transparently**: The current retry is server-side only (one retry with 2s backoff). If that also fails, the user sees an error. Bob should auto-retry on the frontend too, with a "Give me a few more seconds..." message — no manual retry button needed.

2. **Deterministic fallback returns ALL J01 docs without relevance filtering**: When the user asks for "IOM of HVAC in DP300", the fallback dumps all 30 J01 documents. It should scan titles for HVAC-related keywords, surface the most relevant ones first, and explain "I didn't find a specific HVAC IOM, but here are the most relevant IOMs in DP300."

3. **Truncated titles have no tooltip**: Document numbers get tooltips on hover, but the Title column (which uses `line-clamp-2`) does not — truncated titles are unreadable.

4. **Follow-up suggestions are generic/static**: The deterministic fallback hardcodes follow-ups like "Show only approved documents" regardless of context. They should reflect the user's intent (e.g., for an HVAC IOM query: "Read the most relevant HVAC document", "Show all vendor IOMs for DP300").

## Changes

### 1. Frontend: Auto-retry with transparent "working on it" message (`src/components/widgets/ORSHChatDialog.tsx`)

When a stub/empty response is detected (line 529) OR a fetch error occurs (line 563):
- Instead of immediately showing an error, auto-retry the same request once
- Show a streaming message: "Give me a few more seconds while I pull and analyze the data..."
- Only show the error + Retry button if the auto-retry also fails
- Track retry state with a ref (`retryAttemptRef`) to prevent infinite loops

### 2. Backend: Add HVAC-aware relevance filtering to deterministic fallback (`supabase/functions/ai-chat/index.ts`)

In the deterministic fallback (lines 9640-9657), after getting search results:
- Extract subject keywords from the user message (e.g., "HVAC", "generator", "switchgear", "compressor")
- Score each document by checking if its title contains any of the subject keywords
- Split results into "relevant" (title matches subject) and "other"
- If relevant docs exist: show them first with summary "I found X IOM documents related to HVAC in DP300"
- If no relevant docs: say "I didn't find a specific IOM for HVAC in DP300, but found X other IOMs. The closest matches are:" and show all sorted by relevance
- Add HVAC-related keyword list: `['HVAC', 'AIR CONDITIONING', 'AIR HANDLING', 'AHU', 'COOLING', 'HEATING', 'VENTILATION', 'CHILLER', 'FAN COIL', 'DUCT']` plus extract any other nouns from the query

### 3. Frontend: Add tooltip on truncated titles (`src/components/bob/StructuredResponse.tsx`)

Wrap the title `<div>` in both document_list (line 374) and document_search table rows with a `Tooltip` that shows the full title on hover — same pattern as `DocumentNumberLink`.

### 4. Backend: Context-aware follow-ups for deterministic fallback (`supabase/functions/ai-chat/index.ts`)

Replace the hardcoded follow-up array (line 9653) with dynamic suggestions based on:
- The resolved document type and subject keyword
- Example for "IOM of HVAC in DP300":
  - "Read and summarise the most relevant HVAC document"
  - "Show IOMs for other units (DP100, DP200)"  
  - "Search for HVAC drawings or datasheets instead"
- Build these from the actual query parameters (resolvedCode, resolvedName, subject keyword, DP number)

### Summary

| File | Change |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | Relevance-filter results by subject keywords; generate context-aware follow-ups |
| `src/components/widgets/ORSHChatDialog.tsx` | Auto-retry on failure with "working on it" message before showing error |
| `src/components/bob/StructuredResponse.tsx` | Add tooltip on document titles for truncated text |

