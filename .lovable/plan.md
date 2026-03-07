

## Plan: Replace Add Activity Button in Approved ORA Plan Gantt

### Problem
The "Add Activity" button in the approved ORA Plan Gantt chart uses different styling and a different Custom Activity UI (the `AddCustomActivityDialog` sheet) than the wizard's Step 4. The user wants them to match exactly.

### Changes

#### 1. Restyle the Add Activity button in `ORPGanttChart.tsx`
Replace the current `variant="outline" className="text-muted-foreground"` button with the wizard's compact primary-tinted style:
```
size="sm" className="h-6 px-2 text-[10px] font-medium gap-1 border-primary/30 text-primary hover:bg-primary/10"
```
Also update the dropdown items to use `DropdownMenuCheckboxItem` with icons matching the wizard (Library icon for "From Catalog", PenLine for "Custom Activity").

Apply this to both instances of the Add Activity button (empty state at ~line 627 and main view at ~line 762).

#### 2. Change Custom Activity to open inline sheet (like wizard)
Instead of opening `AddCustomActivityDialog`, the "Custom Activity" option should:
- Generate a new `WizardActivity` with an auto-incremented activity code (same logic as wizard's `handleAddCustom` — determine phase prefix from existing activities, find max number, increment)
- Insert it into both `ora_plan_activities` table and `wizard_state` JSON
- Invalidate queries to refresh the UI
- Then open the `ORAActivityTaskSheet` for that new activity so the user can fill in details (name, description, schedule, prerequisites, status — the full side panel already used for existing activities)

This means:
- Remove the `showCustomDialog` state and `AddCustomActivityDialog` usage
- The `handleAddCustom` callback becomes synchronous activity creation + sheet open
- The `ORAActivityTaskSheet` (already rendered in this component at ~line 1149) handles the full editing experience

#### 3. Catalog dialog stays the same
The `AddFromCatalogDialog` already matches the wizard UI and persists correctly. No changes needed.

### Files to modify
- `src/components/orp/ORPGanttChart.tsx` — restyle button, replace custom activity flow, remove `AddCustomActivityDialog` import/usage

