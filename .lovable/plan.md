

## P&ID Foundation Knowledge — Implementation Plan

### Summary

Create a new `agent_foundation_knowledge` table to store curated base knowledge, extraction templates, and agent-specific lenses for P&ID reading. Update the training edge function to dynamically load and inject these at runtime. Add P&ID document types and a training path checklist to the Training Studio UI for Fred and Ivan.

### Phase 1 — Database Migration: `agent_foundation_knowledge` table

Create the table with columns: `id` (uuid PK), `agent_code` (text, nullable — NULL = universal), `document_type` (text, nullable), `template_type` (text NOT NULL — `knowledge`|`extraction`|`lens`), `title` (text NOT NULL), `knowledge_card` (jsonb), `prompt_fragment` (text), `is_active` (boolean default true), `sort_order` (integer default 0), `created_at`, `updated_at`.

RLS: enable RLS, single SELECT policy for authenticated users.

**No new columns on `agent_training_sessions`** — `document_description` already exists.

### Phase 2 — Seed 7 Foundation Records

All inserted with explicit UUIDs and `ON CONFLICT (id) DO NOTHING` for idempotency.

| # | agent_code | document_type | template_type | title |
|---|-----------|--------------|---------------|-------|
| 1 | NULL | NULL | knowledge | P&ID Universal Literacy — ISA 5.1 |
| 2 | fred | NULL | knowledge | P&ID for Commissioning Engineers |
| 3 | ivan | NULL | knowledge | P&ID for Technical Authority — HAZOP |
| 4 | NULL | P&ID | extraction | P&ID extraction sections |
| 5 | NULL | P&ID Legend Sheet | extraction | Legend Sheet extraction sections |
| 6 | fred | P&ID | lens | Fred's Commissioning Lens |
| 7 | ivan | P&ID | lens | Ivan's Technical Authority Lens |

Knowledge card content uses the exact JSON structures from the reconciled prompt. Lens and extraction records store `prompt_fragment` text.

### Phase 3 — Edge Function: `agent-training-chat/index.ts`

**3a. Foundation knowledge injection in `buildKnowledgeContext`:**
- After loading completed sessions, query `agent_foundation_knowledge` where `template_type = 'knowledge'`, `is_active = true`, and `agent_code IS NULL OR agent_code = $current_agent`.
- Score by keyword overlap (same as sessions). Inject as `FOUNDATION KNOWLEDGE (verified, always applies):` section before session-based context. Foundation knowledge is outside the 2000-token session budget.

**3b. Dynamic template and lens loading in training mode:**
- Before building the system prompt, query for `extraction` template matching `document_type` (with `agent_code IS NULL OR agent_code = $current_agent`).
- Query for `lens` record matching `agent_code` + `document_type`.
- Append lens `prompt_fragment` to the agent domain prompt (Section A).
- Append extraction `prompt_fragment` to `TRAINING_RESPONSE_FORMAT` (Section E).

**3c. No changes to image handling** — existing base64 injection (lines 478-502) already works for P&ID images. The extraction template adds P&ID-specific sections automatically when `document_type` matches.

**3d. Pass `document_context` to training mode** — ensure `document_context` (including `document_type`) is forwarded from the request body into `buildKnowledgeContext` and the template loading queries. Currently `document_context` is destructured from body but only passed to `buildKnowledgeContext` — the template/lens queries are new code that also uses it.

### Phase 4 — UI: `AgentTrainingStudio.tsx`

**4a. Add document types:**
Add `'P&ID'`, `'P&ID Legend Sheet'`, and `'LOSH Drawing'` to the `DOCUMENT_TYPES` array.

**4b. Training path checklist (Fred & Ivan only):**
In the setup sub-state (Sub-state A), between the anonymization rules and the file drop zone, render a compact checklist widget when `agent.code === 'fred' || agent.code === 'ivan'`:

- Query completed sessions for this agent to check which P&ID document types exist.
- Render 3-4 rows (LOSH row only for Fred):
  - `✓ Foundation knowledge` — always checked (seeded records exist)
  - `○ Project legend sheet` — checked when a `P&ID Legend Sheet` session exists; shows amber warning if P&ID sessions exist but no legend sheet
  - `○ Process P&IDs` — checked when any `P&ID` session exists
  - `○ LOSH drawings` — Fred only, checked when `LOSH Drawing` session exists
- Widget disappears when all rows are checked.
- Styled inline using existing `Badge`, `CheckCircle2`, `AlertTriangle` icons, and Tailwind classes. No new component file.

### Files

| Action | File |
|--------|------|
| Create | Migration 1: `agent_foundation_knowledge` table + RLS |
| Create | Migration 2: Seed 7 foundation records with full knowledge card JSON |
| Edit | `supabase/functions/agent-training-chat/index.ts` — foundation context loading, dynamic template/lens injection |
| Edit | `src/components/admin-tools/agents/AgentTrainingStudio.tsx` — P&ID doc types, training path checklist |

### Not Built
- `is_image_document` / `image_description` columns (existing fields suffice)
- Hardcoded prompt fragments in edge function (DB-driven templates replace them)
- Direct session seeding into `agent_training_sessions` (foundation knowledge table replaces it)
- Static banner with project-specific text (dynamic checklist replaces it)

