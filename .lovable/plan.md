

## Kanban Column Header Redesign

### Current State
Each column header has: a small colored dot + an icon + bold label on the left, and a count badge on the right, all inside a tinted background strip (`bg-blue-50/70`, `bg-amber-50/70`, etc.).

The colored dot is redundant — it duplicates the visual signal already conveyed by the icon and the tinted background.

### Proposed Design

Replace the current header layout with a **centered title** approach and **color-tinted icons** (no dots):

```text
┌──────────────────────────────────┐
│  [4]     ○ To Do        ·       │  ← centered title + icon, count badge left
│          blue icon               │
├──────────────────────────────────┤
│  cards...                        │
```

Specifically:

1. **Remove the colored dot** — it adds no information.
2. **Color the icon itself** instead of leaving it muted gray. Each column icon gets its status color:
   - To Do: `text-blue-500` + `Circle`
   - In Progress: `text-amber-500` + `Loader2`
   - Waiting: `text-slate-400` + `Clock`
   - Done: `text-emerald-500` + `CheckCircle2`
3. **Center the title block** (icon + label) within the header using `justify-center` with the count badge absolutely positioned on the right.
4. **Slightly increase header padding** (`py-3`) and use a **subtle bottom border** instead of the full tinted background — keeping a very light tint for polish but reducing visual noise.

### File Changes

**`src/components/tasks/TaskKanbanBoard.tsx`**

- Update `getColumns` definition: remove `dotColor`, add `iconColor` (e.g., `'text-blue-500'`).
- Update the column header JSX (~line 582-589):
  - Remove the dot `<div>`.
  - Apply `col.iconColor` to `<ColIcon>`.
  - Use `relative` on the header container, `justify-center` for the icon+label group, and position the badge with `absolute right-3`.

Single file, ~15 lines changed.

