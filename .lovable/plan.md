

# PSSR Detail Overlay -- Multi-Issue Fix Plan

## Issues Identified

### 1. Header Renames (Quick)
- "PSSR Overview" card header -> "Overview"
- "Progress & Activities" card header -> "Progress"

### 2. Progress Wheel Too Small
- Increase circular SVG from `w-20 h-20` (viewBox 80) to `w-28 h-28` (viewBox 112) with proportionally larger radius and text.

### 3. Category Progress Not Showing (Bug)
- **Root cause**: `pssr_checklist_items.category` stores a UUID (e.g., `6d7477e9-...`), but `usePSSRCategoryProgress` compares it against category *names* (e.g., "Technical Integrity"). The lookup `categoryStats[categoryName]` always fails because the key is a name but the value from the DB is a UUID.
- **Fix**: In `usePSSRCategoryProgress.ts`, key `categoryStats` by category **ID** instead of name, and match `resp.pssr_checklist_items.category` (UUID) against category IDs.

### 4. Delivering Parties / PSSR Approvers Not Resolving (Bug)
- **Root cause**: `pssr_approvers` rows have `user_id: null` and `approver_name: "Pending Assignment"`. The overlay fetches profiles by `user_id`, which yields nothing.
- **Fix**: For PSSR Approvers, display the `approver_role` as the label when `approver_name` is "Pending Assignment" or `user_id` is null. When `user_id` is present, resolve the profile normally.
- **Delivering Parties**: `pssr_item_approvals` is empty (no items submitted yet). Derive delivering parties from the `responsible` field on `pssr_checklist_items` for this PSSR's checklist responses. Group by role name and show counts.

### 5. Overlay Header Rearrangement
- Move PSSR Title to a second line under the PSSR ID
- Make the PSSR ID smaller and muted (`text-sm text-muted-foreground`)
- Make the Title the prominent line (`text-base font-semibold`)
- Remove "Pre-Startup Safety Review" `DialogDescription` text

### 6. Header Height Inconsistency Across Tabs
- **Root cause**: The overlay header `py-3` is fine, but the `DialogDescription` adds extra height. When switching to placeholder tabs, the content area is empty, making the header area appear much taller (the whole dialog expands visually).
- **Fix**: Set a fixed/consistent header height and ensure the content area fills remaining space uniformly across all tabs.

### 7. SoF Certificate Tab Empty
- **Root cause**: The SoF tab renders a `PlaceholderTab` component. The `sof_approvers` table is empty for this PSSR (the wizard didn't insert them), though the `sof_certificates` record exists.
- **Fix**: Replace the placeholder with the existing `SOFCertificate` component (from `src/components/sof/SOFCertificate.tsx`), passing `certificateNumber`, `pssrReason`, and `pssrId`. If SoF approvers are missing, auto-populate them based on the PSSR reason using the same logic as the wizard (TAR = Plant Director, HSE Director, P&M Director).

---

## Technical Details

### Files to Modify

**`src/hooks/usePSSRCategoryProgress.ts`**
- Change `categoryStats` to be keyed by category `id` (UUID) instead of `name`
- Match `resp.pssr_checklist_items.category` against the UUID keys
- Map back to category name for display

**`src/components/pssr/PSSROverviewTab.tsx`**
- Rename "PSSR Overview" to "Overview" and "Progress & Activities" to "Progress"
- Increase progress wheel SVG dimensions to w-28 h-28
- Fix delivering parties: query `pssr_checklist_items.responsible` grouped by role for this PSSR's responses when `pssr_item_approvals` is empty
- Fix PSSR Approvers display: show role name and "Pending Assignment" badge when `user_id` is null
- Replace SoF placeholder with actual `SOFCertificate` component import

**`src/components/pssr/PSSRDetailOverlay.tsx`**
- Rearrange header: ID small/muted on top, Title prominent below, remove DialogDescription
- Fix header height: use consistent `py-2.5` and `min-h` constraint
- Replace SoF placeholder tab with the real certificate component, passing required props
- Rename sidebar nav label from "PSSR Overview" to "Overview"
- Add SoF approver auto-population logic when they're missing

