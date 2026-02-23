

# Add Approver/Delivering Party Drill-Down Sheet for PSSR

## Overview

When a user clicks on an approving or delivering party in the Review & Approvals card, a side panel (Sheet) will open showing all PSSR checklist items assigned to that role, with their statuses, search, and filter tabs -- mirroring the VCR ApproverDetailSheet pattern.

## What Changes

### 1. New Component: `PSSRApproverItemsSheet`

Create `src/components/pssr/PSSRApproverItemsSheet.tsx` modeled on the VCR `ApproverDetailSheet`. It will:

- Accept props: `pssrId`, `roleName`, `userName`, `avatarUrl`, `itemCount`, `partyType` ("delivering" or "approving")
- **Header**: Large avatar, resolved name, role name, item count badge (e.g., "0/16 items")
- **Search bar**: Filter items by description, category, or topic
- **Filter tabs**: All, Not Started, In Review, Completed (with counts)
- **Item list**: Each card shows a colored status dot, item description, category badge, topic badge, and status label
- **Data fetching**: Query `pssr_checklist_responses` joined with `pssr_checklist_items` (or `pssr_custom_checklist_items`) where `approving_role ILIKE %roleName%` (for approving) or `delivering_role = roleName` (for delivering). Derive status from `response`/`status` fields using the existing `deriveStatus` logic.

### 2. Update `PSSROverviewTab.tsx`

- Replace the current `selectedUser` state (which stores `{ id, name, role }`) with a new `selectedParty` state that includes `{ roleName, userName, avatarUrl, itemCount, partyType }`.
- Update click handlers on delivering and approving party rows to set `selectedParty` instead of `selectedUser`.
- Replace `renderUserDetailSheet()` with the new `PSSRApproverItemsSheet` component.
- The existing `userItems` query (which queries `pssr_item_approvals` by user ID) will be removed since the new sheet handles its own data fetching by role name.

## Technical Details

### Data Query (inside new sheet)

```text
-- For approving parties:
SELECT r.id, r.response, r.status, r.checklist_item_id, r.approving_role,
       ci.unique_id, ci.question, ci.category, ci.topic
FROM pssr_checklist_responses r
LEFT JOIN pssr_checklist_items ci ON ci.id = r.checklist_item_id
WHERE r.pssr_id = :pssrId
  AND r.approving_role ILIKE '%' || :roleName || '%'

-- For delivering parties:
SELECT r.id, r.response, r.status, r.checklist_item_id, r.delivering_role,
       ci.unique_id, ci.question, ci.category, ci.topic
FROM pssr_checklist_responses r
LEFT JOIN pssr_checklist_items ci ON ci.id = r.checklist_item_id
WHERE r.pssr_id = :pssrId
  AND r.delivering_role = :roleName
```

Since Supabase foreign key joins between `pssr_checklist_responses` and `pssr_checklist_items` may fail (no FK), the query will use a two-step approach: fetch responses first, then batch-fetch item details by ID.

### Status Derivation

Reuses existing logic:
- `approved` or response `YES`/`NA` = Completed
- `submitted`/`in_review` = In Review
- Has response but not approved = Pending
- No response = Not Started

### Files Modified
- **New**: `src/components/pssr/PSSRApproverItemsSheet.tsx`
- **Edit**: `src/components/pssr/PSSROverviewTab.tsx` (swap state, remove old sheet, wire new component)

### No Database Changes Required
All needed data (`approving_role`, `delivering_role`) is already backfilled in `pssr_checklist_responses`.

