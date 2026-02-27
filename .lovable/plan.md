

## Plan: Improve StepSchedule UX

### 1. Replace date input with calendar popover
- Remove the `<Input type="date">` for start date — replace with a clickable text that shows "Set date" in muted style when empty, or the formatted date (e.g., "15 Mar") when set
- On click, open a `Popover` with `Calendar` component (shadcn) for date selection
- Same clean muted display for end date (already read-only)

### 2. Column visibility toggle
- Add a `Columns` dropdown button (using `DropdownMenu`) next to the zoom controls
- Allow toggling visibility of: Start, End, Days, Status columns
- Default visible: ID, Activity, Start (always show ID + Activity)
- Dynamically compute `LEFT_PANEL_WIDTH` based on visible columns

### 3. Activity detail side overlay
- Add state for `selectedActivityId`
- When user clicks an activity row, open a `Sheet` (from right) showing full activity details: code, name, description, phase, duration estimates (high/med/low), start/end dates, status
- Allow inline editing of schedule fields within the sheet

### 4. Fix Activity ID badge colors
- Change `EXE` phase from rose (red-like) to **indigo** or **orange** — rose connotes errors
- Adjust to: IDN=blue, ASS=amber, SEL=emerald, DEF=teal, EXE=indigo, OPR=purple

### 5. Widen Step 4 dialog
- In `ORAActivityPlanWizard.tsx` line 258, change `max-w-5xl` to `max-w-7xl w-[98vw]` for step 4

### Files Modified
1. **`src/components/ora/wizard/StepSchedule.tsx`** — Calendar popover, column toggle, activity detail sheet, color fix
2. **`src/components/ora/wizard/ORAActivityPlanWizard.tsx`** — Wider dialog for step 4

