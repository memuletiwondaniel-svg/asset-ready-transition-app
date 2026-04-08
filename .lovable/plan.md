

## Plan: Reorganize Admin Tools — New "AI AGENT" Section

### What Changes

1. **Rename existing `AI AGENTS` section** to `AI CONFIGURATION` — it keeps its 3 tool cards (Agent Registry, Auto-Update Controls, Training & Feedback).

2. **Create new `AI AGENT` section** — gets the `customContent: true` flag and renders the `AgentRosterGrid` (Hub + Bob, Selma, Fred, Ivan, Hannah, Alex). Placed directly above `AI CONFIGURATION` in the section order.

3. **Update all references** — the `collapsedSections` default set, the item count logic (`section.label === 'AI AGENTS'` → `'AI AGENT'`), and the `CollapsibleContent` custom render check.

### File to Edit

| File | Change |
|------|--------|
| `src/components/AdminToolsPage.tsx` | Rename `AI AGENTS` label to `AI CONFIGURATION`, move its 3 cards to standard items, create new `AI AGENT` section with `customContent: true` and empty items array, update collapsed defaults and label checks |

### Specific Changes in `AdminToolsPage.tsx`

**Section definitions (~line 254):**
- Change existing section from `label: 'AI AGENTS'` with `customContent: true` and empty items → `label: 'AI CONFIGURATION'` with the 3 cards (Agent Registry, Auto-Update Controls, Training & Feedback) as standard items, no `customContent`.
- Insert a new section before it: `{ label: 'AI AGENT', columns: 3, items: [], customContent: true }`

**Collapsed sections default (~line 131):**
- Replace `'AI AGENTS'` with `'AI AGENT'` and add `'AI CONFIGURATION'`

**Render logic (~lines 762, 769):**
- Change `section.label === 'AI AGENTS'` to `section.label === 'AI AGENT'` in both the count display and the `AgentRosterGrid` conditional

