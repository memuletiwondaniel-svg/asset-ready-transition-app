

## Migrate AI Chat from Lovable Gateway to Anthropic API

### Blocker: Missing ANTHROPIC_API_KEY

The `ANTHROPIC_API_KEY` is **not currently stored** in Supabase Edge Function secrets. The 11 existing secrets do not include it. Before implementation can proceed, you need to add this secret.

---

### Changes Overview

**File: `supabase/functions/ai-chat/index.ts`**

1. **Replace API key retrieval**
   - Change `Deno.env.get("LOVABLE_API_KEY")` → `Deno.env.get("ANTHROPIC_API_KEY")`
   - Update the error message accordingly

2. **Replace both fetch calls** (lines ~6274 and ~6357) from Lovable Gateway to Anthropic Messages API
   - URL: `https://api.anthropic.com/v1/messages`
   - Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`
   - Model: `claude-sonnet-4-5`
   - Max tokens: 4096 for copilot, 2048 for specialist agents (based on `detectedAgent`)

3. **Adapt request body format** (OpenAI → Anthropic)
   - Move system prompt from `messages` array to top-level `system` parameter
   - Anthropic messages format: `[{role, content}]` without system message in array
   - Tool definitions: Anthropic uses `input_schema` instead of `parameters`, and wraps differently
   - Tool results: Anthropic uses `tool_result` content blocks instead of `role: "tool"` messages

4. **Agent-specific system prompts**
   - `detectedAgent === 'copilot'`: Current `BOB_SYSTEM_PROMPT + userContextPrompt` (unchanged content)
   - `detectedAgent === 'document_agent'`: New dedicated prompt for DMS document readiness, gap analysis, quality scoring, numbering config, ORA phase linkage
   - `detectedAgent === 'pssr_ora_agent'` (covers PSSR/ORA triggers): New dedicated prompt for PSSR reviews, ORA planning, checklist management, safety readiness

5. **Adapt response parsing** (Anthropic format)
   - Response: `response.content[0].text` instead of `choices[0].message.content`
   - Tool calls: `response.content.filter(b => b.type === 'tool_use')` instead of `choices[0].message.tool_calls`
   - Tool call ID: `block.id`, function name: `block.name`, args: `block.input`

6. **Error handling**
   - On Anthropic API error: log to `ai_edge_cases` table with `category: 'api_error'`
   - Return graceful fallback message
   - Never log API key value

7. **Image support adaptation**
   - Anthropic uses `{type: "image", source: {type: "url", url}}` instead of `{type: "image_url", image_url: {url}}`

8. **SSE output format stays the same** — still wrap final content in `data: {"choices":[{"delta":{"content":"..."}}]}\n\ndata: [DONE]\n\n` for frontend compatibility

### Data Update (via insert tool)

Update `ai_agent_registry` table:
```sql
UPDATE ai_agent_registry SET model_id = 'claude-sonnet-4-5' WHERE agent_code IN ('copilot', 'document_agent', 'pssr_ora_agent');
```

### What stays untouched
- All tool definitions and `executeTool()` switch
- `detectAgentDomain()` routing logic
- A2A protocol and `routeA2AMessage()`
- Injection detection and protective responses
- Deterministic navigation handler
- Audit logging and feedback collection
- JWT auth guard and tenant isolation
- SSE response format to frontend

### Pre-requisite
I will need to add the `ANTHROPIC_API_KEY` secret before deploying. Please have your Anthropic API key ready.

