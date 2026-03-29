

# Extend Selma Processing Time & Dynamic Status Updates

## Context

Supabase Edge Functions have a **hard timeout of 150 seconds** (Pro plan) or **60 seconds** (Free plan). The current code uses a conservative 45-second time guard with only 5 iterations. Given 250,000+ documents in Assai, searches and downloads genuinely need more time.

## Plan

### 1. Increase time guard and iterations

**File**: `supabase/functions/ai-chat/index.ts`

- Change `MAX_LOOP_MS` from `45000` to `140000` (140s — leaves 10s buffer before the 150s hard limit)
- Change `MAX_ITERATIONS` from `5` to `15` (more retry cycles for complex multi-step workflows)
- Adjust the rate-limit retry threshold from `15000` to `20000` (needs 20s remaining to attempt a retry)

> **Note**: This requires the Supabase project to be on the **Pro plan**. If on the Free plan, the hard limit is 60 seconds and we'd cap at `50000` instead. We should confirm the plan.

### 2. Stream dynamic status updates to the frontend

**Backend** (`index.ts`): Emit `event: status` SSE events at key points in the agent loop:
- Before each Anthropic API call: `"Analyzing your request..."`
- On each tool call, map tool name to a friendly label:
  - `resolve_document_type` → `"Resolving document type..."`
  - `search_assai_documents` → `"Searching Assai portal (250,000+ documents)..."`
  - `read_assai_document` → `"Downloading and reading document..."`
  - `get_pssr_*` → `"Retrieving PSSR data..."`
  - On retry/next iteration: `"Refining search, please wait..."`
- Format: `event: status\ndata: {"status":"..."}\n\n`

**Frontend** (`ORSHChatDialog.tsx`):
- Add `agentStatus` state variable
- Parse `event: status` lines from the SSE stream and update the state
- Replace static "Co-Pilot is thinking..." with the dynamic `agentStatus` text
- Keep it on a single line — no new chat bubbles, just the label swapping
- Add `transition-opacity duration-300` for smooth text changes
- Clear status when streaming completes

### 3. Confirm Supabase plan

If the project is on the Free plan, the 60-second hard limit cannot be bypassed. We need to confirm the project is on Pro to unlock the full 150-second window.

## Files modified

| File | Change |
|------|--------|
| `supabase/functions/ai-chat/index.ts` | Increase `MAX_LOOP_MS` to 140s, `MAX_ITERATIONS` to 15, emit SSE status events during agent loop |
| `src/components/widgets/ORSHChatDialog.tsx` | Parse status events, display dynamic status label with smooth transitions |

