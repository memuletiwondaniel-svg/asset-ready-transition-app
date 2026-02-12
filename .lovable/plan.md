

## New "Items" Tab for VCR Management

### Overview
Add a new "Items" tab to the VCR Management section that displays all VCR items from the `vcr_items` table. The UI will match the existing PSSR Checklist Items table layout with search, category filter, column selector, download button, and an "Add VCR Item" button.

### Tab Structure (Updated)
Categories | **Items** | Templates | Approvers

The new "Items" tab will be inserted between "Categories" and "Templates".

---

### UI Components (matching PSSR Checklist Items pattern)

**Header Row**
- Title: "VCR Checklist Items" with icon
- "Add Item" button (top-right, primary style)

**Toolbar Row**
- Search input (left, flexible width)
- Category filter dropdown (All Categories, Design Integrity, Technical Integrity, etc.)
- Column visibility toggle button (grid icon)
- Export/Download button

**Stats Row**
- Item count badge (e.g., "58 items")

**Table Columns**
- ID (display_order formatted as category_code + sequence, e.g., DI-01, TI-01)
- Category (with colored badge)
- Description (vcr_item text)
- Delivering Party (role name)
- Approvers (approving party role names, comma-separated)
- Actions (edit, delete buttons)

Optional toggleable columns: Supporting Evidence, Guidance Notes

---

### Technical Details

**New files to create:**
1. `src/components/handover/VCRItemsTab.tsx` -- Main component with table, search, filters, column selector, and download
2. `src/hooks/useVCRItems.ts` -- React Query hooks for fetching VCR items with joined category and role data, plus CRUD mutations

**Files to modify:**
1. `src/components/handover/VCRManagementTab.tsx` -- Add "Items" tab between Categories and Templates, with new icon color (e.g., blue) and import

**Data fetching approach:**
- Query `vcr_items` joined with `vcr_item_categories` for category name/code
- Query `roles` table to resolve `delivering_party_role_id` and `approving_party_role_ids` into display names
- Generate display IDs from category code + display_order (e.g., DI-01, TI-05)

**Add/Edit Item Dialog:**
- Category dropdown (from `vcr_item_categories`)
- VCR Item text (textarea)
- Delivering Party role (dropdown from `roles`)
- Approving Party roles (multi-select from `roles`, grouped by category)
- Supporting Evidence (textarea, optional)
- Guidance Notes (textarea, optional)

**Export:**
- Excel download of all VCR items using the `xlsx` library (already installed), following the same pattern as `exportPSSRChecklistToExcel`

