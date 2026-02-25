

## Fix: Exclude "Projects" Personnel from PSSR Approver Resolution

### Problem
Martyn Turner ("Engr. Manager - Projects") appears under the "Engr. Manager" approver role in the PSSR template editor. He should never appear in PSSR contexts — only in VCR workflows.

### Root Cause
In `src/components/pssr/wizard/WizardStepApprovers.tsx`, the personnel matching logic has this order:

```
if (!roleMatches) return false;
if (!plantLower) return true;    // ← early return BEFORE project check
// ...
if (pos.includes('project')) return false;  // ← never reached when no plant
```

When `plantName` is empty (template editor), the function returns `true` at line 86 before the "project" exclusion on line 89 is ever evaluated.

### Fix
**File: `src/components/pssr/wizard/WizardStepApprovers.tsx`**

Move the "Projects" exclusion check **above** the `!plantLower` early return. This ensures "Projects" personnel are always excluded from PSSR contexts regardless of whether a plant is selected.

Change the order from:
```
if (!roleMatches) return false;
if (!plantLower) return true;
// ...
if (pos.includes('project')) return false;
```

To:
```
if (!roleMatches) return false;
if (pos.includes('project')) return false;   // ← moved up
if (!plantLower) return true;
```

### Result
- Martyn Turner ("Engr. Manager - Projects") will no longer appear under "Engr. Manager" in PSSR templates or creation wizards
- Only "Engr. Manager - Asset" personnel (Harald Traa, Mohamed Ehab) will be shown
- No impact on VCR workflows (separate code path)

