## Critique of the proposal

The reviewer is right on the big move and partly right on the rest.

- **Fold Scope under Title — yes, fully.** A paragraph column inside a list table is the wrong pattern; Linear / Notion / Height all use a primary title + muted subtitle for description. Reclaims the widest column on the page and the eye still reads "title → context". This is the single highest-leverage change.
- **Compact Milestone stack — yes, refined.** Reviewer's version is good but the current cell already nearly does this. The real win is dropping the redundant "No milestones" line on empty rows (recede to a single em-dash) so empty rows visually shrink.
- **Location → code-only with tooltip — push back.** Hiding "Hammar Mishrif" entirely behind a hover penalises new users and accessibility (keyboard / mobile have no hover). The right fix is: prefer the short station code as the primary text, fall back to plant name when no station, and rely on truncate + tooltip only when the value actually overflows. Keep the current `formatProjectLocation` output but render it in a `truncate` cell with a tooltip showing the full string — no information loss, no overflow.
- **Merged view-toggle icon — accept with one correction.** Reviewer's pattern (show only the *other* mode's icon as a toggle) is fine and matches buttons like play/pause or theme switchers. The icon must clearly represent the destination, not the current state, with an explicit tooltip ("Switch to heatmap" / "Switch to list"). Leave the third toolbar icon (column visibility) untouched — it's a different control, not part of the view switch.

## Plan

### A. Table — `src/components/project/ProjectsTable.tsx`

1. **Drop `scope` as a column.**
   - Remove `scope` from `PROJECTS_TABLE_COLUMNS` and from `PROJECTS_TABLE_DEFAULT_HIDDEN`.
   - Remove the `'scope'` case from the cell switch.
   - Bump `PROJECTS_TABLE_PREFS_KEY` to `p2a-projects-v3` so existing users pick up the new column set cleanly.

2. **Fold Scope under Title.**
   - In the `'title'` case, render a two-line stack:
     - Line 1: project title (`text-sm font-medium text-foreground`, `truncate`, hover → `text-primary`). Favorite star inline.
     - Line 2: `project.project_scope` as `text-xs text-muted-foreground truncate` with a tooltip showing the full scope. Omit the line when scope is empty (don't show an em-dash — vertical density stays consistent across rows because the title alone keeps its line).
   - Increase the Title column default width to ~320 to absorb most of the reclaimed space.

3. **Tighter Milestone cell.**
   - When `next_milestone_name` exists: phase name as primary line (`text-xs text-foreground`, truncate), Scorecard chip inline, date as `text-[11px] text-muted-foreground` underneath. Unchanged from today.
   - When no milestone: render a single muted em-dash (`text-xs text-muted-foreground/60`) instead of the "No milestones" text — empty rows recede.

4. **Location with safe truncation.**
   - Wrap the value in `truncate` with a `Tooltip` that shows the full string only when the text is truncated. Simplest implementation: always wrap with a tooltip, content = full location; visually still truncates with ellipsis. No abbreviation logic.

5. **Row height — keep `py-3`.** Two-line title rows already give the vertical room reviewer's mockup uses; no further change.

### B. Toolbar — `src/components/project/ProjectsHomePage.tsx`

1. Replace the two-button view toggle (lines ~157–198) with a single icon button that shows the **opposite** mode's icon:
   - When `viewMode === 'list'` → render `Grid` icon, tooltip "Switch to heatmap view", `aria-label="Switch to heatmap view"`, onClick sets `'heatmap'`.
   - When `viewMode === 'heatmap'` → render `List` icon, tooltip "Switch to list view", `aria-label="Switch to list view"`, onClick sets `'list'`.
   - Same `h-8 w-8 p-0 ghost` styling; subtle hover (`hover:bg-muted hover:text-foreground`) so the affordance is obvious.
2. Leave the `ProjectColumnsMenu` icon (column visibility) untouched — that's the third toolbar icon, a different control.

### Out of scope
- No DB / hook changes.
- No change to heatmap view itself.
- No change to row hover, sortable headers, status column, qualifications tinting, or progress bar from the previous round.

### Files
- `src/components/project/ProjectsTable.tsx` — columns array, prefs key, title cell, milestone empty state, location tooltip.
- `src/components/project/ProjectsHomePage.tsx` — collapse view toggle to a single icon button.

### Risk
- Prefs key bump resets table column order/width once. Users who hid Scope themselves are unaffected; users who reordered will be reset. Acceptable trade-off — Scope no longer exists as a column.
