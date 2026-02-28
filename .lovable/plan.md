

## Plan: Add VCR Delivering Parties to Review and Approval Panel

### Changes

**1. Extend data fetching in `VCRDetailOverlay.tsx` (around line 1243-1470)**

Modify the `checklistApprovers` query to also aggregate **delivering parties** (from `delivering_party_role_id` on `vcr_items`), in addition to the existing approving/receiving parties. Each delivering party gets `role: 'delivering'` in the `ChecklistApproverData` result. The same profile resolution logic (plant-aware, excluding Asset-level) applies.

**2. Update `ApprovalsPanel` component (around line 334-503)**

- Extract delivering parties: `checklistApprovers.filter(a => a.role === 'delivering')`
- Add a new `CollapsibleSection` titled **"VCR Delivering Parties"** above "VCR Reviewers" (line 406), with count and the same `PersonRow` + `StatusIndicator` pattern
- Clicking a delivering party opens the same `ApproverDetailSheet` (already reusable)
- Add a `<div className="border-t border-border/40" />` separator between the new section and VCR Reviewers

**3. Update `ApproverDetailSheet.tsx` to support delivering role lookup**

Currently the sheet queries items where `approving_party_role_ids` contains the role. Add a prop `roleType?: 'delivering' | 'receiving'` (default `'receiving'`). When `roleType === 'delivering'`, query items where `delivering_party_role_id` equals the role ID instead of using `contains` on `approving_party_role_ids`.

### Files to modify
- `src/components/widgets/VCRDetailOverlay.tsx` — data fetch + UI section
- `src/components/widgets/ApproverDetailSheet.tsx` — support delivering role query

