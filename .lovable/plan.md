

## Plan: Redesign ORA Activity Side Sheet

### Changes to `src/components/tasks/ORAActivityTaskSheet.tsx`

**1. Remove "ORA Activity" label badge**
- Delete the purple "ORA Activity" badge from the header entirely

**2. Match activity ID badge styling to Gantt chart palette**
- Import `ID_BADGE_PALETTE` from the Gantt chart (or duplicate the palette locally)
- Use the activity code to deterministically pick a color (hash the code string to an index) so the same activity always gets the same color in both the Gantt and the sheet
- Apply the palette's `bg` and `text` classes to the activity code badge

**3. Increase description field height**
- Change `min-h-[80px]` to `min-h-[140px]` on the description Textarea

**4. Increase separation between ID badge and status section**
- Add more vertical spacing (e.g., `mt-4` or extra padding) between the date info row and the Status toggle section

**5. Status-driven conditional UI**
- **Not Started**: Style the active button with a grey background (`bg-gray-200 text-gray-700`) instead of the current white
- **In Progress**: Style with amber (`bg-amber-500 text-white`). When selected, reveal a progress slider (HTML range input or Radix Slider) for 0–100% entry
- **Completed**: Style with green (`bg-green-500 text-white`). When selected, reveal the Evidence upload section and a "Confirm Completed" button
- Evidence upload and the Confirm button are **hidden** unless status is `COMPLETED`
- The slider is **hidden** unless status is `IN_PROGRESS`

**6. Pin footer actions to bottom of sheet**
- Convert the SheetContent layout to `flex flex-col` with the scrollable content area as `flex-1 overflow-y-auto`
- Move the Delete / Save / Cancel / Confirm buttons into a sticky bottom bar (`border-t bg-background px-6 py-4 shrink-0`)
- Save button only appears when `isDirty` is true
- When status is `COMPLETED`, the save button reads "Confirm Completed" in green

**7. Comments always visible**
- Comments section remains visible regardless of status, positioned after the status section (and after the progress slider if In Progress)

### Files to modify
- `src/components/tasks/ORAActivityTaskSheet.tsx` — all changes in this single file

