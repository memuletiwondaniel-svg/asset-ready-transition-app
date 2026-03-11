

## Task Card Redesign — Modern UI/UX

### Design Decisions

**Remove calendar icon and raw dates.** Showing "Mar 5 → Mar 12" adds cognitive load without actionable insight. Modern task UIs (Linear, Notion, Asana) rely on **smart labels** that tell users what matters: urgency context.

**Keep only smart urgency labels:**
- **Overdue** — red pill badge (`bg-red-100 text-red-700`)
- **Due today** — amber pill badge (`bg-amber-100 text-amber-700`)
- **Completed** — emerald pill badge (`bg-emerald-100 text-emerald-700`)

**Remove "7d left", "Soon", and "Xd overdue" variants.** These create label fragmentation. Three states are sufficient: Overdue, Due Today, and Completed. If it's not overdue or due today, no label is needed — the task simply exists in its column.

**Use colored pill badges instead of colored text.** A filled pill badge (subtle background + bold text) is far more scannable than plain colored text. This is the standard pattern in Linear, GitHub, and Notion.

**Dates are not shown on the card face.** Users who need date details open the task sheet. The card surface stays clean.

### Visual Layout (per card)

```text
┌─────────────────────────────────────┐
│ ⋮⋮  DP-300          [Overdue]      │  ← drag handle + project ID + status pill
│                                     │
│ Develop P2A Plan                    │  ← title, medium weight
│                                     │
│ ████████░░░░  45%                   │  ← progress bar (in-progress only)
└─────────────────────────────────────┘
```

### Technical Changes

**File: `src/components/tasks/TaskKanbanBoard.tsx`**

1. **Simplify `getDateAnnotation`** — return only three variants: `'overdue'`, `'today'`, or `null`. Remove `'upcoming'` logic and the "Xd overdue"/"Xd left" label strings.

2. **Update `KanbanCardContent`** — Remove the entire dates row (lines 286-300: the `Calendar` icon, `format()` calls, start/end date spans). Remove the `sp.isStartingSoon` "Soon" badge.

3. **Restyle status labels as pill badges** — Replace the current `text-[9px]` inline colored text with proper pill badges:
   - Overdue: `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
   - Due today: `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
   - Completed: `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`
   - Use `text-[10px] font-semibold px-2 py-0.5 rounded-full` for consistent pill styling.

4. **Remove unused imports** — `Calendar`, `format` (if no longer needed elsewhere in this component).

Single file, ~30 lines changed.

