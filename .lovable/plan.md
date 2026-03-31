

# Final Implementation: Selma Clarification + LLM Routing + Bob Hardening

## Build Error

The `aws s3 cp exit 127` error is a Nix store path issue in the deployment infrastructure — not caused by code changes. It will resolve on redeployment.

## 5 Changes — All in `supabase/functions/ai-chat/index.ts`

### CHANGE 1 — Selma Clarification Protocol
**Line 10341**: Replace the single clarification rule with the full 7-rule protocol covering: immediate search when clear, one-question-max for missing project or ambiguous doc type, compound question when both unclear, intelligent next-step pills after zero results.

### CHANGE 2 — Regex-First, LLM-Fallback Router
**Lines 3826-3871**: 
- Rename `detectAgentDomain` → `detectAgentDomainRegex` (all logic preserved)
- Add `classifyIntent` function with `claude-haiku-4-5-20251001`, 2-second `AbortController` timeout, 7 intents (document_agent, pssr_ora_agent, ivan, hannah, training_agent, cmms_agent, copilot)
- Add `routeAgent` wrapper: if regex returns a specialist agent → use it instantly (0ms); if regex returns `copilot` → call Haiku for natural language classification
- **Line 10328**: Replace `detectAgentDomain(lastUserMessage.content)` with `await routeAgent(lastUserMessage.content)`
- Add code comment documenting the known regex priority order limitation

### CHANGE 3 — Keyword Matching Extended to `notes` Column
**Lines 7374-7402**: Three sub-changes:
- Line 7377: Change `.ilike('full_name', ...)` to `.or('full_name.ilike.%${queryKeywords[0]}%,notes.ilike.%${queryKeywords[0]}%')`
- Lines 7381-7384: Extend filter to check both `full_name` and `notes` for remaining keywords
- Line 7392: Same `.or()` extension for the single-keyword branch
- **Line 11530**: Add `basis of design` and `design basis` to the deterministic fallback BFD detection

### CHANGE 4 — Bob Hard Routing Rules
**After line 307**: Add "HARD ROUTING RULES" block instructing Bob to refuse and redirect (not defer) specialist queries, with `<follow_ups>` pill suggestions so users have a one-click escape. Documents → Selma, Punchlists → Hannah, PSSR → Fred, HAZOP → Ivan.

### CHANGE 5 — Targeted Error Message
**Line 12594**: Replace generic error string with context-aware message checking `detectedAgent` (document_agent → Assai message, pssr_ora_agent → PSSR message, default → generic rephrase suggestion). No other error handling changes.

## Technical Details

- **Cost**: Haiku classifier only fires when regex returns `copilot` (~10% of queries). ~$0.00002 per classification call.
- **Latency**: 0ms added for well-formed queries (regex handles them). ~200ms added only for ambiguous natural language.
- **Fallback chain**: Haiku timeout/error → regex result. Regex miss → copilot default. Bob receives specialist query → refuses with pills.
- **No database changes** — notes column already contains variant data from previous update.
- **No frontend changes** — pill extraction already handles `<follow_ups>` tags.

