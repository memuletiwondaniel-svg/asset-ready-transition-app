

## AI Agent Training Module — Final Implementation Plan

### Technical Challenges to the Consolidated Proposal

The spec is 98% correct. Two refinements remain:

1. **PDF handling via base64 is limited to ~10MB after encoding** — the spec says 20MB max, but base64 inflates by ~33%. Claude's API has a 100MB request body limit so this works, but the real constraint is Supabase Edge Function's 150s timeout and 2MB response limit. For large PDFs, Claude may need up to 60s just to process the document. The `max_tokens: 4096` for training mode is too low for a document with dozens of facts/procedures — bump to `8192` for training mode only.

2. **The `complete` mode loads transcript from DB but the edge function has no Supabase client initialized** — the current function is a pure Anthropic proxy. For modes that read/write the DB (updating `message_count`, appending to `transcript`, loading `knowledge_card` for testing), we need to initialize a Supabase admin client inside the edge function using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. This is a critical infrastructure requirement not mentioned in the spec.

Everything else is accepted as-is. No further architecture changes needed.

---

### Implementation Plan

#### Phase 1: Database Migration

Add 19 columns to `agent_training_sessions` using `ADD COLUMN IF NOT EXISTS`. The existing CHECK constraint on `status` stays. Create storage bucket `agent-training-docs` with authenticated user-scoped RLS.

**File**: New migration SQL

#### Phase 2: Rewrite Edge Function

**File**: `supabase/functions/agent-training-chat/index.ts` — full replacement

- Initialize Supabase admin client (`createClient` with service role key)
- Three modes: `training`, `testing`, `complete`
- **Training**: Build 5-section system prompt (identity, training declaration, anonymization rules, existing knowledge context from 5 most recent completed sessions, structured response format). Server-side completion detection via string inspection of `## My clarifying questions` section. DB updates after each exchange (increment `message_count`, append to `transcript`, update `open_questions_count`, append to `contradiction_flags`).
- **Testing**: Load `knowledge_card` + `key_learnings_summary` from session. Testing-focused system prompt. Same DB transcript updates.
- **Complete**: Load full transcript from DB. Single Claude call with extraction prompt (`max_tokens: 2000`). Parse JSON response. Save `knowledge_card`, `key_learnings_summary`, `confidence_level`, `extracted_tags`, set `status = 'completed'`, `stale_after = now + 90 days`. For `testing === true`: scoring prompt, save to `test_history` array.
- Non-streaming JSON for all modes. `claude-sonnet-4-20250514` model.
- Handle file_data for images (Claude vision) and non-image files (text context).

#### Phase 3: Enhance `AgentTrainingStudio.tsx`

Major rewrite. Three sub-states in Training Chat tab:

**Sub-state A — Session Setup**: Form with document name, type dropdown (8 options), domain field, revision field. Collapsible `AnonymizationRulesInline`. Drop zone for files (20MB max, validated MIME types). File uploaded to Supabase Storage immediately. Session row created lazily on first send.

**Sub-state B — Active Session**: Session header bar. Scrollable messages with custom `h2` renderer adding `data-section` attributes for CSS-only section styling (no parser component). Completion banner when `metadata.completion_suggested === true`. Contradiction alert bar when `metadata.contradiction_detected === true`. Input bar with file attach, Whisper STT voice button, send.

**Sub-state C — Testing Mode**: Same chat UI, different header ("Testing Mode"), pre-populated test questions from `knowledge_card.suggested_test_questions`, scoring flow on completion.

#### Phase 4: New Component — `TrainingHistoryPanel.tsx`

**File**: `src/components/admin-tools/agents/training/TrainingHistoryPanel.tsx`

Search + domain/status filters. Expandable session cards with: confidence dots (●●●/●●○/●○○), stale badge (client-side `stale_after < now()`), contradiction badge, key learnings, tags, knowledge stats, test history, transcript viewer. Retrain/Test/Archive/Delete actions. `readOnly` prop hides write actions.

#### Phase 5: New Component — `KnowledgeCardModal.tsx`

**File**: `src/components/admin-tools/agents/training/KnowledgeCardModal.tsx`

Modal with 4 tabs: Core Facts (table, sortable by confidence), Procedures (cards with numbered steps), Entities (two-column definition list), Decision Rules (table, sortable by priority). All read-only.

#### Phase 6: New Component — `AnonymizationRulesInline.tsx`

**File**: `src/components/admin-tools/agents/training/AnonymizationRulesInline.tsx`

Collapsible panel with find/replace rows. "Load defaults for [Agent]" with hardcoded constants per agent (Fred gets BGC rules, others disabled). Rules stored in session JSONB on creation.

#### Phase 7: Role-Based Access

Use existing `usePermissions` hook with `hasPermission('access_admin')`. Non-admin users see `TrainingHistoryPanel` in read-only mode (no chat tab, no retrain/test/delete).

#### Phase 8: Wire Up

Confirm `AgentTrainingStudio` in `AgentProfileView.tsx` receives correct props. Ensure session queries filter by `agent_code` AND `user_id` (already does). Update `src/integrations/supabase/types.ts` will auto-regenerate after migration.

---

### File Summary

| Action | File |
|--------|------|
| Create | `src/components/admin-tools/agents/training/TrainingHistoryPanel.tsx` |
| Create | `src/components/admin-tools/agents/training/KnowledgeCardModal.tsx` |
| Create | `src/components/admin-tools/agents/training/AnonymizationRulesInline.tsx` |
| Rewrite | `supabase/functions/agent-training-chat/index.ts` |
| Enhance | `src/components/admin-tools/agents/AgentTrainingStudio.tsx` |
| Create | DB migration: column additions + storage bucket |

