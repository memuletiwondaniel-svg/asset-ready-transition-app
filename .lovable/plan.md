

# Final Plan — Competency-Driven Training Workspace

## Status: Approved by Senior Developer — Ready to Implement

The plan from the previous round is fully signed off with two minor implementation notes incorporated:

1. **"New" badge**: Derive client-side from `created_at` — no DB column needed. `isNewCompetency(createdAt) = (now - createdAt) < 7 days`.
2. **Reassess fuzzy matching**: Add explicit instruction to `competency-chat` system prompt to match user-provided names against `current_competencies` by ID, and ask for clarification if no confident match.

## Implementation Order (14 steps)

1. **DB migration** — `agent_competency_areas` + `agent_competency_updates` tables with RLS
2. **`competencyLevels.ts`** — shared constant + `getLevelFromProgress()` + `isNewCompetency()`
3. **`useAgentCompetencies` hook** — React Query CRUD, seeding from specializations, merge/redescribe gap fixes
4. **`assess-agent-competencies` edge function** — AI assessment triggered on session complete, new competency, description change, reassess
5. **`CompetencyDonut` + `CompetencyInlineSummary`** — replaces K&T card content (no avatar, donut + top 3 gaps + CTA)
6. **`CompetencyDrawer` + `CompetencyProfilePanel` + `CompetencyDetailView`** — Sheet side="right" max-w-[720px], 3 tabs, list/detail views
7. **`AddCompetencyDialog`** — centered dialog with "Save & Assess"
8. **Wire drawer into `AgentProfileView`** — replace AgentTrainingStudio, pass userName prop
9. **Wire assessment into `AgentTrainingStudio.completeSession`** — trigger edge function + discovery toast
10. **Update `AgentTrainingDialog`** — remove History tab, train-only focus
11. **Fix "All Pending" status** in Sessions tab
12. **`competency-chat` edge function** — conversational AI with action types, fuzzy name matching
13. **`CompetencyChat.tsx`** — Ask Fred tab with proposed change cards, reassess handler
14. **Wire "Ask Fred" tab into `CompetencyDrawer`**

## Files

**12 new**: Migration SQL, `competencyLevels.ts`, `CompetencyDonut.tsx`, `CompetencyInlineSummary.tsx`, `CompetencyDrawer.tsx`, `CompetencyProfilePanel.tsx`, `CompetencyDetailView.tsx`, `AddCompetencyDialog.tsx`, `CompetencyChat.tsx`, `useAgentCompetencies.ts`, `assess-agent-competencies/index.ts`, `competency-chat/index.ts`

**3 modified**: `AgentProfileView.tsx`, `AgentTrainingStudio.tsx`, `AgentTrainingDialog.tsx`

## Key Technical Details

- **Schema**: Two tables with `trigger_type` on audit trail, `linked_session_ids uuid[]` on competencies, RLS for authenticated read / admin write
- **Merge**: Inherits + deduplicates session IDs from both source rows
- **Redescribe**: Two-step chain — update description then trigger reassessment
- **Chat reassess**: `competency-chat` returns `action: { type: 'reassess', competency_id }`, client calls `assess-agent-competencies` directly
- **Seeding**: From `agentProfiles.specializations` on first load when zero rows exist
- **"New" badge**: Client-derived from `created_at`, no DB column
- **Donut**: Recharts `PieChart` with `innerRadius`, 48px (inline) and 64px (drawer) variants

Nothing changes in the training chat flow, file upload, agent header, About card, Performance section, governance model, or routing.

