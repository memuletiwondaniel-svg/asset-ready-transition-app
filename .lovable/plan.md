
# Fix PSSR Approvers Not Resolving to Real People

## Problem
The `pssr_approvers` table has 3 rows for PSSR-BNGL-001, all with `user_id: NULL` and `approver_name: 'Pending Assignment'`. The UI correctly falls back to showing role names (e.g., "Engr. Manager", "Dep. Plant Director"), but no actual person names or avatars are displayed.

## Root Cause
When the PSSR was created, the wizard inserted approver rows with placeholder data and never resolved them to actual profiles. Unlike the SoF approvers (which now have auto-population logic in `PSSRDetailOverlay.tsx`), the PSSR approvers lack equivalent resolution logic.

## Solution

### 1. Add auto-population logic for PSSR approvers in `PSSRDetailOverlay.tsx`
- Similar to the existing SoF approver auto-population, add a mutation that runs when the overlay opens and detects PSSR approvers with `user_id = null`
- For each approver role, search the `profiles` table by position keyword + plant name (e.g., "Engr. Manager" + "BNGL" for asset-level staff, excluding "Projects" positions)
- Update the `pssr_approvers` rows with the resolved `user_id` and `approver_name`

### 2. Resolution logic per role
- **Engr. Manager**: Match `position ILIKE '%Engr. Manager%Asset%'` (prioritize Asset over Projects)
- **Dep. Plant Director**: Match `position ILIKE '%Dep. Plant Director%BNGL%'` (plant-specific)
- **Central Mtce Lead**: Match `position ILIKE '%Central Mtce Lead%'`

### 3. Fix existing data via migration
- Update the 3 existing `pssr_approvers` records for PSSR-BNGL-001 with the correct `user_id` and `approver_name` values from the profiles table

---

## Technical Details

### Files to Modify

**`src/components/pssr/PSSRDetailOverlay.tsx`**
- Add a `useMutation` hook (`autoPopulatePssrApprovers`) that:
  1. Fetches `pssr_approvers` for the current PSSR where `user_id IS NULL`
  2. For each unresolved approver, queries `profiles` by position keyword + plant name
  3. Updates each `pssr_approvers` row with the matched `user_id` and `full_name`
- Add a `useEffect` to trigger this mutation when approvers are loaded and have null user_ids
- Invalidate `['pssr-approvers', pssrId]` query on success so the Overview tab refreshes

**Migration SQL**
- Directly update the 3 `pssr_approvers` rows for PSSR-BNGL-001:
  - Engr. Manager -> Harald Traa (Asset)
  - Dep. Plant Director -> Craig Forbes (BNGL)
  - Central Mtce Lead -> Dean Nye
