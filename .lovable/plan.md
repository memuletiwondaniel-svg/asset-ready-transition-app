

## Plan: Add Document Numbering Configuration Tab

### Overview

Add a new "Configuration" tab to the DMS that lets users define the document numbering structure. Each segment (e.g., Project Code, Originator, Plant, Site, Unit, Discipline, Document Code, Sequence Number) is a configurable building block. Users can reorder segments, set separators, mark segments as required/optional, define character lengths, and link each segment to its source table. This makes the numbering system tenant-configurable so ORSH can interpret and generate document numbers for any client's DMS.

### Database Changes

**New table: `dms_numbering_segments`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| tenant_id | uuid FK | Multi-tenant scoping |
| segment_key | text | Internal key (e.g. `project`, `originator`, `plant`, `site`, `unit`, `discipline`, `document`, `sequence_1`, `sequence_2`) |
| label | text | Display label (e.g. "Project Code") |
| position | int | Order in the numbering pattern (1-9) |
| separator | text | Character after this segment (default `-`) |
| min_length | int | Minimum character count |
| max_length | int | Maximum character count |
| source_table | text | Which DMS table provides lookup values (e.g. `dms_projects`, `dms_originators`, or `null` for free-text like sequence numbers) |
| source_code_column | text | Column name for the code value |
| source_name_column | text | Column name for display name |
| is_required | boolean | Whether this segment is mandatory |
| is_active | boolean | Whether this segment is included in the pattern |
| description | text | Explanation of what this segment represents |
| example_value | text | Example (e.g. "6529", "AMTS") |
| created_at / updated_at | timestamptz | Timestamps |

Seed with the 9 default segments matching the user's specification (AAAA-BBBB-CCCC-DDDD-EEEEE-FF-GGGG-HHHHH-III).

RLS policies scoped by tenant using `get_user_tenant_id()`.

### Frontend Changes

**1. New component: `src/components/admin-tools/dms/DmsConfigurationTab.tsx`**

- Displays a visual **document number preview** at the top showing the live pattern (e.g. `6529-AMTS-S003-ISGP-U11000-PX-2365-00001-001`) with each segment color-coded
- Below, a **sortable list/table** of segments showing: Position, Label, Key, Source Table, Length (min/max), Separator, Required, Active, Example
- Each segment row is editable inline or via an edit dialog
- Drag-to-reorder or up/down arrows to change position
- Add/remove custom segments for flexibility
- A **settings card** for global config: default separator character, DMS system type (Assai / Documentum / Wrench / Other)

**2. Update `DocumentManagementSystem.tsx`**

- Add `{ id: 'configuration', label: 'Configuration', icon: Settings2, activeColor: 'text-gray-600 dark:text-gray-400' }` to `TAB_CONFIG` — placed as the **last** tab
- Add `<TabsContent>` rendering `<DmsConfigurationTab />`
- Update `TabId` type accordingly

### UI Design

The Configuration tab will have three sections:

1. **Live Preview Card** — Shows the assembled document number pattern with labeled, color-coded segments. Updates in real-time as segments are modified.

2. **DMS System Settings Card** — Dropdown to select the target DMS (Assai, Documentum, Wrench, Custom), default separator character, and optional notes field for ORSH instructions.

3. **Segments Table** — Editable table with all segments. Each row shows position, label, source table mapping, length constraints, separator, and status toggles. Edit dialog for detailed configuration of each segment.

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `dms_numbering_segments` table + seed data + RLS |
| `src/components/admin-tools/dms/DmsConfigurationTab.tsx` | New component |
| `src/components/admin-tools/DocumentManagementSystem.tsx` | Add tab entry + import |

