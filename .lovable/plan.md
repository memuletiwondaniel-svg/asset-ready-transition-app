

## Plan: Enhance ORA Activity Detail Sheet in Gantt Chart

### Context

When clicking an ORA activity row in the Gantt chart, the `ORAActivityTaskSheet` opens. Currently it shows status toggle, comments, and evidence upload — but lacks delete, editable description, and smart save behavior. The `ORPDeliverableModal` (for non-ORA items) already has delete with confirmation dialog.

### Regarding Duration Estimates

The duration estimates (High/Med/Low days) come from the **Activity Catalog** — they are reference planning data used during scheduling. In the Gantt execution view, the actual dates are already shown (Start/Due). Showing static duration estimates here adds no actionable value since:
- The actual duration is already computed from the date range
- They are not editable in this context (they belong to the catalog, not the plan instance)
- They are not currently shown in `ORAActivityTaskSheet` anyway

**Recommendation**: Do not add them to this sheet. They stay relevant only in the Activity Catalog's `ActivityDetailSheet` where they are editable.

### Changes to `ORAActivityTaskSheet.tsx`

1. **Add Delete with Confirmation**
   - Add a delete button in the footer (red ghost style per project pattern)
   - Protected by `AlertDialog` confirmation (same pattern as `ORPDeliverableModal`)
   - Deletes the `ora_plan_activities` record and associated `user_tasks` entry
   - Closes sheet and invalidates queries after deletion

2. **Add Editable Description Field**
   - Add a `Textarea` below the activity title for editing the description
   - Pre-populate from `metadata.description` or `task.description`
   - Track as part of dirty state

3. **Conditional Save Button (Dirty State)**
   - Track original values on sheet open via `useEffect`
   - Compare current state against originals to derive `isDirty`
   - Save button only appears (slides in) when `isDirty` is true
   - Cancel button always visible; Save replaces the current static "Save Progress" when dirty

4. **Footer Layout**
   - Left: Delete button (red ghost)
   - Right: Cancel + conditional Save (animated entry via opacity/translate transition)

### Files Modified
- `src/components/tasks/ORAActivityTaskSheet.tsx` — all changes in this single file

