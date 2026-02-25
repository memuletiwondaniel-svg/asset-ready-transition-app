

## PSSR Item Detail Overlay — 3 Fixes

### Issues identified

1. **Left border truncation on Delivering Party names**: In `src/components/pssr/PSSRItemDetailSheet.tsx` (line 545), the user chip container uses `bg-background border rounded-md px-2.5 py-1.5` inside a `flex flex-wrap gap-2` wrapper (line 541). The parent `px-3 pb-3 pt-0` (line 539) combined with the outer Card's `p-3` (line 507) leaves insufficient space, causing the left border of the first chip to clip.

2. **Delivering Party should use expandable role card pattern**: Currently, the Delivering Party view mode (lines 517-563) shows a single collapsible with the role name that expands to show all user chips directly. This is already close to the pattern but is wrapped in a `Card > CardContent` container. The Approving Parties section (lines 612-675) uses the same expandable role card pattern. Both are consistent — however, the user wants both sections to match the Step 2 wizard pattern more closely. The current implementation already does this, so the fix is primarily about the truncation.

3. **Delete icon inconsistency**: In `src/components/pssr/wizard/PSSRItemDetailSheet.tsx` (line 511), the remove-approver button uses `Minus` icon. The Edit PSSR Template modal (`WizardStepApprovers.tsx`) and the main `PSSRItemDetailSheet.tsx` (line 597) both use `X` icon. The wizard item detail sheet should use `X` for consistency.

### Technical plan

**File: `src/components/pssr/PSSRItemDetailSheet.tsx`**

- **Fix 1 — Truncation**: The delivering party collapsible content at line 539 uses `px-3 pb-3 pt-0`. The inner flex-wrap chips at line 541 render correctly but the `px-3` padding from the collapsible content div plus the Card's `p-3` means space is tight. Add `overflow-visible` or increase left padding slightly. Alternatively, add `pl-1` to the first chip or ensure the flex-wrap container has adequate margin. The simplest fix: change the chips container from `flex flex-wrap gap-2` to include a small left padding offset (`pl-0.5`) to prevent the border from clipping against the rounded-lg parent.

**File: `src/components/pssr/wizard/PSSRItemDetailSheet.tsx`**

- **Fix 3 — Delete icon**: Replace `Minus` import with `X` (line 30), and change `<Minus className="h-3.5 w-3.5" />` to `<X className="h-3.5 w-3.5" />` at line 511. Update the button styling to match the template modal: `text-destructive/70 hover:text-destructive` with `rounded-full hover:bg-destructive/10`.

### Changes summary

| File | Change |
|------|--------|
| `src/components/pssr/PSSRItemDetailSheet.tsx` | Add `pl-0.5` to delivering party chips container to fix left border clipping |
| `src/components/pssr/wizard/PSSRItemDetailSheet.tsx` | Replace `Minus` with `X` icon for role deletion; update button styling to match template modal pattern |

