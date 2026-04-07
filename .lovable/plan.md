

## AI Agent Detail Page — Full Redesign

### Challenge to the Senior Developer's Proposal

Your developer's proposal is solid but has gaps and some areas where a superior approach exists:

1. **Voice notes via Web Speech API** — the proposal suggests browser-native Web Speech API. This is unreliable across browsers and produces poor transcription for oil and gas terminology (PSSR, ITR, BGC). The existing architecture already has `whisper-stt` and `elevenlabs-tts` edge functions referenced in memory, though not yet wired in the frontend. We should use **OpenAI Whisper via edge function** for STT accuracy with domain-specific prompt hints.

2. **Training chat as a separate edge function** — the proposal suggests reusing `ai-chat` with a `training_mode` flag. This is architecturally wrong. The `ai-chat` function is a 1588-line orchestrator with complex agent routing, tool loops, and A2A protocols. Bolting training mode onto it creates fragility. Instead: **create a dedicated `agent-training-chat` edge function** that is purpose-built for training conversations (simpler, no tool routing, focused on document comprehension and Q&A).

3. **Two-panel side-by-side layout** — the proposal assumes desktop users always want side-by-side. For a training workflow where you're reading long agent responses about documents, a **tabbed or togglable layout** (Chat | History) with full-width panels is superior to cramped 60/40 split, especially at the 1332px viewport the user currently has. The side-by-side can be a widescreen option.

4. **"Mark Training Complete" button** — good concept but incomplete. Training sessions should have states: `active`, `completed`, `archived`. The agent should also be able to flag when it believes it has sufficient understanding, prompting the user to confirm completion.

5. **Agent Monitor with only 3 tabs** — the proposal drops Tool Usage and Project Heatmap entirely. Tool Usage is actually valuable for admins tuning agent capabilities. Instead of removing it, **fold it into the Performance tab** as a collapsible section below the KPIs.

6. **Hard refresh root cause** — the proposal speculates about `window.location.href` or missing routes. The actual codebase uses `useNavigate` and `useParams` correctly. The real issue is in `main.tsx`: the `ADMIN_AI_BUILD_ID` check triggers `window.location.replace()` on build mismatch, causing a full page reload that clears React state. The fix is to remove the aggressive build-marker reload and rely on Vite's built-in HMR/cache-busting.

---

### Implementation Plan

#### Phase 1: Fix Infrastructure (prevents hard refresh, fixes breadcrumbs)

**1a. Remove aggressive build-marker reload in `main.tsx`**
- Remove the `BUILD_STORAGE_KEY` / `BUILD_REFRESH_KEY` / `window.location.replace()` logic
- Keep `clearLegacyWebCaches()` for service worker cleanup
- Let Vite's content-hashed filenames handle cache busting naturally

**1b. Fix breadcrumb routing in `AIAgentHub.tsx`**
- Change `customBreadcrumbs` to use `Home > AI Agents > [Agent Name]`
- Ensure "Home" navigates to `/`, "AI Agents" navigates to `/admin/ai-agents`
- Add `/admin/ai-agents` alias in `BreadcrumbContext.tsx` route labels

**1c. Fix breadcrumb for hub-level page**
- When no agent is selected, breadcrumb reads `Home > AI Agents`
- "Home" clicks to `/`

#### Phase 2: Redesign Agent Detail Page Layout

**2a. Rewrite `AIAgentHub.tsx` header**
- When viewing an agent: show agent avatar, name, role, status badge — no Brain icon, no "AI Agents Hub" title, no back arrow button
- When viewing hub overview: keep current hub header but remove the back arrow (breadcrumb handles it)

**2b. Rewrite `AgentProfileView.tsx`**
- Remove "Back to Overview" button entirely
- Remove avatar/name/role from the identity card (already in page header)
- Keep the card body: introduction paragraph, "Works with" collaborators, Specializations, Limitations
- Restructure into new layout:

```text
[Breadcrumb: Home > AI Agents > Fred]
[Agent Header: avatar | Fred | System & Hardware Readiness | Active badge]

[Agent Profile Card — full width]
  Description paragraph
  Works with: [collaborator chips]
  Specializations | Limitations (side by side)

[Two-column row on desktop, stacked on mobile]
  Left (~60%): Knowledge & Training card
  Right (~40%): Agent Monitor card
```

#### Phase 3: Knowledge & Training Card (new component)

