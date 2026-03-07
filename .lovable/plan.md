

## Plan: Redesign ORA Activities Card

### Current State
- The ORA Activities card has a fixed compact layout regardless of plan state
- Activities are shown in a flat list (up to 6, no categorization)
- The `upcoming_activities` from the hook only includes non-completed activities
- The Project Overview card uses `lg:h-[calc(100vh-180px)]` for height

### Changes

#### 1. Update `useProjectORPPlans.ts` — add `completed_activities` to the data
- Add a new field `completed_activities: ProjectORPActivity[]` to `ProjectORPPlan`
- Query completed activities sorted by `end_date` descending, limited to 10
- Return alongside existing `upcoming_activities`

#### 2. Redesign `ORPActivityPlanWidget.tsx` — expanded card with 4 sections
Once a plan exists (non-null), the card expands to match the Project Overview height using `h-full` and flex layout with overflow scroll.

**Section 1 — ORA Plan CTA with Status** (top, non-collapsible)
- Keep the existing button-style CTA row with status badge and chevron
- Add plan date range below it (already exists, just keep)

**Section 2 — Progress Summary** (non-collapsible)
- Progress bar with percentage and counts
- Summary note: e.g. "3 completed · 5 in progress · 2 not started"

**Section 3 — Ongoing / Upcoming Activities** (collapsible, default open)
- Use `Collapsible` component with a header showing count badge
- List in-progress and upcoming activities with status icons
- Show activity name, status icon, and due date

**Section 4 — Recently Completed** (collapsible, default collapsed)
- Use `Collapsible` component
- Show completed activities with green checkmark and completion date
- Strikethrough styling on names

#### 3. Update `ProjectDetailsPage.tsx` — match heights
- The right-column widgets grid already uses `flex-1 min-h-0` but cards don't stretch. Add `h-full` propagation so when only one widget is visible or ORP card is present, it fills the available vertical space matching the left column.
- When both widgets exist in a 2-col grid, use `md:grid-rows-[1fr]` or `items-stretch` so cards expand equally.

### UI/UX Design Details
- Card uses `flex flex-col h-full` with `overflow-hidden`
- Content area uses `flex-1 overflow-y-auto` for scrolling when content exceeds card height
- Collapsible sections use `ChevronDown`/`ChevronRight` toggle icons
- Section headers: `text-xs uppercase tracking-wider font-semibold text-muted-foreground` with activity count badges
- Activity rows: compact `py-1.5 px-2` with hover state, icon + name + date layout
- Smooth `Collapsible` animations from Radix

### Files to modify
- `src/hooks/useProjectORPPlans.ts` — add `completed_activities` field
- `src/components/widgets/ORPActivityPlanWidget.tsx` — full redesign of active plan view
- `src/pages/ProjectDetailsPage.tsx` — ensure height matching with left column

