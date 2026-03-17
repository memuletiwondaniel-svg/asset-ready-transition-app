

## Problem

The VCR wizard sidebar header is too cramped at `w-56` (224px). The gradient icon, VCR badge, and title are all on one horizontal line, causing the VCR name to truncate aggressively ("Compresso..."). The layout needs to breathe.

## Fix

**In `VCRExecutionPlanWizard.tsx` — restructure `headerContent`:**

1. Stack the layout vertically: icon + badge on one line, title below, subtitle below that
2. Change the title from `truncate` to `line-clamp-2` so it wraps up to 2 lines instead of cutting off
3. Move the VCR badge next to the icon (or on its own row) so the title gets the full width

**Result layout:**
```text
[Icon] VCR-04
Compressor Station     ← full name, wraps if needed
Develop VCR Plan       ← subtitle
```

**Files to modify:**
- `src/components/widgets/vcr-wizard/VCRExecutionPlanWizard.tsx` — restructure `headerContent` block (lines 160-185)

No changes needed to `WizardShell.tsx` — the sidebar width and header slot are fine; the issue is purely how the VCR wizard composes its header content.

