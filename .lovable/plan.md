

# Fix: Dead Code Extraction & Multi-Project Search

## Confirmed Root Cause

Lines 11214–11313 (the Specific Document Intercept) sit inside `callAnthropicWithRetry` (opens line 11183, closes line 11318). The 429 block closes at line 11212, then the intercept appears as unreachable code before the non-429 retry at line 11314. Additionally, the intercept is inside the `while` loop (starts line 11160) — it should be **before** it, alongside the vendor discovery intercept.

```text
11159:     }              ← end of vendor discovery intercept
11160:     while (iteration < MAX_ITERATIONS) {   ← main loop
...
11183:       const callAnthropicWithRetry = async () => {
11200:         const firstAttempt = await makeCall();
11201:         if (firstAttempt.ok) return firstAttempt;
11203:         if (firstAttempt.status === 429) { ... }
11212:     }              ← WRONG INDENTATION — closes 429 but looks like it closes something bigger
11214–11313:            ═══ DEAD INTERCEPT CODE ═══
11314:         // Non-429 retry
11318:       };             ← closes callAnthropicWithRetry
```

## Changes (all in `supabase/functions/ai-chat/index.ts`)

### Change 1: Extract intercept — move lines 11214–11313

Cut the entire `specificDocMatch` block (lines 11214–11313) and paste it **between line 11159 and line 11160** — after the vendor discovery intercept closes, before the `while` loop opens. All required variables (`lastUserText`, `conversationMessages`, `executeTool`, `supabaseClient`, `emitStatus`, `detectedAgent`, `DOCUMENT_AGENT_PROMPT`, `dmsConfigSnapshot`, `userContextPrompt`, `allToolCallNames`, `lastToolName`, `lastToolResult`, `searchToolResult`, `isVendorDiscoveryIntent`) are already in scope at that point since the vendor discovery intercept uses the same ones.

### Change 2: Fix `callAnthropicWithRetry` braces

After extraction, fix the 429 block closing brace (line 11212 — currently wrong indentation) and remove the gap. The function becomes:

```typescript
const callAnthropicWithRetry = async (): Promise<Response> => {
  const makeCall = () => fetch("https://api.anthropic.com/v1/messages", {
    // ... existing headers and body unchanged ...
  });
  const firstAttempt = await makeCall();
  if (firstAttempt.ok) return firstAttempt;
  if (firstAttempt.status === 429) {
    const timeLeft = MAX_LOOP_MS - (Date.now() - LOOP_START_TIME);
    if (timeLeft > 20000) {
      console.log(`Anthropic API returned 429, retrying in 10s (${timeLeft}ms remaining)...`);
      await new Promise(r => setTimeout(r, 10000));
      return makeCall();
    }
    return firstAttempt;
  }
  // Non-429 error — retry once after 2s
  console.log(`Anthropic API returned ${firstAttempt.status}, retrying in 2s...`);
  await new Promise(r => setTimeout(r, 2000));
  return makeCall();
};
```

Explicit brace count: 1 function open, 1 if-429 open/close, 1 if-timeLeft open/close, 1 function close = balanced.

### Change 3: Multi-project search in extracted intercept

Replace lines 11260–11265 (single-project logic taking only `projects[0]`) with a loop over all projects when `resolvedDocCode` is available:

```typescript
if (projectResult?.found && projectResult.projects?.length > 0) {
  if (resolvedDocCode && projectResult.projects.length > 1) {
    // Search ALL matching projects with doc type constraint
    let allResults = [];
    for (const proj of projectResult.projects) {
      const result = await executeTool('search_assai_documents', {
        document_type: resolvedDocCode,
        document_number_pattern: `${proj.project_code}-%`
      }, supabaseClient);
      if (result?.found && result.total_found > 0) {
        allResults.push({ project: proj, result });
      }
    }
    if (allResults.length > 0) {
      // Use first project with results
      resolvedProjectCode = allResults[0].project.project_code;
      resolvedProjectName = allResults[0].project.project_name;
      // Override searchResult downstream
    }
  } else {
    resolvedProjectCode = projectResult.projects[0].project_code;
    resolvedProjectName = projectResult.projects[0].project_name;
  }
}
```

### Change 4: Add retrieval-intent routing to `detectAgentDomain`

Insert after line 3848 (after Part 2 patterns), before the Fred/PSSR block:

```typescript
// Part 3: Retrieval intent combined with DP number reference
if (/(?:what\s+is|find|get|show|where)\s+.*\bdp[\s-]?\d+/i.test(lower)) {
  return 'document_agent';
}
```

### Change 5: Strengthen `DOCUMENT_AGENT_PROMPT`

Add after the existing opening paragraph (around line 10296), before the VENDOR DISCOVERY section:

- When query has both document type + project reference: resolve both, search with both combined. Never ask for project disambiguation.
- When `resolve_project_code` returns multiple projects: search all with the document type filter. If one returns results, use it directly.
- Specific queries: max 3–5 results showing document number, title, revision, status, Assai link. No table dumps.
- Always resolve acronyms via `dms_document_type_acronyms` first. Always normalise DP numbers before lookup.

### Deployment

Redeploy `ai-chat` edge function and test all four validation queries.

## Risk Assessment

The brace fix in Change 2 is the highest-risk edit. If the closing brace of the 429 block at line 11212 has wrong indentation affecting the parser, the function may not compile. Will verify brace balance explicitly after edit.

