

# Selma v6.0 — Final Technical Review

## Verdict: v6.0 is Ready to Implement

The Senior Dev's v6.0 is the most technically accurate version yet. Every ground truth item is verified. Every schema column is correct. The architecture is sound. I have **one genuine bug discovery** and **two minor clarifications** — none are blockers.

---

## 1. Bug Discovery: The Intercept Guard Tool Filter Was Always Broken

Line 11793: `anthropicTools.filter((t: any) => !blockedTools.has(t.function?.name))`

At this point, `anthropicTools` was already converted to Anthropic format at line 11293 — objects have `t.name`, not `t.function.name`. So `t.function?.name` evaluates to `undefined`, the filter keeps every tool, and only `MAX_ITERATIONS = 1` actually took effect.

**Impact on the rebuild:** None. Phase 0 removes the entire intercept guard block. But this confirms the Senior Dev's instinct — the intercept system was half-broken and masking issues. Good riddance.

## 2. Minor Clarification: `executeFilteredSearch` Uses `cookieHeader` Directly

Line 8514: `Cookie: cookieHeader` — confirmed. The `reuseSession` path skips `initSearch` but still reads the outer-scope `cookieHeader` directly for the fetch. The non-`reuseSession` path calls `initSearch` (which also uses `cookieHeader` internally). When porting, **both paths** must use `ctx.sessionManager.getSession()` for the cookie. v6.0 already states this correctly.

## 3. Minor Clarification: `SWEEP_TIME_GUARD_MS` and `MAX_TOTAL_QUERIES` Values

v6.0 correctly places these inside `SearchContext` (not the agent loop). The values (`90000` and `80`) match the actual V10 code at lines 8462-8463. Confirmed correct.

---

## What v6.0 Gets Right (Everything)

- Phase 0 wipe-first with stub
- `authenticateAssai` + `ASSAI_UA` move to `_shared/assai-auth.ts`
- 6 tools with verified parameter names matching real handlers
- `dms_status_codes.description` (not `name`)
- `dms_document_type_acronyms` columns: `acronym, full_name, type_code, notes`
- Credential decryption via `isEncrypted`/`decrypt` in `buildSelmaSessionManager`
- `projSeqNr` not hardcoded
- `executeFilteredSearch` preserves both `reuseSession` paths
- Full `read_assai_document` pipeline (7 stages, ~300 lines)
- Agent loop values unchanged: `MAX_ITERATIONS = 25`, `MAX_LOOP_MS = 148000`
- Search-specific limits in `SearchContext`: `SWEEP_TIME_GUARD_MS = 90000`, `MAX_TOTAL_QUERIES = 80`
- `label.aweb` warmup preserved after every forced re-auth
- `dms_external_sync` removed from all code paths
- Intercept guard permanently removed

---

## Final Aligned Plan: Implement v6.0 As-Is

No modifications needed. The Senior Dev's v6.0 document is the implementation spec. Here is the execution sequence:

### Phase 0: Wipe (standalone deploy)
1. Remove all Selma-specific code from `ai-chat/index.ts` (~5,000 lines): `DOCUMENT_AGENT_PROMPT`, `dmsConfigSnapshot` builder, 23 tool definitions, all Selma handler cases, vendor intercept, document intercept, intercept guard, follow-up templates, stop words, structured response builder
2. Insert stub: `if (detectedAgent === 'document_agent') { emitStatus('Selma is being upgraded...'); return; }`
3. Deploy and verify: Bob works, Selma returns stub, zero errors

### Phase 1: Build Modules
1. **Step 1A:** Export `authenticateAssai` + `ASSAI_UA` from `_shared/assai-auth.ts`, update `ai-chat/index.ts` to import them, remove local definitions
2. **Create `_shared/selma/prompt.ts`** — warm Claude-like system prompt as specified
3. **Create `_shared/selma/tools.ts`** — 6 tools in Anthropic format as specified
4. **Create `_shared/selma/context-loader.ts`** — config snapshot with correct columns and `is_active` filters
5. **Create `_shared/selma/search-engine.ts`** — `SessionManager` + `SearchContext` + full V10 pipeline port (lines 8280-9080). Replace `cookieHeader` reads with `ctx.sessionManager.getSession()`, forced re-auth with `ctx.sessionManager.getSession(true)`, preserve `label.aweb` warmup
6. **Create `_shared/selma/handlers.ts`** — `buildSelmaSessionManager` (with credential decryption) + `executeSelmaTool` (all 6 handlers including full 300-line `read_assai_document`)

### Phase 2: Rewire
1. Add imports from `_shared/selma/`
2. Replace stub with real Selma execution block
3. After line 11297: `if (detectedAgent === 'document_agent') anthropicTools = SELMA_TOOLS;`
4. Wire `executeSelmaTool` into the tool dispatch when agent is `document_agent`

### Phase 3: Validate
Test the 6 scenarios from the validation matrix.

---

## Recommendation

**Approve v6.0 and begin Phase 0.** The proposal is technically complete, addresses all known issues (128-vs-255 pagination bug, 13K monolith, ghost tools, broken intercept guard, robotic personality), and both sides are fully aligned.

