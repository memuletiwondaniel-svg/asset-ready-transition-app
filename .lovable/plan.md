## Goal
Adopt the reviewer's tightening of `src/components/project/ProjectsTable.tsx` (the P2A Handover projects list). Keep the existing column-reorder / resize / preferences infrastructure intact — this is a presentation refactor only.

## Changes

### 1. ID column — neutral monospace chip
- Remove the per-project hue-randomized gradient (`getProjectColor` and its style on the badge).
- Render `DP-354` as a neutral chip: `bg-muted text-muted-foreground border border-border/60 font-mono text-[11px] tracking-tight px-2 py-0.5 rounded-md tabular-nums`.
- Keep the column width and the subtle hover lift, drop the gradient shadow.

### 2. New Status column (derived from `avg`)
- Add `{ id: 'status', label: 'Status', defaultWidth: 130, hideable: true }` to `PROJECTS_TABLE_COLUMNS`, inserted between `location` and `qualifications`. Not in `DEFAULT_HIDDEN`.
- Derive at render time from the existing `avg`:
  - `avg === 0` → "Not started" · dot `bg-muted-foreground/50`
  - `0 < avg < 100` → "In progress" · dot `bg-primary` (teal/indigo per theme)
  - `avg >= 100` → "Complete" · dot `bg-emerald-500`
- Render as a small colored dot + label, label in `text-sm text-foreground` (muted variant for Not started).
- Bump `PROJECTS_TABLE_PREFS_KEY` to `p2a-projects-v2` so the new column appears for existing users without manual reset.

### 3. Qualifications — severity tint
Replace the single amber chip with the user's tier:
- `0` → muted dash (unchanged)
- `1–5` → amber chip (`bg-amber-500/10 text-amber-700 dark:text-amber-300`)
- `6–10` → deeper amber (`bg-amber-500/20 text-amber-800 dark:text-amber-200`)
- `>10` → red (`bg-rose-500/15 text-rose-700 dark:text-rose-300`)
- Keep the existing tooltip + click-to-open-qualifications behaviour.
- Right-align the cell content (`justify-end`).

### 4. Progress column — tighter unit, right-aligned %
- Right-align cell, keep `flex items-center gap-2`, give the bar `flex-1` and percentage `tabular-nums w-10 text-right`.
- Keep the existing semantic bar colors (`emerald / amber / rose / muted`) — already correct.

### 5. Numeric alignment + density
- `qualifications` and `progress` cell wrappers: `flex justify-end items-center`.
- Header labels for those two columns: `text-right`.
- Row vertical padding: `py-3` (down from `py-4`) for a slightly denser scan. Keep `px-5`.

### 6. Sortable headers
- Add a `sort` state in `ProjectsTable`: `{ key: 'id'|'title'|'location'|'status'|'qualifications'|'progress', dir: 'asc'|'desc' } | null`.
- `HeaderCell` becomes clickable for sortable columns (all except the row-actions slot). Show a `ChevronUp` / `ChevronDown` next to the active column, dim placeholder chevron on hover for others.
- Sort `projects` with `useMemo` before rendering. Numeric sort for qualifications/progress; locale-string sort for id/title/location/status.
- Drag-to-reorder still works — click sorts, pointer-drag on the grip reorders (already wired via `attributes`/`listeners`).

### 7. Loading and empty states
- Add a `loading?: boolean` prop. When true, render 5 skeleton rows (`<div className="animate-pulse bg-muted/40 h-10 rounded" />` per cell) instead of the project list.
- When `!loading && projects.length === 0`, render an empty state: centered, with a muted `FolderOpen` icon, "No projects yet" headline, and "Create your first project" subtext.
- `ProjectsHomePage` wires `loading={isLoading}` through (verify hook name when implementing).

### 8. Row hover (already present)
- Keep the existing gradient hover + left inset accent. No change.

## Out of scope
- No DB schema change (no real `status` field — derived only).
- No change to column drag-and-drop, resize, preferences, or qualifications drawer.
- No toolbar / page header changes.

## Files
- `src/components/project/ProjectsTable.tsx` — all visual changes, sort state, skeleton/empty, status column, prefs key bump.
- `src/components/project/ProjectsHomePage.tsx` — pass `loading` prop through.

## Risk notes
- Bumping `PROJECTS_TABLE_PREFS_KEY` resets per-user column widths/order once; acceptable trade-off so the new Status column appears.
- The reviewer's "row hover + cursor pointer" is already in place; no regression.
