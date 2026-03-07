

## Plan: Remove strikethrough from completed activities & sort all activities by date

### Changes

#### 1. Remove strikethrough from completed activities (`ORPActivityPlanWidget.tsx`)
- Line 57: Remove `line-through` from the completed activity class. Keep the muted color and green checkmark icon — that's sufficient visual differentiation.

#### 2. Sort activities strictly by date across both sections
The current approach already sorts IN_PROGRESS first, then by start_date. For a cleaner, more predictable UX, activities within each section should be sorted strictly by date:
- **Ongoing/Upcoming section**: Sort by `start_date` ascending (soonest first). The amber/grey/red icons already distinguish ongoing vs upcoming vs overdue — no need to group by status.
- **Recently Completed section**: Keep current sort by `end_date` descending (most recent first).

This means an ongoing activity that started last week appears before an upcoming activity starting next week — which is the natural chronological reading order. The icon colors (amber for ongoing, grey for upcoming, red for overdue) provide the status context without needing status-based grouping.

### Files to modify
- `src/components/widgets/ORPActivityPlanWidget.tsx` — remove `line-through`, update sort in upcoming to be purely date-based
- `src/hooks/useProjectORPPlans.ts` — remove IN_PROGRESS-first sort priority, use pure `start_date` ascending

