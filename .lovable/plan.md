
Issue summary

- The current “permanent fix” is incomplete. `src/main.tsx` already unregisters service workers and clears caches, so this is no longer just a PWA/cache cleanup problem.
- The bigger structural problem is that AI Agents still exist in two navigation modes:
  1. embedded inside `/admin-tools` via `location.state.activeView = 'ai-agents-hub'`
  2. real routes at `/admin/ai-agents` and `/admin/ai-agents/:agentCode`
- That split makes the Admin experience easier to drift, look stale, and behave differently depending on how the user arrived there.
- There is also content drift: the admin AI-agent cards are hand-maintained in `AdminToolsPage.tsx`, while the real roster lives in `src/data/agentProfiles.ts`. Some AI-agent copy is still inconsistent (`AgentOverview` still says “Seven specialized AI agents”, and some docs still contain older agent naming).

Plan

1. Make the AI Agents Hub route-based and canonical
- Change the Admin dashboard AI-agent items to navigate to `/admin/ai-agents` and `/admin/ai-agents/:agentCode`.
- Stop treating AI Agents as a same-route embedded subview of `/admin-tools`.

2. Remove stale state dependency from the Admin entry flow
- Reduce or remove the `activeView === 'ai-agents-hub'` branch in `AdminToolsPage.tsx`.
- Let `AIAgentHub` own agent selection from URL state instead of depending on `location.state.agentCode` passed through `/admin-tools`.

3. Single-source the AI-agent cards
- Generate the AI AGENTS dashboard cards from shared agent data instead of maintaining a separate hardcoded list.
- Keep one shared “AI Agents Hub” entry plus cards derived from `agentProfiles`.

4. Fix the inconsistent AI-agent copy
- Update `AgentOverview.tsx` to reflect the current agent count.
- Clean remaining stale AI-agent references in supporting admin documents so the UI no longer looks partially reverted.

5. Tighten favorites/breadcrumb paths
- Update AI-agent favorite paths and breadcrumb favorite targets to use the canonical AI-agent route instead of generic `/admin-tools`.
- Add a small migration for any saved AI-agent shortcuts that still point to old admin subviews.

6. Add a lightweight anti-stale safeguard
- Add a visible build/version marker in the Admin/AI Agents area so it is obvious when a stale bundle is being shown.
- Use this as a verification aid, not the primary fix.

Verification

- Open Admin Tools directly on mobile width.
- Expand AI AGENTS and confirm the intended current set appears consistently.
- Open AI Agents via dashboard card, direct route, back navigation, and agent deep links.
- Confirm old combinations like “Agent Registry / Training & Feedback / Auto-Update Controls” cannot reappear under AI AGENTS.
- Re-test after refresh and same-route navigation.

Files likely affected

- `src/components/AdminToolsPage.tsx`
- `src/pages/admin/AIAgentHub.tsx`
- `src/data/agentProfiles.ts`
- `src/components/admin-tools/agents/AgentOverview.tsx`
- possibly `src/hooks/useFavoritePages.ts`

Technical details

- Best fix: use real routes as the single source of navigation truth.
- Why this should stick: it removes the split between state-driven embedded views and route-driven pages, which is the most likely reason the problem keeps returning even after temporary cleanup fixes.
