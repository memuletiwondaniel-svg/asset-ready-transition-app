

## Problem

The PSSR Lead section only shows 5 out of 9 Ops Team Leads. The root cause is a single line of code:

```tsx
// Line 134 in WizardStepApprovers.tsx
.slice(0, 5)   // ← Hard-caps results to 5
```

All 9 users have "Ops Team Lead" in their position, so the filter matches correctly. The `.slice(0, 5)` silently drops the remaining 4 (Haydar Khalid, Khalid Isam, Mustafa Ali, Muwafaq Al-Maleki).

## Fix

**File: `src/components/pssr/wizard/WizardStepApprovers.tsx`**

1. **Remove `.slice(0, 5)`** from line 134 — show all matching profiles, not an arbitrary subset.

That's the only change needed. One line removal.

## Secondary observation (no action needed now)

4 of the 9 Ops Team Leads have no `role` UUID assigned in the database (their `role` column is `null`). The current matching logic works because it falls back to position-string matching. However, assigning the correct role UUID (`761eb276-fdd5-4c5d-8d72-a75e00b0fbf6`) to those 4 users (Ammar, Hussein, Khalid Isam, Sajad) would improve data consistency.

