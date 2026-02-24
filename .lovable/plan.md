

# Replace `/pssr/{uuid}` Route with PSSRDetailOverlay

## Problem
The `/pssr/{uuid}` route renders the older `PSSRDashboard` widget-based view. Meanwhile, the `PSSRDetailOverlay` already provides a richer, full-screen detail experience for "Under Review", "Completed", and "Pending Lead Review" statuses. Draft PSSRs and the QuickView overlay still navigate to the old route unnecessarily.

## What Changes

### 1. `PSSRSummaryPage.tsx` -- Handle ALL statuses via overlay
Currently, `handleViewDetails()` only opens the overlay for non-Draft statuses. Draft PSSRs fall through to `navigate(/pssr/{id})`.

**Change**: Open the `PSSRDetailOverlay` for **all** statuses, including Draft. Remove the fallback navigation to `/pssr/{id}`.

### 2. `PSSRQuickViewOverlay.tsx` -- Open overlay instead of navigating
The "View Full PSSR Details" button currently navigates to `/pssr/{id}`. 

**Change**: Instead of navigating, close the QuickView and signal the parent (PSSRSummaryPage) to open the `PSSRDetailOverlay`. This requires:
- Adding an `onViewFullDetails` callback prop
- The parent wires this to open the detail overlay with the correct PSSR data

### 3. `PSSRDetailOverlay.tsx` -- Support Draft status
Ensure the overlay renders correctly for Draft PSSRs (it may already work, but we verify that no UI elements are gated on non-Draft status).

### 4. Remove `/pssr/{id}` route and `PSSRDetailsPage.tsx`
- Remove the `<Route path="/pssr/:id" element={<PSSRDetailsPage />} />` from `App.tsx`
- The sub-routes (`/pssr/:id/review`, `/pssr/:id/approve`, `/pssr/:id/sof`) remain untouched since they serve different purposes (approver workflow)
- `PSSRDashboard.tsx` can be kept for now (it may have other uses) or flagged for future cleanup

## Flow After Changes

```text
User clicks PSSR row in summary table (any status)
  -> PSSRDetailOverlay opens (full-screen overlay, no route change)

User clicks "View Full Details" in QuickView
  -> QuickView closes -> PSSRDetailOverlay opens (no route change)
```

## Files Modified
- `src/components/PSSRSummaryPage.tsx` -- unified handleViewDetails for all statuses
- `src/components/pssr/PSSRQuickViewOverlay.tsx` -- callback prop instead of navigate
- `src/App.tsx` -- remove `/pssr/:id` route
- `src/pages/PSSRDetailsPage.tsx` -- can be deleted (no longer referenced)

## Technical Notes
- The `/pssr/:id/review`, `/pssr/:id/approve`, and `/pssr/:id/sof` routes are unaffected
- No database changes required
- The `PSSRDashboard` component is not deleted yet in case it is referenced elsewhere; it can be cleaned up in a follow-up

