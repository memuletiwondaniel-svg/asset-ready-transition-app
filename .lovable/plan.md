

## Problem

The VCR badge (`VCR-04`) uses `text-[10px]` which is too small, and the `vcrColor` utility produces a light pastel background with a colored text (e.g., greenish hue from the hash) that looks out of place in the sidebar header context.

## Fix

In `VCRExecutionPlanWizard.tsx`, replace the dynamically-colored `Badge` with the `ProjectIdBadge` component (already exists in the codebase) which generates a solid gradient background with white text — matching the bold, branded look used elsewhere:

1. **Swap component**: Replace `<Badge>` with `<ProjectIdBadge size="sm">` for the VCR code display
2. **Pass `projectId={vcr.vcr_code}`** so the gradient is derived from the VCR code
3. **Bump size**: Use `size="default"` instead of `"sm"` to make it more readable (gives `text-xs` instead of `text-[10px]`)
4. **Remove** the `vcrColor` import and `style` prop — the `ProjectIdBadge` handles its own coloring with a solid gradient and white text

**Result**: A punchy, readable badge like the ones on the Projects homepage — solid color gradient background, white text, appropriately sized.

**File**: `src/components/widgets/vcr-wizard/VCRExecutionPlanWizard.tsx` — lines 169-179

