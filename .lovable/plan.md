## P2A Handover — Phase 2 redesign

Seven changes, grouped to minimise risk.

### 1. Tighter progress column

Shrink `P2A Progress` from `w-56` → `w-40`. Keep the stacked layout (% + `X/Y ready` on top, full-width bar below). The bar becomes punchier and stops hogging the row.

### 2. Add **Qualifications** column (always visible)

- Single clickable number: total count of `p2a_vcr_qualifications` rows attached to all prerequisites of the project's plan. Rendered as a subtle pill/link with hover underline; muted "—" when zero.
- Column sits between **Location** and **P2A Progress** in default order.
- Always visible — not toggleable in the Columns menu and not draggable out (still reorderable in position).
- **Click** opens a right-side `Sheet` overlay listing every qualification for that project:
  - Header: project title + total count + small status legend (Pending / Approved / Rejected).
  - Search input at the top — filters across reason, mitigation, action owner name, and prerequisite summary (case-insensitive, debounced).
  - Each row reuses the same visual pattern as `VCRQualificationsTab` (status badge, reason snippet, owner, target date, chevron).
  - Clicking a row opens the existing `QualificationDetailSheet` stacked on top.
- Data: extend `useProjectsP2AProgress` to also batch-fetch qualification *counts* per project in the same round-trip (one extra `.in('vcr_prerequisite_id', allPrereqIds)` query, group client-side). The full list is fetched on demand when the overlay opens via a new `useProjectQualifications(projectId)` hook.

### 3. Reorderable + resizable columns

Adopt **TanStack Table v8** (`@tanstack/react-table` — add dep) for the list view only. Grid/heatmap view stays separate.

- Define columns with `enableResizing`, `enableHiding`, `enableReordering`.
- **Drag-to-reorder**: header cells become `useSortable` (`@dnd-kit/sortable` already installed). Grab cursor on hover, lift effect during drag, drop indicator line between columns.
- **Resize**: right-edge handle on each header (1px line that thickens on hover, primary color on drag). Min 80px, max 600px.
- **Persistence**: save `{ columnOrder, columnSizing, columnVisibility }` per user to `localStorage` under `p2a-table-prefs-v1`.
- ID column locked (`enableReordering: false`, `enableHiding: false`); Qualifications is locked-visible but reorderable.
- "Reset layout" button in the Columns dropdown footer.

### 4. Subtitle rename

`"Browse and manage Project-to-Asset (P2A) deliverables and Verification Certificate of Readiness (VCRs)"`
→ `"Manage Project-to-Asset (P2A) Handover & Deliverables"`

### 5. P2A Handover icon refresh

Match PSSR-page pattern (`p-2 sm:p-3 rounded-xl bg-gradient-to-br ...`):

- Icon: swap `Key` for `KeyRound`.
- Gradient: `from-teal-500 to-cyan-600` (distinct from PSSR violet, ORA purple, OWL amber).
- Add `shadow-lg shadow-teal-500/20` for depth, white icon inside.

### 6. Sidebar icon tooltips

Wrap each `OrshSidebar` nav button with shadcn `<Tooltip>` showing the page name on hover (right side, 200ms delay). Add `TooltipProvider` at the layout root if not already present.

### 7. Replace grid/card view with **P2A Heatmap**

Toggle button keeps the grid icon; route renders `<P2AHeatmap />` instead of project cards.

Layout: matrix table
- **Rows** = projects (sticky left: ID badge + title).
- **Columns** = active `p2a_deliverable_categories` ordered by `display_order` (CMMS, Procedures, Documents, Training, Registers & Logsheets, System Readiness, 2Y Spares, SUOP, PSSR/SoF, PAC, FAC, OWL, …).
- **Cells** = colored tile showing `completed/total` (e.g. `5/12`). Color follows the same threshold (red < 25%, amber 25–74%, green ≥ 75%, muted if 0).

Behaviour:
- **Hover** → floating card with a 2-sentence executive summary: `"5 of 12 CMMS items delivered (42%). 2 in progress, 1 behind schedule."` + status breakdown chips. Generated client-side from `p2a_handover_deliverables`.
- **Click** → side `Sheet` overlay listing every deliverable in that cell with name, delivering party, status, completion date. Each row links to its VCR.

Data source:
- Query `p2a_handover_deliverables` joined via `p2a_handover_plans → project_id`, plus `p2a_deliverable_categories(name)`. One batch query for all visible projects.
- New hook: `useP2AHeatmapData()` returning `Record<projectId, Record<categoryId, { total, byStatus }>>`.

Empty cells render as a hatched/diagonal-stripe muted tile to distinguish from "0% done".

### Files

**New**
- `src/components/p2a/P2AHeatmap.tsx`
- `src/components/p2a/P2AHeatmapCell.tsx`
- `src/components/p2a/P2ADeliverableCellSheet.tsx`
- `src/components/p2a/ProjectQualificationsSheet.tsx` — searchable overlay for the Qualifications column
- `src/components/project/ProjectsTable.tsx` — TanStack-Table-based list view
- `src/components/project/DraggableTableHeader.tsx` — sortable + resizable header cell
- `src/hooks/useProjectQualifications.ts` — full qualifications list for one project (lazy)
- `src/hooks/useTablePreferences.ts` — localStorage persistence

**Modified**
- `src/components/project/ProjectsHomePage.tsx` — subtitle, icon, swap grid for heatmap, render `ProjectsTable` in list view
- `src/hooks/useProjectsP2AProgress.ts` — also return qualification counts per project
- `src/components/OrshSidebar.tsx` — wrap nav items in `Tooltip`
- `package.json` — add `@tanstack/react-table`
- `src/hooks/useP2AHeatmapData.ts` — already scaffolded; ensure it returns the per-category aggregation described above

### Out of scope

- Per-VCR drilldown inside the heatmap cell sheet beyond a link out to the existing VCR detail page.
- Server-side persistence of table layout (localStorage is sufficient per browser).
- Modifying other pages' icons.
