## Redesign P2A Handover Table

Target file: `src/components/project/ProjectsHomePage.tsx` (list view at `/projects`).

### New column set (left → right)

| # | Column | Default | Notes |
|---|---|---|---|
| 1 | **ID** | Visible | Keep gradient code badge (DP-300 etc.) |
| 2 | **Project Title** | Visible | Bigger, primary weight; subtle hover underline |
| 3 | **Scope** | Hidden | Toggle from Columns menu |
| 4 | **Milestone** | Hidden | Toggle from Columns menu |
| 5 | **Location** | Visible | Custom formatting (see rules) |
| 6 | **P2A Progress** | Visible | Progress bar + % (multi-VCR aware) |
| 7 | **⋯** | On hover | Row actions: Favorite, Delete |

Remove from default view: Portfolio, Hub, Plant, Team, Fav star column (favorite moves into ⋯ menu).

### Location formatting rules

Derived from `plant_name` + `station_name`:

- Plant `BNGL`, `KAZ`, `NRNGL` → display plant code only (`BNGL`, `KAZ`, `NRNGL`).
- Plant `UQ` → display `UQ-ST` or `UQ-MT` (inferred from station_name keyword: "Sweet" → `UQ-ST`, "Murjan"/"MT" → `UQ-MT`; fallback to `UQ`).
- Plant `CS` → display station only (e.g. `Hammar Mishrif (HM)`, `CS6`, `Rafidyah`), drop the `CS` prefix.
- Anything else → fall back to `plant_name`.
- No plant → `—`.

Implement as a small helper `formatProjectLocation(project)` in the same file (or `src/utils/projectLocation.ts`).

### P2A Progress column

For each project, fetch its plan + VCRs and compute progress.

- **0 VCRs**: show muted `No VCRs` text.
- **1 VCR**: single progress bar + `NN%`.
- **>1 VCR**: show **average %** as the main bar and `NN%` label, with a small chip `N VCRs` next to it. Render the bar as a **segmented stack** (one slice per VCR, colored by its own %) so users see each VCR's progress at a glance without tooltips/popovers. Hovering shows native browser title attr only (no custom popover) — kept minimal per the no-overlay rule.

Color thresholds (reusing existing convention from `AllTasksTable`):
- `>= 75%` green, `25–74%` amber, `< 25%` red, `0%` muted.

Data source: new hook `useProjectsP2AProgress(projectIds)` that batch-queries `p2a_handover_plans` joined with `p2a_handover_points` + prerequisite progress, returning `{ projectId: { vcrs: [{id, code, progress}], avg } }`. Single round-trip keyed by project IDs to avoid N+1.

### Row hover action menu (⋯)

- Three-dot button appears only on row hover (`opacity-0 group-hover:opacity-100`), right-aligned.
- `DropdownMenu` with:
  - **Mark as favorite / Remove favorite** — toggles `is_favorite` (already in DB → already persists across logout). Favorites auto-sort to top (replacing current hardcoded `pinnedOrder`).
  - **Delete project** — confirmation dialog → soft delete (`is_active = false`) using existing pattern.

### Sorting

Replace hardcoded `pinnedOrder` array with: favorites first (by title), then the rest by current order. This naturally retains a user's pinned rows across sessions because `is_favorite` is stored server-side per project.

### Visual polish (modern/professional)

- Increase row height to `py-4`, add `hover:bg-muted/40` and subtle left-border accent on hover (`group-hover:border-l-2 group-hover:border-primary`).
- Header: lighter background, `text-[11px] tracking-[0.08em] uppercase text-muted-foreground/80`.
- Card wrapper: `rounded-xl border-border/60 shadow-sm` instead of current flat look.
- Use `tabular-nums` for the % label so bars align cleanly.
- Sticky table header inside the card for long lists.
- Keep all styling on semantic tokens (no raw colors).

### Files to touch

1. `src/components/project/ProjectsHomePage.tsx` — column set, header, row, hover menu, sort logic, default `columnVisibility`.
2. `src/hooks/useProjectsP2AProgress.ts` *(new)* — batched progress fetch.
3. `src/utils/projectLocation.ts` *(new)* — `formatProjectLocation` helper.
4. (Optional) extract row into `src/components/project/P2AHandoverRow.tsx` if `ProjectsHomePage.tsx` grows past ~650 lines.

No backend/schema changes required — `is_favorite`, `is_active`, plan/VCR tables already exist.

### Out of scope

- Grid/card view (untouched).
- Filters panel changes.
- Any non-presentation logic beyond the favorite/delete actions already supported by the data model.
