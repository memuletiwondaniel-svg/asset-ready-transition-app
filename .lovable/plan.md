

## Self-Learning Enhancements — Final Implementation Plan

### Technical Challenges to the Senior Developer's Proposal

The proposal is 95% correct. Three refinements:

**1. Completeness score should NOT be in the Claude extraction prompt.** The proposal asks Claude to calculate the score using a deterministic formula. Claude is non-deterministic — it may miscalculate. The scoring formula is purely rule-based (count items, check flags). Calculate it **server-side in TypeScript** after parsing the knowledge card. This is cheaper (no extra tokens), deterministic, and testable.

**2. Scroll-gated verification is security theater.** Requiring admins to scroll to the bottom of Core Facts before enabling "Confirm Verification" adds friction without ensuring comprehension. An admin can scroll instantly without reading. A better UX pattern: require the admin to **check a confirmation checkbox** ("I have reviewed the extracted knowledge and confirm it is accurate") — this is the standard enterprise governance pattern (DocuSign, Jira, ServiceNow) and is legally defensible. Simpler to implement, no scroll tracking needed.

**3. The `buildKnowledgeContext` function loads up to 100 sessions and scores them in-memory.** This works for now but the `.limit(100)` is arbitrary. Better: filter at the DB level first. Use Postgres `to_tsvector`/`plainto_tsquery` for basic relevance if available, or at minimum filter by `document_domain` match before loading into memory. For v1 though, 100 sessions with in-memory scoring is acceptable — just add a comment marking it for future optimization.

Everything else is accepted.

---

### Phase 1 — Database Migration

Add 3 columns to `agent_training_sessions`:

```sql
ALTER TABLE agent_training_sessions
  ADD COLUMN IF NOT EXISTS completeness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS knowledge_status text DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS correction_history jsonb DEFAULT '[]';
```

No CHECK constraint on `knowledge_status` — flexible for future states.

### Phase 2 — Edge Function Changes

**File**: `supabase/functions/agent-training-chat/index.ts`

**2a. Prefilling** — For `mode === 'training'` only, append `{ role: 'assistant', content: '## What I understood\n' }` to the messages array sent to Claude. 3-line change.

**2b. Self-organizing context** — Replace `buildExistingKnowledgeSection()` with `buildKnowledgeContext()` that:
- Loads all completed sessions across ALL agents (limit 100)
- Scores by keyword overlap with current document domain/name
- Separates into "YOUR PREVIOUS TRAINING" (same agent) and "PEER AGENT KNOWLEDGE" (cross-agent, max 3)
- Respects a 2000-token budget
- Returns empty string if no relevant context found

**2c. Server-side completeness scoring** — After parsing the knowledge card in `complete` mode, calculate `completeness_score` deterministically in TypeScript:
- +20 if `core_facts.length >= 5`
- +10 if any fact has `confidence === 'high'`
- +20 if any procedure has `steps.length >= 3`
- +15 if `entities.length >= 3`
- +15 if `decision_rules.length >= 1`
- +20 if session had `open_questions_count === 0` at completion
- -10 per contradiction flag (max -20)
- -10 if `confidence_level === 'low'`
- Floor 0, ceiling 100

Save `completeness_score` and set `knowledge_status = 'pending_review'` alongside existing completion fields.

### Phase 3 — KnowledgeCardModal: Inline Corrections + Verification

**File**: `src/components/admin-tools/agents/training/KnowledgeCardModal.tsx`

**New props**: `verificationMode?: boolean`, `onVerify?: () => void`, `onCorrection?: (correction: CorrectionEntry) => void`, `canAdmin?: boolean`

**3a. Inline corrections** — Each row gets a hover-visible pencil button (admin only). Clicking replaces the row with an inline editor showing original value pre-filled, a "Correct to" textarea, Cancel and Save Correction buttons. On save: calls `onCorrection` callback which the parent handles (Supabase update to `knowledge_card` JSONB + append to `correction_history` + reset `knowledge_status`).

**3b. Verification flow** — When `verificationMode === true`, show a banner at top with a confirmation checkbox: "I have reviewed the extracted knowledge and confirm it is accurate." Button enabled only when checked. On confirm: calls `onVerify` callback.

### Phase 4 — TrainingHistoryPanel: Governance UI

**File**: `src/components/admin-tools/agents/training/TrainingHistoryPanel.tsx`

**4a. Status filter** — Add `pending_review`, `verified`, `flagged` options to the status dropdown. Filter logic: for completed sessions, check `knowledge_status`; for active/archived, check `status`.

**4b. Badge system** — Priority-ordered badges on collapsed cards:
| Condition | Badge | Color |
|-----------|-------|-------|
| `knowledge_status === 'flagged'` | ⚠ Flagged | Red |
| `contradiction_flags.length > 0` | ⚠ Conflict | Red |
| `correction_history.length > 0` | ✏ Corrected (N) | Amber |
| `stale_after < now()` | ⚠ Stale | Amber |
| `knowledge_status === 'pending_review'` | ○ Pending | Gray |
| `knowledge_status === 'verified'` | ✓ Verified | Green |

**4c. Completeness display** — Show alongside confidence: `●●● High · 87/100 quality`. Hide score if 0 or null.

**4d. Review banner** — In expanded card when `knowledge_status === 'pending_review'`: "View & Verify" opens KnowledgeCardModal in verification mode. "Flag" shows inline reason input, saves to `knowledge_status = 'flagged'` + appends to `contradiction_flags`.

**4e. Verified indicator** — When verified: `✓ Verified` with "Unverify" button to reset to `pending_review`.

**4f. Corrections section** — In expanded card when `correction_history.length > 0`: chronological list showing date, corrector, fact type, before/after text. Read-only audit trail.

---

### Files to Edit

| Action | File |
|--------|------|
| Create | DB migration: 3 new columns |
| Edit | `supabase/functions/agent-training-chat/index.ts` — prefill, context, completeness |
| Edit | `src/components/admin-tools/agents/training/KnowledgeCardModal.tsx` — corrections, verification |
| Edit | `src/components/admin-tools/agents/training/TrainingHistoryPanel.tsx` — governance, badges, completeness |

### Not Built
- `connection_flags` column (no consumer)
- `mode: 'correct'` edge function mode (UI corrections instead)
- Hardcoded cross-agent pairs (self-organizing overlap)
- Bob correction detection prompt (deferred)
- Confidence decay cron (client-side stale check sufficient)

