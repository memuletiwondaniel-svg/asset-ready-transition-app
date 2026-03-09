

# Kanban Board UI/UX Audit & Improvement Plan

## Current State Analysis

The current Kanban board uses:
- A 4-column grid (`grid-cols-4`) with `bg-muted/30` rounded containers
- A thin colored `border-t-2` line (blue/amber/grey/green) as the only column identity signal
- White task cards with subtle borders, compact 9-11px typography
- Drag handles that appear on hover
- Gradient/tapered column backgrounds that blur visual boundaries between columns

### Issues Identified (vs. Linear, Notion, Jira, Asana, Monday.com)

1. **Weak column identity** — The thin 2px top-border color is the only visual differentiator. The `bg-muted/30` background is identical across all columns, making boundaries hard to read at a glance, especially on wide screens.

2. **Cards lack visual weight** — Cards are flat, low-contrast, and dense. Modern boards (Linear, Notion) use slightly elevated cards with more whitespace and a clearer visual hierarchy.

3. **No column "swim-lane" feel** — There's no visual gap or separator between columns. The grid gap is only `gap-3/4`, and the similar backgrounds make them merge.

4. **Typography is too small** — Task titles at `text-[11px]` and metadata at `text-[9px]` are below comfortable reading size. Best practice is 13-14px for card titles.

5. **Drag affordance is hidden** — The grip handle is `opacity-0` until hover, which breaks discoverability. Modern boards either always show a subtle handle or make the entire card draggable with cursor feedback.

6. **Drop zone feedback is minimal** — Only a faint `bg-primary/5 ring-1` on hover. Leading apps use a visible placeholder/gap where the card will land.

7. **Empty state is too sparse** — "No tasks" as tiny muted text doesn't convey meaning. Modern apps use illustrations or contextual messages.

8. **Column count badge is too small** — `text-[10px]` badge is hard to read. Should be more prominent.

9. **No card hover micro-interactions** — Cards only get `hover:shadow-sm`. Modern boards lift cards slightly with a translate or show a subtle colored left-border accent.

---

## Recommended Improvements

### 1. Column Identity Overhaul
Replace the thin top-border with a **colored column header pill/banner** — a wider colored bar or a tinted header background (e.g., soft blue tint for "To Do", soft amber for "In Progress"). Remove the identical `bg-muted/30` body and use a very subtle per-column tint or pure white/transparent body with clear column borders.

### 2. Card Elevation & Spacing
- Increase card padding from `p-2` to `p-3`
- Add a subtle `shadow-sm` at rest (not just hover)
- Increase title font to `text-xs` (12px) and metadata to `text-[10px]`
- Add `hover:-translate-y-0.5 hover:shadow-md` for a lift effect
- Add a 3px left-border accent colored by status (blue=todo, amber=progress, green=done)

### 3. Column Separation
- Increase gap from `gap-4` to `gap-5`
- Give columns a distinct background: white card-like surface with a `shadow-sm` and solid `border`
- Make column headers sticky with bolder typography (`text-sm font-bold`)

### 4. Drag & Drop Polish
- Make drag handle always visible at 30% opacity (not hidden)
- During drag-over, show a dashed placeholder card in the target column indicating the drop position
- Increase the drag overlay scale to `1.03` with a stronger shadow

### 5. Column Header Enhancement
- Show count in a more prominent circular badge
- Add a subtle column-specific icon (e.g., circle for To Do, spinner for In Progress, clock for Waiting, check for Done)

### 6. Empty State
- Replace "No tasks" with a subtle icon + message (e.g., a check icon with "All clear" for Done, "Nothing waiting" for Waiting)

### 7. Card Status Accent
- Add a thin left-border to each card matching the column color — this maintains identity even when scrolling long lists

---

## Implementation Details

### Files to modify:
- **`src/components/tasks/TaskKanbanBoard.tsx`** — All visual changes: column container styles, card component, drag overlay, empty states, header layout

### Specific changes:

**COLUMNS config** (line 64-69):
```typescript
const COLUMNS = [
  { key: 'todo', label: 'To Do', accent: 'border-l-blue-500', headerBg: 'bg-blue-50 dark:bg-blue-950/30', icon: Circle },
  { key: 'in_progress', label: 'In Progress', accent: 'border-l-amber-500', headerBg: 'bg-amber-50 dark:bg-amber-950/30', icon: Loader2 },
  { key: 'waiting', label: 'Waiting', accent: 'border-l-slate-400', headerBg: 'bg-slate-50 dark:bg-slate-900/30', icon: Clock },
  { key: 'done', label: 'Done', accent: 'border-l-emerald-500', headerBg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2 },
];
```

**Column container** (line 487):
- Replace `bg-muted/30 rounded-xl border border-border/50 border-t-2` with `bg-card rounded-xl border border-border shadow-sm`
- Use a tinted header row instead of top-border

**Card component** (lines 188-281):
- Increase padding, font sizes, add left-border accent, add hover lift, always-visible drag handle at low opacity
- Add `border-l-3` using the column accent color passed as a prop

**Empty states** (line 440):
- Per-column contextual empty messages with small icons

### No changes to:
- Drag-and-drop logic, task data model, or any hooks
- This is purely a visual/CSS refactor

