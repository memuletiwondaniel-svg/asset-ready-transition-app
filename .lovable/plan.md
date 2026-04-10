
Implement the fix exactly as a minimal, targeted patch in `src/components/AdminToolsPage.tsx`, with one additional safety migration for persisted collapse state.

1. Update the AI section to use the canonical plural label
- Change the section entry with `customContent: true` from `label: 'AI AGENT'` to `label: 'AI AGENTS'`.
- Keep `items: []`, `customContent: true`, `columns: 3`, `AgentRosterGrid`, and all click handlers unchanged.

2. Remove the fragile label-based render guard
- Replace the custom section render condition from:
  `customContent && section.label === 'AI AGENT'`
  to:
  `customContent`
- Apply this in both places:
  - the section count badge
  - the `CollapsibleContent` branch that decides between `AgentRosterGrid` and normal cards
- This makes `customContent: true` the only source of truth for roster rendering.

3. Align collapsed section persistence with the new label
- Update the default collapsed set from `'AI AGENT'` to `'AI AGENTS'`.
- Add a tiny migration in the lazy `collapsedSections` initializer so if localStorage contains the old singular value, it is converted to the plural value before creating the `Set`.
- This prevents old persisted state from breaking open/closed behavior after the label rename.

4. Do not change anything else in this file
- Keep imports as-is, including `AgentRosterGrid` and `agentProfiles`
- Keep `LEGACY_AI_AGENT_VIEWS` and redirect behavior
- Keep all other sections, cards, and routes unchanged

Why this is the correct fix
- I verified the current file still uses the brittle singular string in four places:
  - default collapsed set
  - section label
  - count badge condition
  - `AgentRosterGrid` render condition
- I also verified `customContent: true` exists only on this one AI section, so using that boolean alone is safe and more robust than string matching.
- This addresses the regression mechanism you described while preserving the existing architecture.

Technical details
- File: `src/components/AdminToolsPage.tsx`
- Exact changes:
  - `label: 'AI AGENT'` → `label: 'AI AGENTS'`
  - collapsed default `'AI AGENT'` → `'AI AGENTS'`
  - count condition: `customContent && section.label === 'AI AGENT'` → `customContent`
  - render condition: `customContent && section.label === 'AI AGENT'` → `customContent`
  - add persisted-state migration from old singular key value to new plural label during localStorage read

Validation after implementation
- Open `/admin-tools`
- Confirm the “AI AGENTS” section shows only `AgentRosterGrid` content:
  - AI Agents Hub
  - roster agent cards
- Confirm legacy cards do not appear under that section
- Refresh the page and verify the correct section still renders
- Test this end-to-end with existing localStorage state to confirm the migration works for returning users
