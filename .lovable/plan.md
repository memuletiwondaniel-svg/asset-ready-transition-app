

# Gap 9 Assessment: Navigation & Split View Analysis

## Your Observation Is Correct

The Kanban board on **My Tasks** (`/my-tasks`) shows all projects' tasks in a unified view. The Gantt chart lives inside the **ORA Plan Details** page (`/operation-readiness/:id`), which requires: Home → Operation Readiness → Select Project's ORA Plan → Activity Plan tab → Gantt toggle. These are fundamentally different scopes (personal task queue vs. project schedule), so a direct "switch" between them was never the real problem — **the real problem is that the Gantt is buried 3-4 clicks deep**.

## Split View Assessment (MS Project-style)

### Would It Add Value?
**Moderate value, but with significant caveats.**

In MS Project, the split view works because both panes operate on the same dataset (a single project schedule). Here, the Gantt already opens the same `ORAActivityTaskSheet` when you click a row — that IS the detail panel. Adding a persistent bottom panel showing the same sheet content would:

- **Pro**: Eliminate the sheet open/close cycle when reviewing multiple activities sequentially
- **Pro**: Let users see schedule context (bar positions, dependencies) while editing details
- **Con**: On the 384px viewport you're currently using, a vertical split would make both panes unusably small
- **Con**: The detail panel MUST be the same `ORAActivityTaskSheet` — duplicating it would break sync guarantees

### How Modern Enterprise SaaS Apps Handle This

The dominant pattern in 2025-2026 enterprise SaaS (Linear, Notion, Monday.com, Asana, ClickUp) is **NOT** a fixed split view. Instead:

1. **Inline expandable rows** (Linear, Notion) — click a row, it expands in-place showing details below the row
2. **Persistent side panel** (Asana, ClickUp) — a right-side panel that stays open as you click different rows, updating content without closing
3. **Drawer with keyboard navigation** (Linear) — sheet opens, arrow keys navigate to next/previous task without closing

The current side sheet approach is actually close to pattern #2. The gap is that clicking a different Gantt row closes and reopens the sheet instead of smoothly transitioning.

## Recommended Plan: Persistent Detail Panel + Quick Navigation

Instead of a split view, implement a **persistent right panel** on the Gantt that stays open and updates when clicking different rows, plus add a **project-scoped Gantt shortcut** from the Kanban board.

### Changes

**1. Persistent Detail Panel on Gantt (ORPGanttChart.tsx)**
- When a Gantt row is clicked, open the `ORAActivityTaskSheet` as a persistent side panel (not a modal sheet that unmounts)
- Clicking another row swaps the content without close/reopen animation
- Add up/down arrow buttons in the sheet header to navigate to previous/next activity
- This reuses the SAME `ORAActivityTaskSheet` — zero sync risk

**2. Quick Gantt Access from Task Cards (TaskKanbanBoard.tsx)**
- Add a small "View in Gantt" icon button on ORA activity task cards in the Kanban board
- Clicking it navigates directly to `/operation-readiness/:planId` with a query param `?highlight=ACTIVITY_CODE` that auto-scrolls to and highlights the activity row
- Reduces the 4-click navigation to 1 click

**3. View State Persistence (ORPDetailsPage.tsx)**
- Store `activityView` (gantt/kanban), `searchQuery`, and scroll position in a `useRef` or session-scoped context
- When switching between Gantt and Kanban within the ORA plan page, preserve these values

### Files Modified

| File | Change |
|------|--------|
| `src/components/orp/ORPGanttChart.tsx` | Persistent panel mode: keep sheet open, swap content on row click, add prev/next nav |
| `src/components/tasks/TaskKanbanBoard.tsx` | Add "View in Gantt" button on ORA activity cards |
| `src/components/orp/ORPDetailsPage.tsx` | Persist view state across tab switches, handle `?highlight` query param |
| `src/components/tasks/ORAActivityTaskSheet.tsx` | Add prev/next navigation props and smooth content transition |

### What This Does NOT Do
- No split view — it would degrade the mobile experience you're currently viewing at 384px
- No separate detail panel component — reuses `ORAActivityTaskSheet` exactly as-is, preventing sync divergence
- No changes to business logic, database, or hooks

