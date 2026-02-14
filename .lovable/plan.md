
## Merge Details and Statistics Tabs + Editable System Name

### What changes

1. **Make system name editable in the header**: The `SheetTitle` showing the system name will become a click-to-edit inline input. Clicking the name reveals an input field; on blur or Enter, it saves via `onUpdateSystem`.

2. **Remove the read-only "System Name" field** from the Details tab content (lines 144-150) since the header already displays it.

3. **Merge Details and Statistics into one tab** called "Details": Remove the separate "Statistics" tab trigger. The single "Details" tab will now contain (in order):
   - Hydrocarbon toggle
   - VCR assignment dropdown
   - Save button (when changes exist)
   - Separator
   - Subsystems collapsible section
   - Separator
   - Statistics section (overall progress bar, ITR-A/B and Punchlist A/B metric cards, status badge, assigned VCR code)

4. **Keep the Punchlist tab** as-is. Clicking punchlist counts in the metrics still switches to this tab.

5. **Tabs reduce from 3 to 2**: "Details" (blue) and "Punchlist" (amber).

### Technical details

**File: `SystemDetailSheet.tsx`**

- Add `editName` state initialized from `system.name`, and `isEditingName` boolean state.
- Replace `<SheetTitle>` static text with a conditional: when `isEditingName` is true, show an `<Input>` with auto-focus; when false, show the name as a clickable span with a subtle hover underline/cursor.
- On blur/Enter from the input, call `onUpdateSystem(system.id, { name: editName })` and set `isEditingName` to false.
- Track name changes in the `hasChanges` effect so the Save button also covers name edits.
- Remove the `TabsTrigger` for "statistics" and its `TabsContent` wrapper.
- Move the statistics content (progress bar, metrics grid, status, assigned VCR) into the Details `TabsContent`, placed after the Subsystems collapsible and a `Separator`.
- Remove the `BarChart3` import if no longer used elsewhere.
- Update `useEffect` reset to also reset `editName` and `isEditingName`.
