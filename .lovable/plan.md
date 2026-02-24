

# Codebase Cleanup: Remove Dead `/pssr/{uuid}` References

## Summary
The `/pssr/:id` route was already removed from `App.tsx` and `PSSRDetailsPage.tsx` was deleted. Several files still reference this dead route or contain unused code. This plan removes all orphaned references safely.

## Changes

### 1. `src/components/PSSRSummaryPage.tsx`
- Remove the `PSSRDashboard` import (line 28)
- Remove the dead `activeView === 'details'` render branch (lines 657-659) -- this path is no longer reachable since `handleViewDetails` was changed to use the overlay
- Remove `'details'` from the `activeView` type union (line 80)
- Remove the `case 'details'` breadcrumb branch (lines 551-576)

### 2. `src/components/pssr/PSSRQuickViewOverlay.tsx`
- Remove the fallback `navigate(/pssr/${pssrId})` in `handleViewFullDetails` (line 219) -- the `onViewFullDetails` callback is always provided by the parent. Remove the `useNavigate` import if no longer needed.

### 3. `src/components/pssr/walkdown/ScheduleWalkdownModal.tsx`
- Keep the PSSR link as-is. This link is used in calendar invites/emails sent externally. Since `/pssr/:id/review` sub-routes still exist, the link format is still meaningful for sharing context. No change needed here.

### 4. `src/components/pssr/ScheduleActivitySheet.tsx`
- Same as above -- the link is embedded in invitation previews. Keep as-is.

### 5. `src/components/PSSRDashboard.tsx`
- Keep for now. It may still be useful as a component rendered inside the overlay or other contexts in the future. It has no route dependency.

### 6. `src/components/PSSRModule.tsx`
- Delete this file entirely. It is not imported anywhere in the codebase (dead code).

### 7. `supabase/functions/ai-chat/index.ts`
- Update the `pssr-detail` navigation helper (line 3151) to remove the `/pssr/${id}` path or redirect to `/pssr` instead
- Update the single-PSSR match navigation (line 4227) similarly

## Files Modified
- `src/components/PSSRSummaryPage.tsx` -- remove dead PSSRDashboard code path
- `src/components/pssr/PSSRQuickViewOverlay.tsx` -- remove fallback navigate
- `src/components/PSSRModule.tsx` -- delete (unused)
- `supabase/functions/ai-chat/index.ts` -- update navigation references

## Files NOT Changed (intentionally kept)
- `ScheduleWalkdownModal.tsx` and `ScheduleActivitySheet.tsx` -- external shareable links
- `PSSRDashboard.tsx` -- still a valid component, just no longer route-mounted
- All `/pssr/:id/review`, `/pssr/:id/approve`, `/pssr/:id/sof` routes -- unaffected

