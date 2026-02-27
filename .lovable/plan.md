

## Redesign: Gantt Chart Activity Section

Both `StepSchedule.tsx` (wizard) and `ORPGanttChart.tsx` (plan view) need a modern redesign with structured columns and extended zoom range.

### Changes to Both Gantt Components

#### 1. Structured Column Layout (Left Panel)
Replace the current cramped activity info area with a proper table-like layout with distinct columns:

```text
┌──────────┬────────────────────┬────────────┬────────────┬──────┬─────────────┬─────────────────┐
│ Activity │ Activity Name      │ Start Date │ End Date   │ Days │ Status      │ Timeline bars…  │
│ ID       │                    │            │            │      │             │                 │
├──────────┼────────────────────┼────────────┼────────────┼──────┼─────────────┼─────────────────┤
│ IDN-001  │ Identify Hazards   │ 01 Mar     │ 15 Mar     │  14  │ Not Started │ ████████        │
│ ASS-002  │ Assess Risks       │ 10 Mar     │ 25 Mar     │  15  │ In Progress │    ██████████   │
└──────────┴────────────────────┴────────────┴────────────┴──────┴─────────────┴─────────────────┘
```

- **Activity ID**: Phase-colored badge (blue for IDN, amber for ASS, emerald for SEL, teal for DEF, rose for EXE, purple for OPR) — uses existing `PHASE_COLORS` mapping
- **Activity Name**: Truncated text, full name on hover
- **Start Date**: Formatted `dd MMM` (editable input in wizard, read-only in review)
- **End Date**: Formatted `dd MMM` (auto-calculated in wizard, read-only in review)
- **Duration**: Number of days (editable in wizard)
- **Status**: Badge showing Not Started / In Progress / Completed with appropriate colors

#### 2. Extended Zoom Range
- **StepSchedule.tsx**: Change min zoom from `0.5` to `0.15` (allows ~24 months at typical widths)
- **ORPGanttChart.tsx**: Add lower zoom levels: `[0.15, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]`
- Add preset buttons: "6M", "12M", "24M" for quick timeline views

#### 3. Visual Polish
- Sticky left columns (activity info stays visible while scrolling timeline)
- Alternating row backgrounds for readability
- Thinner, more refined grid lines
- Bar colors matched to phase-colored Activity ID badges
- Row height standardized to single-line (compact ~40px)

### Files Modified

1. **`src/components/ora/wizard/StepSchedule.tsx`** — Full rewrite of left panel to columnar layout; add status column (defaults to "Not Started" for wizard); extend zoom min to 0.15; add preset timeline buttons
2. **`src/components/orp/ORPGanttChart.tsx`** — Restructure left panel with Activity ID (colored badge), Name, Start, End, Duration, Status columns; extend zoom levels; add preset buttons

