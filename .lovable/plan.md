

## Root Cause Analysis

Three bugs prevent the PAC certificate from populating correctly:

1. **Wrong prop value**: Line 1918 passes `projectId={projectCode}` — `projectCode` is a string like `"HM-AC"` but `PACCertificate` uses it to query `p2a_handover_plans.project_id` which expects a UUID. The query always returns no results.

2. **Wrong query scope**: The PAC certificate queries ALL systems across ALL VCRs in the project. But each PAC is rendered per-VCR, so it should only show systems for THIS specific VCR (handover point).

3. **No direct VCR reference**: The PAC component doesn't receive the VCR's `id` (handover_point_id) or VCR code, so it can't query systems directly or display the VCR reference number.

## Fix Plan

### 1. Update PACCertificate props and query logic

In `src/components/handover/PACCertificate.tsx`:
- Add `handoverPointId` prop (the VCR's UUID)
- Add `vcrCode` prop (for VCR Ref display)
- Replace the project-wide systems query with a direct query on `p2a_handover_point_systems` filtered by `handoverPointId`
- Use `vcrCode` prop directly in the VCR Ref field instead of deriving from systems
- Remove the now-unnecessary `projectId` prop

### 2. Update PAC rendering in VCRDetailOverlay

In `src/components/widgets/VCRDetailOverlay.tsx`:
- Pass `handoverPointId={vcr.id}` and `vcrCode={vcr.vcr_code}` to `PACCertificate`
- Pass `projectId={projectId}` (the actual UUID from route params) instead of `projectCode`
- Pass approvers with resolved Plant Director name (already working via `pacCertificateApprovers`)

### 3. Display VCR Ref correctly

Update the VCR Ref field in PACCertificate to show the VCR code (e.g., "VCR-01") instead of trying to derive it from system data.

### Files to modify
- `src/components/handover/PACCertificate.tsx` — fix props, query logic, VCR Ref display
- `src/components/widgets/VCRDetailOverlay.tsx` — pass correct props

