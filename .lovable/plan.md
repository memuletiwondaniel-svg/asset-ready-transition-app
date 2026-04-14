

# Pass 1: Assess-Agent-Competencies Edge Function + Auto-Sync + UI Status

## Root Cause Confirmed

The `assess-agent-competencies` edge function **does not exist** in `supabase/functions/`. The client calls it in 3 places but every invocation silently 404s. Fred has 8 competency areas all at 0%, 3 completed sessions with rich `key_learnings` and `extracted_tags`, and 0 rows in `agent_competency_updates`. The sync button in `CompetencyProfilePanel` is correctly coded but its action does nothing because the backend doesn't exist.

`ANTHROPIC_API_KEY` is already configured — no new secrets needed.

---

## Deliverables (Pass 1 only — unblocks the 0% issue)

### 1. New edge function: `assess-agent-competencies/index.ts`

**What it does:**
- Accepts `{ agent_code, trigger_type, target_competency_id?, mode? }`
- `mode` defaults to `incremental`
- Loads all completed sessions for the agent (key_learnings, extracted_tags, knowledge_card)
- Loads all `agent_competency_areas` for the agent
- Calls Claude (claude-sonnet-4-5 via Anthropic API) with a structured prompt:
  - "Given these training sessions and their knowledge, assess each competency area on a 0-100 scale"
  - Returns JSON: `{ assessments: [{ competency_id, progress, notes }] }`
- For each competency: updates `progress`, `status` (derived from `getLevelFromProgress` logic), `ai_assessment_notes`, `last_assessed_at`, appends relevant session IDs to `linked_session_ids`
- Inserts audit rows into `agent_competency_updates` for each change
- If `target_competency_id` is set, only reassess that one competency (for description-change triggers)
- Returns `{ success: true, updated: [...], timestamp }`

**Pattern:** Follows `fred-performance-scorer` — service role client, CORS headers, Anthropic direct call.

### 2. Auto-trigger on session completion: `agent-training-chat/index.ts`

After the session is marked `completed` (line 470-485), add a non-blocking call:

```typescript
// Fire-and-forget competency reassessment
fetch(`${supabaseUrl}/functions/v1/assess-agent-competencies`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
  body: JSON.stringify({ agent_code, trigger_type: 'session_complete', mode: 'incremental' }),
}).catch(() => {});
```

This uses the service role key (already available in the function) so no auth issues. Non-blocking so the training response isn't delayed.

### 3. UI sync status row: `CompetencyProfilePanel.tsx`

Replace the conditional sync button with a persistent status indicator:

| State | Display |
|---|---|
| `isLoading` | "Loading..." |
| All 0% + has completed sessions | Amber warning + "Sync from training history" button (existing) + "Reassess now" always available |
| `last_assessed_at` exists | "Last reassessed X ago" in muted text |
| Syncing in progress | Spinner + "Syncing learning updates..." |

Add a small "Reassess now" secondary action (always visible, not just at 0%) in the summary header area.

### 4. Fix silent failures in `CompetencyDrawer.tsx`

The backfill `useEffect` (lines 65-85) swallows errors. Update to:
- Check `response.error` from `supabase.functions.invoke`
- Show toast on failure: "Competency sync failed — use Reassess now"
- On success: call `refetch()` to refresh competency data immediately
- Same fix for the `onSyncCompetencies` handler (line 199-203)

### 5. Fix `useAgentCompetencies.ts` silent failure

The `updateDescriptionAndReassess` mutation (line 176-190) calls `supabase.functions.invoke` but doesn't handle the response body. After the function exists, ensure the response is checked and competencies are refetched.

---

## Pass 2 (future, after Pass 1 is verified working)

- `agent_competency_runs` queue table
- DB trigger on `agent_training_sessions` for reliability
- Nightly full reread via Supabase scheduled edge function (02:00 UTC default)
- Session badge: "Applied to competencies"

---

## Files Modified/Created

| File | Action |
|---|---|
| `supabase/functions/assess-agent-competencies/index.ts` | **Create** — the core edge function |
| `supabase/functions/agent-training-chat/index.ts` | Edit line ~485 — add post-completion trigger |
| `src/components/admin-tools/agents/training/CompetencyProfilePanel.tsx` | Edit — persistent status row + reassess button |
| `src/components/admin-tools/agents/training/CompetencyDrawer.tsx` | Edit — fix silent failures, refetch on success |
| `src/hooks/useAgentCompetencies.ts` | Edit — fix silent failure in `updateDescriptionAndReassess` |

