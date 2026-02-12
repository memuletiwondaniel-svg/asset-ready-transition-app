

## Fix: Remove excessive whitespace in Roles tab

### Problem
The parent layout containers (`div` wrappers and `Tabs` component) use `flex-1` to stretch and fill the full viewport height. This is needed for the Users tab (which has a scrollable table), but it causes the Roles and Locations tabs to have a large empty gap between the tab bar and their content. The content renders at the top of a flex container that has been stretched unnecessarily.

### Solution
Remove the flex-grow behavior from the containers that don't need it for the Roles/Locations tabs. Specifically, in `EnhancedUserManagement.tsx`:

1. **Outer wrapper** (line 812): Change `flex-1 flex flex-col overflow-auto min-h-0` to just `overflow-auto` -- this stops the container from stretching to fill the viewport.
2. **Inner wrapper** (line 813): Change `flex-1 flex flex-col min-h-0` to remove the flex-grow behavior.
3. **Tabs component** (line 814): Remove `flex flex-col flex-1 min-h-0` so the Tabs component flows naturally.

The Users tab content already has its own `flex-1` and overflow handling which will continue to work within a naturally-sized parent, since the outer wrapper has `overflow-auto`.

### Files to modify
- `src/components/user-management/EnhancedUserManagement.tsx` (lines 812-814)

