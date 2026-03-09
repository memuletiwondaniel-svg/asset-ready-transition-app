

## Plan: Replace "New Task" with "Add Activity" on My Tasks Page

### Overview
Replace the "New Task" button on the My Tasks page with an "Add Activity" dropdown button (matching the Gantt chart's design), which opens a dialog/sheet for adding activities. The dialog will include a project selector so the user can choose which ORA Plan to add the activity to, then offer "From Catalog" or "Custom Activity" options — persisting to both `ora_plan_activities` and `wizard_state`, plus generating `user_tasks`.

### Changes

**1. Create `AddActivityDialog` component** (`src/components/tasks/AddActivityDialog.tsx`)
- A new dialog/sheet that combines:
  - A project selector dropdown (fetches user's projects that have approved ORA plans from `orp_plans` joined with `projects`)
  - Two tabs/modes: "From Catalog" and "Custom Activity"
  - **From Catalog**: Reuses `AddFromCatalogDialog` logic — shows catalog activities, multi-select, bulk add
  - **Custom Activity**: Reuses `AddCustomActivityDialog` fields — name, description, duration, dates
- On submit:
  - Inserts into `ora_plan_activities` for the selected plan
  - Updates `wizard_state` JSON on `orp_plans`
  - Generates the corresponding `user_tasks` entry via `generateLeafTasks`
  - Invalidates relevant query caches (`orp-plan-details`, `user-tasks`, `unified-tasks`)

**2. Update `MyTasksPage.tsx`**
- Remove `NewTaskModal` import and state
- Replace the "New Task" button with the "Add Activity" dropdown button matching Gantt chart styling:
  ```
  + Add Activity ▾
    ├─ From Catalog
    └─ Custom Activity
  ```
- Each option opens the new `AddActivityDialog` in the appropriate mode
- Button uses the same styling: `border-primary/30 text-primary hover:bg-primary/10` with `BookOpen` and `PenLine` icons

**3. Files affected**
- **New**: `src/components/tasks/AddActivityDialog.tsx` — the combined dialog with project picker + catalog/custom forms
- **Modified**: `src/pages/MyTasksPage.tsx` — swap button and wire up dialog

### Design Details
- The dropdown trigger button matches the Gantt's "Add Activity" style but sized `sm` to match the toolbar
- The dialog opens as a Sheet (side panel) containing:
  1. Project selector at top (Select component with project ID + name)
  2. Activity form below (either catalog multi-select or custom activity fields)
  3. Footer with Cancel/Add buttons
- Project list filtered to only show projects with an approved ORA plan

