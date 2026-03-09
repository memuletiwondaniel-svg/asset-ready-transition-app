

## UX Analysis: Progress Bar on In-Progress Task Cards

### Current State
The "In Progress" cards show a full-width `<Progress>` bar (1px height) with the default `bg-primary` fill color (a saturated purple/blue) and the percentage in `text-primary`. This creates two issues:

1. **Visual weight**: The saturated primary color draws disproportionate attention to the progress bar rather than the task title or status labels. On the screenshot, it visually competes with the Project ID badge and the "Overdue" label.

2. **Color clash**: The primary-colored bar sits alongside amber column headers, red overdue labels, and blue project badges — too many competing hues on small cards.

### Recommendation

**Keep the progress bar** — it's the right pattern for "In Progress" cards (compact, scannable, communicates completion at a glance). But **mute it significantly**:

| Element | Current | Proposed |
|---------|---------|----------|
| Bar track | `bg-secondary` | `bg-muted/40` (lighter) |
| Bar fill | `bg-primary` (saturated) | `bg-muted-foreground/40` (neutral gray) |
| Percentage text | `text-primary` (saturated) | `text-muted-foreground` (neutral) |

This follows the modern "quiet UI" pattern (Linear, Notion, Asana) where progress indicators are **informational but not attention-grabbing** — the task title and status labels remain the primary visual hierarchy.

### Changes

**File: `src/components/tasks/TaskKanbanBoard.tsx`** (lines 267-271)
- Add `indicatorClassName="bg-muted-foreground/40"` to the `<Progress>` component
- Change progress track: add `className="h-1 flex-1 bg-muted/40"` 
- Change percentage text from `text-primary` to `text-muted-foreground`

This is a 3-property change in a single location — minimal, targeted, and immediately visible.

