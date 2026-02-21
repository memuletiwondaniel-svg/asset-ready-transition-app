

## Fix: Show All Categories + Category Drill-down with Item Detail Overlay

### Problem Analysis

1. **Missing custom categories**: The `usePSSRCategoryProgress` hook only shows categories that have checklist **responses** for the current PSSR. It filters out categories with `total > 0` responses. If a category exists in `pssr_checklist_categories` and has checklist items assigned, but no responses have been created yet for this specific PSSR, it won't appear. Custom categories (like "VCR Projects") are invisible until responses exist.

2. **No drill-down on category click**: Currently clicking a category in the Progress panel does nothing. The user wants the same pattern as VCR: click category to open a side sheet listing all items, then click an item to see full details.

---

### Plan

#### 1. Fix Category Visibility in `usePSSRCategoryProgress`

Update the hook to show **all active categories that have checklist items** (regardless of whether responses exist for this PSSR):

- Fetch all active categories from `pssr_checklist_categories`
- Fetch all checklist items grouped by category to get true totals
- Cross-reference with responses to get completion counts
- Show categories with 0/N progress when items exist but no responses yet

#### 2. Create `PSSRCategoryItemsSheet` Component

A new side sheet (similar to VCR's `CategoryItemsSheet`) that opens when a category is clicked in the Progress panel:

- Header: category icon, name, and completion count (e.g., "3/10 items completed")
- List of all PSSR checklist items in that category
- Each item shows: item code, topic, description, response status (Pending/Completed/In Review)
- Status badges with color coding
- Click any item to drill into the detail overlay

#### 3. Create `PSSRItemDetailSheet` Component

A detail overlay (similar to VCR's `VCRItemDetailSheet`) for individual PSSR items:

- **Header**: Item code badge, status badge, topic
- **Description**: The checklist question/description
- **Delivering Party**: Resolved from `responsible` field -- show role name, avatar, and user name
- **Approving Parties**: Resolved from `approvers` field -- grouped by role with avatars and names
- **Supporting Evidence**: From `supporting_evidence` field
- **Guidance Notes**: From `guidance_notes` field
- **Response Details**: Current response (YES/NO/NA), narrative, deviation reason, mitigations, follow-up actions
- **Timeline**: Created, submitted, approved dates
- **Attachments**: If any

#### 4. Wire Up Click Handlers in `PSSROverviewTab`

- Make each category row in the Progress panel clickable
- On click, open `PSSRCategoryItemsSheet` with the selected category
- Pass the PSSR ID and category info through

---

### Technical Details

**Files to create:**
- `src/components/pssr/PSSRCategoryItemsSheet.tsx` -- category items list sheet
- `src/components/pssr/PSSRItemDetailSheet.tsx` -- individual item detail overlay

**Files to modify:**
- `src/hooks/usePSSRCategoryProgress.ts` -- fix category counting to include all categories with items (not just those with responses)
- `src/components/pssr/PSSROverviewTab.tsx` -- add click handler on category rows, import and render the new sheets

**Data flow:**
```text
Progress Panel (category row click)
  --> PSSRCategoryItemsSheet (lists items with status)
    --> PSSRItemDetailSheet (full item details with parties, evidence, notes)
```

**Personnel resolution for Delivering/Approving parties:**
- The `pssr_checklist_items` table stores `responsible` and `approvers` as text fields (comma-separated role names like "ORA Engr., Process TA2")
- These will be displayed as role labels; where possible, resolve to actual users from `profiles` table using a similar pattern to the VCR detail sheet

