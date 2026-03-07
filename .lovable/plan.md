

## Plan: Fix Recently Completed section visibility and improve activity icon colors

### Issues identified
1. **Recently Completed not visible**: The hook filters `upcoming_activities` to exclude parent activities but includes parents in `completed_activities`. The issue is that the `sourceActivities` list includes parent rows which may not have `status === 'COMPLETED'` even when children are. Also, the current sorting puts ongoing/upcoming activities first, and if the card doesn't scroll far enough, completed section stays hidden. The `completedOpen` defaults to `false`, so even if data exists, the section header may be off-screen.
2. **Icon colors**: Currently in-progress uses blue (`CircleDot`), upcoming uses grey (`Clock`). User wants: ongoing = amber, upcoming = grey, overdue/delayed = red.

### Changes

#### 1. Sort upcoming activities: ongoing first, then upcoming
In `useProjectORPPlans.ts`, update the upcoming sort to put `IN_PROGRESS` activities before `NOT_STARTED`:
- Primary sort: `IN_PROGRESS` before others
- Secondary sort: by `start_date` ascending

#### 2. Update icon colors in `ActivityRow`
- `in-progress` → amber `CircleDot` icon (`text-amber-500`)
- `upcoming` (not started) → grey `Clock` icon (`text-muted-foreground`) — already correct
- `overdue` → red `AlertTriangle` icon (`text-destructive`) — already correct

#### 3. Ensure completed section is visible
- Include parent activities in the completed filter (they currently get filtered out since they have children)
- Actually the issue is the hook filters `sourceActivities` which includes parents. The completed filter `a.status === 'COMPLETED'` should work. Let me check: the hook doesn't exclude parents from upcoming/completed lists. So the data should be there. The real issue is likely that no activities have `COMPLETED` status in the DB yet, OR the `completedOpen` state defaults to `false` so the section is collapsed — but the header with count badge should still show. From the screenshot, the user drew "Completed" at the bottom suggesting they can't see it at all — likely no completed activities exist in the data, or they're scrolled out of view.
- To improve visibility: always show the "Recently Completed" section header even when collapsed (it already does this via `completedActivities.length > 0` check). If there truly are 3 completed (as shown in progress summary), the issue might be that parent activities are completed but their children aren't individually marked.

Looking more carefully: the `computeWeightedProgress` counts completed from `leafActivities`, but the `completed` list filters from `sourceActivities` (all activities including parents). So if 3 leaf activities are completed, they should appear. The guard `completedActivities.length > 0` should pass. Most likely the section is just collapsed and below the fold.

**Fix**: Default `completedOpen` to `true` so it's visible, and ensure the section always renders even with 0 items (show "No completed activities yet").

### Files to modify
- `src/components/widgets/ORPActivityPlanWidget.tsx` — change icon color for in-progress to amber, sort ongoing before upcoming, default completedOpen to true
- `src/hooks/useProjectORPPlans.ts` — sort upcoming: IN_PROGRESS first, then by start_date

