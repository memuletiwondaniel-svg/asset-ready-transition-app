

## Permanent fix for AI Agents section in Admin Tools

### Root cause

The AI AGENTS section in `AdminToolsPage.tsx` builds its card list inline (lines 253-268) using `agentProfiles.map(...)`. The code itself is correct and reads from `agentProfiles.ts`. However, two things make the experience fragile and cluttered:

1. **Debug UI still present** -- build ID badge (line 771-773), "Canonical roster" and agent signature pills (line 778-781) clutter the section header.
2. **Duplicate rendering logic** -- the Admin Tools dashboard and the AI Agent Hub (`/admin/ai-agents`) both independently build their own card grids from `agentProfiles`. When either is edited, they can drift apart.
3. **`location.state` bootstrapping** -- on refresh, browser history can replay stale `activeView` state values, though current guards mostly catch this.

### What will change

**Create a shared roster component** that both Admin Tools and the AI Agent Hub use, so there is exactly one place that turns `agentProfiles` into cards.

### Plan

#### 1. Create shared `AgentRosterGrid` component
**New file: `src/components/admin-tools/agents/AgentRosterGrid.tsx`**

- Accepts `onAgentClick: (code: string) => void` and optional `showHubCard?: boolean`
- Renders the "AI Agents Hub" launcher card (links to `/admin/ai-agents`) when `showHubCard` is true
- Maps over `agentProfiles` to render individual agent cards (Bob, Selma, Fred, Ivan, Hannah, Alex)
- Uses the same card styling currently in `AdminToolsPage.tsx` (avatar, gradient, badge for planned agents)
- This becomes the single source of truth for the AI agent card grid

#### 2. Update `AdminToolsPage.tsx`
- Remove the inline AI AGENTS `items` array (lines 253-268) and replace it with a reference to `AgentRosterGrid` rendered inside the collapsible section
- Remove the debug badges: build ID pill (lines 771-773), "Canonical roster" pill, and agent signature pill (lines 778-781)
- Remove unused imports of `ADMIN_AI_BUILD_ID` and `ADMIN_AI_AGENT_SIGNATURE`
- The AI AGENTS collapsible section will render `<AgentRosterGrid showHubCard onAgentClick={(code) => navigate(\`/admin/ai-agents/\${code}\`)} />` directly
- Keep favorites support: the grid will accept the `toggleFavorite` and `adminFavorites` props so starring still works

#### 3. Update `AgentOverview.tsx` (used by AI Agent Hub)
- Replace the inline agent mapping with `<AgentRosterGrid onAgentClick={onAgentClick} />` (without Hub card since you're already in the Hub)
- Keep the stats row and relationship map above/below the grid

#### 4. Clean up `AIAgentHub.tsx`
- Remove the debug build ID and agent signature pills from the header (lines 65-68)
- Remove unused `ADMIN_AI_BUILD_ID` and `ADMIN_AI_AGENT_SIGNATURE` imports

#### 5. Harden state initialization (already mostly done, minor tightening)
- In `AdminToolsPage.tsx`, ensure `activeView` always defaults to `'dashboard'` on a full page refresh, ignoring any `location.state` that may have survived in browser history

### Files affected
- `src/components/admin-tools/agents/AgentRosterGrid.tsx` (new)
- `src/components/AdminToolsPage.tsx` (edit)
- `src/components/admin-tools/agents/AgentOverview.tsx` (edit)
- `src/pages/admin/AIAgentHub.tsx` (edit)

### Why this is permanent
- One component, one data source (`agentProfiles.ts`), used in both places
- No debug/verification UI left to confuse the display
- No duplicate card-building logic that can drift between files
- State initialization hardened against stale browser history

