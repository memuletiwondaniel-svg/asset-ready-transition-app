

## Problem
PSSR and SoF Approver roles show "0 roles" on Step 4 of the PSSR creation wizard. The configuration data exists in the database (verified: TAR has 3 PSSR approver roles and 3 SoF approver roles), but it is not reaching the UI.

## Root Cause
Two issues introduced by recent changes:

1. **State update during render (anti-pattern)**: `validateStep(1, true)` is called during render via `isStepComplete()` in the breadcrumb loop (lines 709, 718). When `categoryId` is empty, it calls `setWizardState` to restore from the ref. This state update during render can cause React to restart the render cycle, creating race conditions with the config loading effect that populates the approver role IDs.

2. **Config loading only triggers at step 3**: The config loading effect (line 251) only fires when `currentStep === 3`. If the render-phase state update interferes with the effect's timing, the approver IDs never get populated, and there is no fallback mechanism when reaching step 4.

## Fix

### 1. Remove `setWizardState` from `validateStep` (stop render-phase state updates)

Change the step 1 validation to use the ref for checking without triggering state updates:

**File: `src/components/pssr/CreatePSSRWizard.tsx`** (lines 291-306)
```tsx
case 1: {
  const effectiveCategoryId = wizardState.categoryId || categoryIdRef.current;
  if (!effectiveCategoryId) {
    if (!silent) toast.error('Please select a PSSR reason');
    return false;
  }
  return true;
}
```
No more `setWizardState` call during render -- just read the ref as a fallback for validation.

### 2. Ensure `reasonId` is always in sync with `categoryIdRef`

Add a `reasonId` ref alongside `categoryIdRef`, or derive it from the category ref. Update `handleBack` and `handleStepClick` to also restore `reasonId` when restoring `categoryId`:

**File: `src/components/pssr/CreatePSSRWizard.tsx`**
- In `handleBack` and `handleStepClick`, when restoring from ref, also ensure `reasonId` is populated
- In `handleNext`, when moving FROM step 2 TO step 3, ensure `reasonId` is set from the ref if missing:

```tsx
const handleNext = () => {
  if (!validateStep(currentStep)) return;
  const nextStep = Math.min(currentStep + 1, STEPS.length);
  // Ensure reasonId is set before entering step 3
  if (nextStep === 3 && !wizardState.reasonId && categoryIdRef.current) {
    setWizardState(prev => ({
      ...prev,
      categoryId: categoryIdRef.current,
      reasonId: categoryIdRef.current === '__other__' ? '' : categoryIdRef.current,
    }));
  }
  setVisitedSteps(prev => new Set([...prev, nextStep]));
  setCurrentStep(nextStep);
};
```

### 3. Add fallback config loading at step 4

Expand the config loading effect condition to also trigger at step 4 if config was never loaded:

**File: `src/components/pssr/CreatePSSRWizard.tsx`** (line 251)
```tsx
if ((currentStep === 3 || currentStep === 4) && wizardState.reasonId && !wizardState.configLoaded && !wizardState.configLoading) {
```

This ensures that even if step 3's config load was missed due to timing, step 4 will pick it up.

### 4. Update effect dependencies

Update the dependency array of the config loading effect (line 284) to remain consistent with the expanded condition.

## Summary of Changes

All changes are in a single file: **`src/components/pssr/CreatePSSRWizard.tsx`**

| Change | Lines | Description |
|--------|-------|-------------|
| Fix validateStep | 291-306 | Remove `setWizardState` call; use ref as read-only fallback |
| Fix handleNext | 344-349 | Ensure `reasonId` is restored before entering step 3 |
| Expand config loading | 251 | Also trigger at step 4 as fallback |
| Update effect deps | 284 | Keep dependency array consistent |