**3a. Create `AgentTrainingStudio.tsx`**
- Two-tab layout: **Training Chat** | **Training History**
- Header: "Knowledge & Training" with brain/book icon and "Training Channel — [Agent Name]" label

**3b. Training Chat tab**
- Full chat interface with:
  - Scrollable message area with agent avatar on agent messages
  - Input bar with text field, attach document button (PDF/DOCX/XLSX/images), voice note button, send button
  - Voice note: records audio via `MediaRecorder`, sends to `whisper-stt` edge function for transcription, inserts text
- Chat calls a new `agent-training-chat` edge function with `agent_code` parameter
- Training flow: user uploads doc + description → agent responds with understanding, key concepts, confidence, clarifying questions → conversation continues → user clicks "Complete Session"
- On completion: saves training record to `fred_training_documents` with session transcript, key learnings summary, tags

**3c. Training History tab**
- List of past training sessions from `fred_training_documents` + `fred_domain_knowledge`
- Each row: document icon, name, date, one-line summary, "Retrain" and "Test Understanding" buttons
- Expandable rows: full summary, Q&A transcript, extracted tags
- "Retrain" reopens document in chat tab
- "Test Understanding" sends a quiz prompt to the agent
- Empty state: "No training sessions yet — upload a document to begin training [Agent Name]."

**3d. Create `agent-training-chat` edge function**
- Accepts: `agent_code`, `messages[]`, optional `file_data`, `session_id`
- Loads agent-specific system prompt from `agentProfiles` data (e.g., Fred's commissioning expertise context)
- Uses Claude with a training-focused system prompt: "You are [Agent Name]. A user is training you on a new document. Read it carefully, summarize what you understood, state your confidence level, and ask 2-3 clarifying questions."
- Streams response via SSE (same pattern as `ai-chat`)
- Persists training sessions to a new `agent_training_sessions` table

**3e. Database migration**
- New table: `agent_training_sessions` (id, agent_code, user_id, document_name, status, key_learnings, transcript JSONB, created_at, completed_at)
- RLS: authenticated users can CRUD their own sessions

#### Phase 4: Agent Monitor Card (rationalized)

**4a. Create `AgentMonitorCard.tsx`**
- Replaces the current deep-dive tabs card
- Three tabs only:

**Tab 1 — Activity**
- Last 10 interactions table: Query, Project, Outcome, Latency, Time
- "View All" link
- Clean empty state

**Tab 2 — Performance**
- 3 KPI tiles: Success Rate, Avg Response Time, Unresolved Rate
- 30-day sparkline trend below
- "Run Scorer Now" button
- Collapsible "Tool Usage" section below (folded in, not removed)

**Tab 3 — Issues**
- Unresolved lookups list with Retry/Dismiss actions
- Empty state: "No unresolved items — [Agent Name] is handling all queries successfully"

**4b. For agents without analytics data (Bob, Ivan, Hannah, Alex)**
- Show the same card structure but with friendly empty states
- Only Fred and Selma have real analytics hooks currently

#### Phase 5: Apply to All Agents
- The new layout is generic — driven by `AgentProfile` data
- Fred and Selma get full analytics; others get empty states with "Coming soon" where appropriate
- Training Studio works for all agents (each gets their own `agent_code` in the training chat)

### Files to Create
- `src/components/admin-tools/agents/AgentDetailHeader.tsx`
- `src/components/admin-tools/agents/AgentTrainingStudio.tsx`
- `src/components/admin-tools/agents/AgentMonitorCard.tsx`
- `supabase/functions/agent-training-chat/index.ts`

### Files to Edit
- `src/main.tsx` — remove build-marker reload
- `src/pages/admin/AIAgentHub.tsx` — conditional header, remove redundant chrome
- `src/components/admin-tools/agents/AgentProfileView.tsx` — full restructure
- `src/contexts/BreadcrumbContext.tsx` — add route label for `/admin/ai-agents`

### Files to Keep (data reuse)
- `src/data/agentProfiles.ts` — unchanged, single source of truth
- `src/hooks/useFredAnalytics.ts` — reused inside AgentMonitorCard for Fred
- `src/pages/admin/FredAnalytics.tsx` — retired (logic moves to AgentMonitorCard)

### Design Standards
- All cards use existing ORSH design tokens (border-border/40, shadow-sm, rounded-xl)
- Training chat uses premium message bubbles with clear user/agent distinction, subtle timestamps, agent avatar
- Responsive: two-column at md+, single column below
- Smooth tab transitions, proper hover/focus/loading states on all interactive elements

