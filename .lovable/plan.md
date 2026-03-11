

## Root Cause

The Gantt chart correctly shows 95% in the DB (`ora_plan_activities.completion_percentage = 95`, `p2a_handover_plans.status = ACTIVE`). However, the Gantt has a **separate cached query** (`p2a-plan-exists`) with `staleTime: 30_000` that fetches the P2A plan status. This query key is **never invalidated** after P2A submission.

The Gantt also has a **progress cap** that forces P2A activities to 86% when `existingP2APlan.status === 'DRAFT'`. Because the cached query still returns `DRAFT` (stale), the cap fires and the Gantt displays 86% instead of 95%.

**Chain of events:**
1. User submits P2A plan → DB correctly updates to `ACTIVE` / 95%
2. `syncWizardProgress` invalidates `user-tasks`, `ora-plan-activities`, etc.
3. But `p2a-plan-exists` is NOT in that list → Gantt still sees cached `DRAFT`
4. Progress cap `(existingP2APlan?.status === 'DRAFT' && raw > 86) ? 86 : raw` fires → shows 86%

## Fix

### 1. Add `p2a-plan-exists` to cache invalidation (P2APlanCreationWizard.tsx)

In `syncWizardProgress` (~line 190), add:
```typescript
queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists'] });
```

### 2. Add same invalidation in `useP2APlanWizard.ts` submitForApproval onSuccess (~line 583)

```typescript
queryClient.invalidateQueries({ queryKey: ['p2a-plan-exists'] });
```

### 3. Also invalidate in deleteDraft onSuccess in the same file

To ensure consistency when deleting drafts too.

**Files to change:**
- `src/components/widgets/p2a-wizard/P2APlanCreationWizard.tsx` — add `p2a-plan-exists` invalidation in `syncWizardProgress`
- `src/hooks/useP2APlanWizard.ts` — add `p2a-plan-exists` invalidation in `submitForApproval.onSuccess` and `deleteDraft.onSuccess`

