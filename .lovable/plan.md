

## Problem Analysis

Two issues in the VCR Item edit sheet (`EditItemForm` in `VCRItemsStep.tsx`):

1. **"+ Add" button for delivering parties is not responsive** — The Popover likely has z-index or event propagation issues since it's nested inside a Sheet (z-index 150). The PopoverContent needs explicit z-index higher than the Sheet.

2. **Role dropdown not filtering by project location** — Currently, the `Select` for delivering party role shows all roles, and `resolvedUsers` query fetches users by role from project team members OR all profiles as fallback, without filtering by the project's hub/region/plant. Users from other hubs (e.g., David Hotchkiss from NRNGL) appear for a Zubair project.

## Plan

### 1. Fix the "+ Add" Popover z-index

In `EditItemForm`, the delivering party `<PopoverContent>` needs `className="... z-[200]"` to render above the Sheet overlay (z-150).

### 2. Implement location-aware filtering for delivering party candidates

**Approach**: When a role is selected in the delivering party dropdown, resolve users by:

1. Fetch the project's `hub_id`, `region_id`, `plant_id`, and `station_id` from the `projects` table
2. Resolve hub name, region name, plant name from their respective tables
3. Use the same `HUB_TO_REGION` mapping + `position` string matching (as done in `ApproversStep.tsx`) to filter candidates by location
4. Additionally filter by profile's `hub` and `plant` fields when available

**Changes to `VCRItemsStep.tsx` — `EditItemForm`**:

- Add a query to fetch the project's location context (hub name, region name, plant name) using `projectId`
- Modify the `resolvedUsers` query to filter candidates:
  - First, match by role UUID
  - Then filter by hub/region using the profile's `position` field (contains location like "Proj Engr - Zubair") and/or `hub`/`plant` fields
  - Use `HUB_TO_REGION` mapping from `ApproversStep.tsx` to get region keywords
  - Extract `posMatchesRegion()` and `HUB_TO_REGION` into a shared utility (or import from ApproversStep)
- Apply the same filtering to `availableDeliveringCandidates` in the Add popover

- Also fix the Add popover's PopoverContent z-index to `z-[200]`

**Changes to `AddItemForm`** (same file, lines ~1178-1208):
- Apply the same location-aware filtering logic

### 3. Extract shared location matching utility

Create or extend a utility with:
- `HUB_TO_REGION` mapping
- `getRegionKeywords(hubName)` function
- `posMatchesRegion(position, keywords)` function

These are currently duplicated in `ApproversStep.tsx`. Extract to a shared file like `src/utils/hubRegionMapping.ts`.

### File Changes

| File | Change |
|------|--------|
| `src/utils/hubRegionMapping.ts` | New file — extract `HUB_TO_REGION`, `getRegionKeywords`, `posMatchesRegion` |
| `src/components/widgets/vcr-wizard/steps/VCRItemsStep.tsx` | Fix PopoverContent z-index; add project location query; filter resolved users by hub/region/position matching |
| `src/components/widgets/vcr-wizard/steps/ApproversStep.tsx` | Import from shared utility instead of inline constants |

