

## Plan: Hierarchical Sub-Activities with Parent/Child ID Scheme

### ID Scheme

Currently, activity codes are phase-prefixed serials like `IDN-01`, `ASS-01`. For sub-activities, we extend with dot notation:

```text
IDN-01              ← Parent: "3D Model Review"
IDN-01.01           ← Child: "30% Model Review"
IDN-01.02           ← Child: "60% Model Review"
IDN-01.03           ← Child: "90% Model Review"
IDN-01.03.01        ← Grandchild (if needed later)
```

Serial numbers restart per parent. Children inherit the parent's full code prefix.

### UX Approach: Inline Tree with Indented Rows

The table will display sub-activities as indented rows beneath their parent, with a collapsible chevron on parent rows. This is the most modern and intuitive pattern (used by Linear, Notion, Jira).

```text
▼ IDN-01   3D Model Review         Identify   30   20   10
    IDN-01.01  30% Model Review    Identify   10    7    5
    IDN-01.02  60% Model Review    Identify   10    7    5
    IDN-01.03  90% Model Review    Identify   10    6    5
▶ IDN-02   Hazop Review            Identify   15   10    7
```

When creating a new activity, if a parent is selected, the code auto-generates as `{parent_code}.{next_serial}`.

### Technical Steps

#### Step 1: Update `generate_ora_activity_code` DB function
New migration that replaces the trigger function:
- If `parent_activity_id` is set, look up parent's `activity_code`, count existing children with that prefix, generate `{parent_code}.{next_serial}` (zero-padded to 2 digits)
- If no parent, keep existing phase-prefix logic (`IDN-01`)

#### Step 2: Update `useORAActivityCatalog.ts` hook
- Add a utility function `buildActivityTree(activities)` that nests children under parents
- Expose a `treeActivities` computed property for the table to consume
- Ensure parent dropdown filters out descendants (prevent circular references)

#### Step 3: Update `ORAActivityCatalog.tsx` table
- Render activities as a flat list but sorted by tree order (parent, then children, then grandchildren)
- Indent child rows with left padding proportional to depth (e.g., `pl-{depth * 6}`)
- Add a collapsible chevron icon (`ChevronRight`/`ChevronDown`) on rows that have children
- Track expanded/collapsed state per parent ID
- Show child count badge on collapsed parent rows
- When creating from a parent row context, auto-select that parent

#### Step 4: Update `ActivityFormDialog.tsx`
- When a parent is selected, show a read-only preview of the code that will be generated (e.g., "Code: IDN-01.03")
- Filter parent dropdown to prevent selecting self or own descendants
- Auto-inherit phase from parent when parent is selected

#### Step 5: Update `ActivityDetailSheet.tsx`
- Same parent dropdown filtering as the form dialog
- Show children list at bottom of sheet if the activity has sub-activities

### Files to modify
- **New migration SQL** — Update `generate_ora_activity_code` function for hierarchical codes
- `src/hooks/useORAActivityCatalog.ts` — Tree builder, circular reference prevention
- `src/components/ora/ORAActivityCatalog.tsx` — Indented tree rows, expand/collapse
- `src/components/ora/ActivityFormDialog.tsx` — Parent-aware code preview, phase inheritance
- `src/components/ora/ActivityDetailSheet.tsx` — Children list, parent filtering

