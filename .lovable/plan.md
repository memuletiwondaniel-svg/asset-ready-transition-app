

## Plan: Add Topic Field and Import Updated VCR Data from Excel

### Overview
This plan adds a **Topic** column to the VCR items table, clears existing data, imports 58 items from the uploaded Excel sheet, and updates the UI to display and manage the Topic field.

---

### Step 1: Database Migration
- Add a `topic` column (`text`, nullable) to the `vcr_items` table.

### Step 2: Clear Existing VCR Items
- Soft-delete all current `vcr_items` records (set `is_active = false`) to make way for the fresh import.

### Step 3: Insert New Data from Excel
- Insert all 58 rows from the uploaded spreadsheet into `vcr_items`, mapping:
  - **Category** to the matching `vcr_item_categories` ID (Design Integrity, Technical Integrity, Operating Integrity, Management Systems, Health and Safety)
  - **Topic** to the new `topic` column (e.g., "DEM 1", "HEMP", "MoCs", "SCEs", etc.)
  - **Description** to `vcr_item`
  - **Supporting Evidence** to `supporting_evidence`
  - **Guidelines** to `guidance_notes`
  - **Responsible** to `delivering_party_role_id` (matched by role name in the `roles` table)
  - **Approver** to `approving_party_role_ids` (comma-separated list matched to role IDs)
- Set `display_order` sequentially within each category.

### Step 4: Update the Data Hook (`useVCRItems.ts`)
- Include `topic` in the `VCRItem` interface and query select.
- Pass `topic` through create/update mutations.

### Step 5: Update the UI (`VCRItemsTab.tsx`)
- **Table**: Add a **Topic** column between ID and Description (always visible).
- **Search**: Include topic in the search filter.
- **Add/Edit Dialog**: Add a Topic text input field.
- **Form Data**: Add `topic` to the `ItemFormData` interface and form state.
- **Export**: Include Topic in the Excel export.

---

### Technical Details

**Migration SQL:**
```sql
ALTER TABLE vcr_items ADD COLUMN topic text;
```

**Role Mapping:** The "Responsible" and "Approver" fields from the Excel will be matched against the existing `roles` table names (e.g., "Project Engr" maps to role ID `88c54747-...`, "Process TA2" maps to `a71de5b4-...`, etc.). Any role not found will be skipped.

**Files to modify:**
- `src/hooks/useVCRItems.ts` -- add `topic` to interface and queries
- `src/components/handover/VCRItemsTab.tsx` -- add Topic column, search, form field, and export

**Data operations (via insert tool):**
- UPDATE all existing `vcr_items` to `is_active = false`
- INSERT 58 new rows with mapped category IDs, role IDs, and topics

