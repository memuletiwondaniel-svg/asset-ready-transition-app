

## Fix: Stop Showing Resolved Person Names in Template Editor

### Problem
In Step 4 of the Edit PSSR Template modal, each checklist item shows a resolved person's name (e.g., "Donia Abdulhaleem") next to the topic. This is incorrect for the template editor context -- templates define roles, not specific people. The personnel resolution query runs even when no `plantName` is provided, and without location filtering it picks the first matching profile by role.

### Root Cause
In `src/components/pssr/wizard/WizardStepChecklistItems.tsx`, the `resolvedDeliveringParties` query (line 95) is enabled whenever `rawChecklistItems.length > 0` (line 166), regardless of whether `plantName` is provided. When `plantName` is undefined (template editor context), the query still resolves role names to actual people by picking the first profile with a matching role.

### Fix

**File: `src/components/pssr/wizard/WizardStepChecklistItems.tsx`**

1. **Disable the resolution query when no plant context is provided**: Change line 166 from `enabled: rawChecklistItems.length > 0` to `enabled: rawChecklistItems.length > 0 && !!plantName`. This ensures the query only runs during PSSR creation (where a plant/location is selected), not in the template editor.

2. **As a safety net on the display side**: On line 426, change `{resolvedName || responsibleRole}` to just `{responsibleRole}` when `plantName` is not available. This can be done by updating the `resolvedName` assignment on line 394 to: `const resolvedName = plantName && responsibleRole ? resolvedDeliveringParties[responsibleRole] : null;`

### Result
- Template editor (Edit/Add PSSR Reason): Shows only role names (e.g., "Commissioning Manager")
- PSSR Creation Wizard: Continues to resolve and show actual person names based on selected plant/location

