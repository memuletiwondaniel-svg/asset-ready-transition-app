

## Agent Detail Page Layout Redesign

### What Changes

**1. Stack cards vertically with collapsible sections (matching Admin Tools pattern)**

Replace the current side-by-side `lg:grid-cols-5` layout in `AgentProfileView.tsx` with three stacked, collapsible sections using the exact same `Collapsible` + `CollapsibleTrigger` pattern from `AdminToolsPage.tsx` (lines 754-768):

- **ABOUT [AGENT NAME]** — the existing profile card content (introduction, collaborators, specializations, limitations)
- **KNOWLEDGE & TRAINING** — the `AgentTrainingStudio` component
- **PERFORMANCE** — the `AgentMonitorCard` component

Each section uses: `ChevronDown` with rotate animation, uppercase tracking label, horizontal rule, and item count — identical to Admin Tools sections.

Default state: all three sections expanded (unlike Admin Tools where they start collapsed).

**2. Add `AnimatedBackground` to the agent detail page**

Wrap the `AIAgentHub` page content area with the existing `AnimatedBackground` component (`src/components/ui/AnimatedBackground.tsx`) — the same dynamic color orb background used on the home page. Replace the static `bg-gradient-to-br from-background via-background to-muted/20` on the outer container.

**3. Add hover effects to tabs and icons in Knowledge & Training and Agent Monitor cards**

In both `AgentTrainingStudio.tsx` and `AgentMonitorCard.tsx`:
- `TabsTrigger`: add `hover:bg-accent/80 hover:text-foreground transition-all duration-200` and scale on hover (`hover:scale-[1.02]`)
- Icons inside tab triggers: add `group-hover:text-primary transition-colors` 
- Card header icons: add `hover:scale-110 transition-transform` effect

**4. Self-learning and continuous learning — current status**

Currently only **Fred** and **Selma** have self-learning infrastructure:
- `fred_interaction_metrics` + `fred_resolution_failures` + `fred_kpi_snapshots` tables
- `selma_interaction_metrics` + equivalent tables
- Performance scorer edge functions

**Bob, Hannah, Alex, and Ivan do NOT have interaction metrics tables or self-learning loops.** The Agent Monitor card shows empty states for these agents (`hasAnalytics` check on line 35 of `AgentMonitorCard.tsx` only returns true for `fred` and `selma`).

The Training Studio (knowledge ingestion) works for all agents, but the operational self-learning feedback loop (interaction logging → failure detection → KPI scoring) is only wired for Fred and Selma. Extending this to all 6 agents requires creating interaction metrics, resolution failures, and KPI snapshot tables for each — this is a separate migration effort.

### Files to Edit

| File | Change |
|------|--------|
| `src/components/admin-tools/agents/AgentProfileView.tsx` | Replace grid layout with 3 collapsible sections |
| `src/pages/admin/AIAgentHub.tsx` | Wrap content area with `AnimatedBackground` |
| `src/components/admin-tools/agents/AgentTrainingStudio.tsx` | Add hover effects to tabs/icons |
| `src/components/admin-tools/agents/AgentMonitorCard.tsx` | Add hover effects to tabs/icons |

### What is NOT in this scope
- Creating self-learning tables for Bob, Hannah, Alex, Ivan (separate effort — needs 12+ new tables and 4 edge functions)

