
## AI Chat Migration: Lovable Gateway → Anthropic API ✅ COMPLETED

### Changes Made

1. **API Key**: `LOVABLE_API_KEY` → `ANTHROPIC_API_KEY` (secret added to Supabase)
2. **Endpoint**: `ai.gateway.lovable.dev/v1/chat/completions` → `api.anthropic.com/v1/messages`
3. **Model**: `openai/gpt-5-mini` → `claude-sonnet-4-5-20250514`
4. **Headers**: `Authorization: Bearer` → `x-api-key` + `anthropic-version: 2023-06-01`
5. **Request format**: System prompt moved to top-level `system` param; tools use `input_schema`
6. **Response parsing**: `choices[0].message.content` → `content[].text`; `tool_calls` → `tool_use` blocks
7. **Tool results**: `role: "tool"` messages → `tool_result` content blocks in user message
8. **Image format**: `image_url` → `image` with `source.type: "url"`
9. **Max tokens**: 4096 copilot, 2048 specialist agents
10. **Agent-specific prompts**: Document Agent and PSSR/ORA Agent have dedicated system prompts
11. **Error handling**: API errors logged to `ai_edge_cases` with `category: 'api_error'`
12. **Agent registry**: Updated `model_id` to `claude-sonnet-4-5` for all 3 agents

### Preserved (untouched)
- All 13 tool definitions and `executeTool()` switch
- `detectAgentDomain()` routing logic
- A2A protocol and `routeA2AMessage()`
- Injection detection and protective responses
- Deterministic navigation handler
- Audit logging and feedback collection
- JWT auth guard and tenant isolation
- SSE response format to frontend
