

## Problem

When navigating back to Step 1 of the PSSR wizard, the previously selected reason card is not highlighted and the user sees "Please select a PSSR reason" when clicking Next -- even though they already made a selection.

## Root Cause

The `categoryIdRef` backup mechanism (added previously) only restores state inside a `useEffect`, which runs **after** render. This means there's a window where the component renders with an empty `categoryId` and the ref restoration happens too late. Additionally, the ref itself gets reset if the component remounts (e.g., due to parent re-renders from `location.key` changes triggering `setActiveView('list')` in `PSSRSummaryPage`).

## Fix (Two-Pronged Approach)

### 1. Synchronous ref update + render-time fallback (CreatePSSRWizard.tsx)

- **Set the ref synchronously** inside the `onCategoryChange` handler (not just in an effect), so it's always up-to-date immediately.
- **Pass a fallback value** to `WizardStepCategory`: use `wizardState.categoryId || categoryIdRef.current` so even if state was cleared, the ref provides the correct value at render time (no effect delay).
- **Restore state from ref** inside `handleBack` and `handleStepClick` when navigating to step 1 -- if `wizardState.categoryId` is empty but the ref has a value, restore state synchronously before the step renders.

### 2. Guard against accidental state loss (CreatePSSRWizard.tsx)

- In `handleBack` and `handleStepClick`, before setting `currentStep`, check if `categoryId` is empty but the ref has a value, and restore it in the same state update batch.

## Technical Details

**File: `src/components/pssr/CreatePSSRWizard.tsx`**

1. Update `onCategoryChange` handler (line 749) to also set the ref synchronously:
   ```tsx
   onCategoryChange={(id) => {
     categoryIdRef.current = id;
     setWizardState(prev => ({ 
       ...prev, 
       categoryId: id,
       reasonId: id === '__other__' ? '' : id,
       selectedAtiScopeIds: [],
       configLoaded: false,
     }));
   }}
   ```

2. Update line 748 to use ref as fallback:
   ```tsx
   categoryId={wizardState.categoryId || categoryIdRef.current}
   ```

3. Update `handleBack` (line 344) to restore categoryId if needed:
   ```tsx
   const handleBack = () => {
     if (!wizardState.categoryId && categoryIdRef.current) {
       setWizardState(prev => ({
         ...prev,
         categoryId: categoryIdRef.current,
         reasonId: categoryIdRef.current === '__other__' ? '' : categoryIdRef.current,
       }));
     }
     setCurrentStep(prev => Math.max(prev - 1, 1));
   };
   ```

4. Update `handleStepClick` (line 325) similarly to restore categoryId when navigating to step 1.

5. Update `validateStep` for step 1 (line 303) to also check the ref:
   ```tsx
   case 1:
     if (!wizardState.categoryId && !categoryIdRef.current) {
       if (!silent) toast.error('Please select a PSSR reason');
       return false;
     }
     // Restore from ref if state is empty
     if (!wizardState.categoryId && categoryIdRef.current) {
       setWizardState(prev => ({
         ...prev,
         categoryId: categoryIdRef.current,
         reasonId: categoryIdRef.current === '__other__' ? '' : categoryIdRef.current,
       }));
     }
     return true;
   ```

6. Remove debug `console.log` statements added in previous attempts.

