

# UI/UX Assessment: Gantt Chart, Task Cards, Task Detail Overlays & Wizards

## Executive Summary

The system has strong functional depth — bidirectional sync, hierarchical Gantt, approval workflows, drag-and-drop Kanban — but several UI/UX gaps exist when measured against modern enterprise SaaS standards (Linear, Notion, Monday.com, Asana). Below are the identified gaps and proposed improvements.

---

## Gap 1: Gantt Chart Lacks Inline Editing & Hover Context

**Current state**: Clicking a row opens a full overlay sheet. No quick-edit capability exists inline. The 11px font and dense columns make scanning difficult on smaller screens.

**Improvements**:
- Add a **hover tooltip card** on Gantt bars showing: name, dates, progress, assignee, and status — without opening the full sheet
- Allow **inline date editing** by double-clicking start/end cells in the left panel (converts to a date picker in-place)
- Add a **row highlight on hover** with a subtle left-border accent color matching the phase
- Add **keyboard navigation**: arrow keys to move between rows, Enter to open the detail sheet, Escape to close

---

## Gap 2: No Visual Feedback During Gantt Bar Drag

**Current state**: When dragging a bar, only `cursor-grabbing` and a ring appear. No tooltip shows the new dates being set. Users must guess where they're dropping.

**Improvements**:
- Show a **live date tooltip** anchored to the cursor during drag: `"Mar 15 → Apr 22 (38d)"`
- Add **snap-to-grid visual guides** — faint vertical lines at week boundaries that highlight when the bar edge approaches them
- Show a **ghost bar** at the original position (faded) while dragging so users see the delta

---

## Gap 3: Task Card → Overlay Transition Is Jarring

**Current state**: The sheet slides in from the right with no animation preview of which card was clicked. Two separate sheet components (`TaskDetailSheet` for reviews, `ORAActivityTaskSheet` for activities) with different layouts and behavior.

**Improvements**:
- Add a **card-to-sheet morph animation**: the clicked card subtly expands/transforms into the sheet origin point
- **Unify the sheet header pattern**: both sheets should share the same header template — activity code badge, title, overdue pill, project ID — in the same visual order
- Add a **breadcrumb trail** in the sheet header: `Gantt → EXE-10 → Develop P2A Plan` showing navigation context

---

## Gap 4: Inconsistent Status Color Language

**Current state**: The Gantt uses `slate/amber/green/red` for NOT_STARTED/IN_PROGRESS/COMPLETED/ON_HOLD. The Kanban board uses different badge styles. The ORA overlay uses yet another pattern (gray-200, amber-500, green-500 for the toggle buttons).

**Improvements**:
- Create a **shared status theme map** (`statusColors.ts`) used by all views: Gantt bars, Kanban columns, overlay toggles, and badge pills
- Standardize: `slate` = Not Started, `amber` = In Progress, `emerald` = Completed, `red` = On Hold/Overdue — consistently everywhere

---

## Gap 5: No Contextual Actions on Gantt Rows

**Current state**: Right-clicking or long-pressing a Gantt row does nothing. The only actions are: click (open sheet) or drag (move bar).

**Improvements**:
- Add a **context menu** (right-click or `...` button) on each row: "Edit Dates", "Change Status", "Add Predecessor", "View Details", "Delete"
- Add **quick-status toggle** directly in the status column (click the badge to cycle through statuses)

---

## Gap 6: Overlay Sheet Is Too Long — No Section Navigation

**Current state**: `ORAActivityTaskSheet` is 1628 lines and renders a single long scrollable sheet with Description, Schedule, Status, Prerequisites, Attachments, Reviewers, and Activity Feed all stacked vertically.

**Improvements**:
- Add **tabbed sections** or **collapsible accordion panels** inside the sheet: Details | Schedule | Approvals | Activity
- Show a **mini progress ring** in the sheet header so users see completion at a glance without scrolling
- Pin the **Save/Submit button bar** to the bottom of the sheet (currently it scrolls away)

---

## Gap 7: Calendar Picker UX Is Weak

**Current state**: Start and end dates share a single calendar toggle. The range calendar is collapsed by default and takes a full click to reveal. No keyboard shortcut support.

**Improvements**:
- Use separate **popover calendars** for start and end dates (clicking each button opens its own picker)
- Add **smart date shortcuts**: "Today", "+1w", "+2w", "+1m" as chip buttons below the calendar
- Support **keyboard date input** — let users type dates directly in `MMM d, yyyy` format

---

## Gap 8: No Undo/Redo for Gantt Drag Operations

**Current state**: Dragging a bar immediately persists to the database. If the user makes a mistake, they must re-drag or open the overlay to fix dates manually.

**Improvements**:
- Show a **toast with Undo button** after each drag operation (5-second window)
- Store the previous state in a ref and reverse the DB write on undo

---

## Gap 9: Kanban ↔ Gantt View Switching Has No State Continuity

**Current state**: Switching between Kanban and Gantt views resets scroll position, search filters, and selection state. No visual indicator of "you were looking at this task."

**Improvements**:
- **Persist scroll position and search query** across view switches using a shared context/store
- When switching from Kanban to Gantt, **auto-scroll to and highlight** the row of the last-clicked task
- Add a **split view option**: Gantt on top, detail panel on bottom (like MS Project)

---

## Gap 10: Mobile Responsiveness Is Insufficient

**Current state**: The Gantt chart renders the same column widths (`COL_WIDTHS` totaling ~674px) regardless of viewport. At the user's current 384px viewport, it overflows significantly. The overlay sheets are better but still have touch target issues.

**Improvements**:
- On mobile viewports (<768px), **collapse the Gantt to a timeline list view** — each activity as a card with a horizontal progress bar instead of a full Gantt grid
- Increase **touch targets** in the overlay: the status toggle buttons should be at least 44px tall (currently `py-3` ≈ 36px)
- Use **bottom sheets** instead of side sheets on mobile for the task detail overlay

---

## Implementation Priority

| Priority | Gap | Impact | Effort |
|----------|-----|--------|--------|
| P0 | Gap 4: Unified status colors | High — consistency | Low |
| P0 | Gap 2: Drag date tooltip | High — usability | Low |
| P1 | Gap 6: Tabbed overlay sections | High — scannability | Medium |
| P1 | Gap 8: Undo toast for drag | High — error recovery | Low |
| P1 | Gap 5: Context menu on rows | Medium — discoverability | Medium |
| P2 | Gap 1: Hover tooltip on bars | Medium — quick info | Low |
| P2 | Gap 7: Better calendar UX | Medium — efficiency | Medium |
| P2 | Gap 3: Card-to-sheet animation | Medium — polish | Low |
| P2 | Gap 9: View switch continuity | Medium — workflow | Medium |
| P3 | Gap 10: Mobile Gantt fallback | Low (desktop-primary) | High |

