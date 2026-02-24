

# Two-Step PSSR Lead Review Flow: Edit then Review

## Overview
When the PSSR Lead clicks "Review & Edit PSSR" from their task, implement a two-step flow:
1. Open the `CreatePSSRWizard` in edit mode for making changes
2. When the wizard closes, automatically open the `PSSRDetailOverlay` for final review (including the SoF certificate) before approving

## Why Two Steps?
- The wizard is great for editing but does not display the SoF certificate or the read-only overview layout
- The Lead needs to verify everything looks correct after edits before approving
- Mirrors a natural workflow: Edit -> Review -> Approve

## Changes

### File: `src/components/tasks/TaskDetailSheet.tsx`

1. **Add state for both components**:
   - `wizardOpen` — controls whether the edit wizard is showing
   - `pssrOverlayOpen` — controls whether the review overlay is showing

2. **Button click** ("Review & Edit PSSR"):
   - Opens the `CreatePSSRWizard` in edit mode (`draftPssrId={pssrId}`)

3. **Wizard close handler**:
   - When the wizard closes (saved or dismissed), automatically open the `PSSRDetailOverlay` for final read-only review
   - The overlay shows the full tabbed view: Overview, Progress, Approvals, SoF Certificate

4. **Import both components**:
   - `CreatePSSRWizard` for editing
   - `PSSRDetailOverlay` for review (already imported)

### Flow Diagram

```text
+------------------+     +-----------------------+     +---------------------+
| Task Detail      | --> | CreatePSSRWizard      | --> | PSSRDetailOverlay   |
| Sheet            |     | (Edit Mode)           |     | (Review + Approve)  |
| [Review & Edit]  |     | Scope, Items, Lead... |     | Overview, SoF Cert  |
+------------------+     +-----------------------+     +---------------------+
```

This is a single-file change to `TaskDetailSheet.tsx` -- adding state logic and rendering both components conditionally.

